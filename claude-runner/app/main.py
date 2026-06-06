import asyncio
import os
import pathlib
import uuid
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .config import WORKSPACES_ROOT, PORT
from .agent import run_agent_loop
from .events import make_event, format_sse
from .api.skills_router import router as skills_router


app = FastAPI()
app.include_router(skills_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


class CreateThreadRequest(BaseModel):
    workingDirectory: str
    skipGitRepoCheck: bool = False


class CreateThreadResponse(BaseModel):
    threadId: str


class CreateRunRequest(BaseModel):
    threadId: str
    prompt: str


class CreateRunResponse(BaseModel):
    runId: str


class ThreadRecord:
    def __init__(self, thread_id: str, working_directory: str):
        self.thread_id = thread_id
        self.working_directory = working_directory


class RunRecord:
    def __init__(self, run_id: str, thread_id: str, prompt: str):
        self.run_id = run_id
        self.thread_id = thread_id
        self.prompt = prompt
        self.buffer: list[str] = []
        self.subscribers: set[asyncio.Queue[str | None]] = set()
        self.status: str = "running"


threads: dict[str, ThreadRecord] = {}
runs: dict[str, RunRecord] = {}


def must_resolve_workspace(path_str: str) -> str:
    """Ensure the path is under WORKSPACES_ROOT."""
    root = pathlib.Path(WORKSPACES_ROOT).resolve()
    path = pathlib.Path(path_str).resolve()
    if not str(path).startswith(str(root)):
        raise HTTPException(status_code=400, detail="workingDirectory must be under WORKSPACES_ROOT")
    return str(path)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/threads", response_model=CreateThreadResponse)
async def create_thread(req: CreateThreadRequest) -> CreateThreadResponse:
    working_directory = must_resolve_workspace(req.workingDirectory)
    
    if not os.path.isdir(working_directory):
        raise HTTPException(status_code=400, detail=f"Directory does not exist: {working_directory}")
    
    thread_id = str(uuid.uuid4())
    threads[thread_id] = ThreadRecord(thread_id, working_directory)
    
    return CreateThreadResponse(threadId=thread_id)


@app.post("/runs", response_model=CreateRunResponse)
async def create_run(req: CreateRunRequest) -> CreateRunResponse:
    thread_record = threads.get(req.threadId)
    if not thread_record:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")
    
    run_id = str(uuid.uuid4())
    run_record = RunRecord(run_id, req.threadId, req.prompt)
    runs[run_id] = run_record
    
    asyncio.create_task(_execute_run(run_record, thread_record))
    
    return CreateRunResponse(runId=run_id)


async def _execute_run(run_record: RunRecord, thread_record: ThreadRecord) -> None:
    """Execute the agent loop and publish events."""
    try:
        async for event_str in run_agent_loop(
            thread_record.thread_id,
            run_record.run_id,
            run_record.prompt,
            thread_record.working_directory
        ):
            run_record.buffer.append(event_str)
            for queue in run_record.subscribers:
                await queue.put(event_str)
        
        run_record.status = "completed"
    except Exception as e:
        error_event = format_sse(make_event(run_record.run_id, "error", {"message": str(e)}, len(run_record.buffer)))
        run_record.buffer.append(error_event)
        for queue in run_record.subscribers:
            await queue.put(error_event)
        run_record.status = "error"
    finally:
        for queue in run_record.subscribers:
            await queue.put(None)
        run_record.subscribers.clear()


@app.get("/runs/{run_id}/events")
async def run_events(run_id: str, request: Request) -> StreamingResponse:
    run_record = runs.get(run_id)
    if not run_record:
        raise HTTPException(status_code=404, detail="Run not found")
    
    async def stream():
        yield ": connected\n\n"
        
        for event_str in run_record.buffer:
            yield event_str
        
        if run_record.status != "running":
            yield format_sse(make_event(
                run_id,
                "stream.closed",
                {"status": run_record.status},
                len(run_record.buffer)
            ))
            return
        
        queue: asyncio.Queue[str | None] = asyncio.Queue()
        run_record.subscribers.add(queue)
        
        try:
            while True:
                if await request.is_disconnected():
                    break
                
                try:
                    event_str = await asyncio.wait_for(queue.get(), timeout=1.0)
                    if event_str is None:
                        break
                    yield event_str
                except asyncio.TimeoutError:
                    continue
        finally:
            run_record.subscribers.discard(queue)
    
    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
