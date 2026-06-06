import asyncio
import os
import pathlib
import re
import shutil
import subprocess
import uuid
from datetime import datetime
from typing import AsyncIterator, Literal, Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel


WORKSPACES_ROOT = os.environ.get("WORKSPACES_ROOT", "/workspaces")
RUNNER_URL = os.environ.get("RUNNER_URL", "http://runner:8081")
RUNNER_CODEX_URL = os.environ.get("RUNNER_CODEX_URL", "http://runner:8081")
RUNNER_CLAUDE_URL = os.environ.get("RUNNER_CLAUDE_URL", "http://claude-runner:8082")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


RunnerType = Literal["codex", "claude"]
SourceType = Literal["github", "local"]


class ImportWorkspaceRequest(BaseModel):
    source_type: SourceType
    source_uri: str
    display_name: Optional[str] = None


class WorkspaceResponse(BaseModel):
    workspace_id: str
    display_name: str
    source_type: SourceType
    source_uri: str
    local_path: str
    created_at: str


class WorkspaceListResponse(BaseModel):
    items: list[WorkspaceResponse]


class CreateSessionRequest(BaseModel):
    repo_url: Optional[str] = None
    workspace_id: Optional[str] = None
    runner_type: RunnerType = "codex"


class SessionResponse(BaseModel):
    session_id: str
    workspace_id: str
    runner_type: RunnerType
    thread_id: str
    created_at: str


class SessionListResponse(BaseModel):
    items: list[SessionResponse]


class CreateSessionResponse(BaseModel):
    session_id: str
    repo_path: str
    thread_id: str
    runner_type: RunnerType
    workspace_id: Optional[str] = None


class PromptRequest(BaseModel):
    prompt: str


class PromptResponse(BaseModel):
    run_id: str


_workspaces: dict[str, dict] = {}
_sessions: dict[str, dict] = {}
_runs: dict[str, str] = {}


def _get_runner_url(runner_type: RunnerType) -> str:
    if runner_type == "claude":
        return RUNNER_CLAUDE_URL
    return RUNNER_CODEX_URL


def _workspace_dir_for_session(session_id: str) -> str:
    root = pathlib.Path(WORKSPACES_ROOT)
    root.mkdir(parents=True, exist_ok=True)
    return str(root / session_id / "repo")


def _ensure_under_workspaces_root(path_str: str) -> str:
    root = pathlib.Path(WORKSPACES_ROOT).resolve()
    path = pathlib.Path(path_str).resolve()
    if not str(path).startswith(str(root)):
        raise HTTPException(status_code=400, detail="invalid workspace path")
    return str(path)


def _derive_display_name(source_type: str, source_uri: str) -> str:
    if source_type == "github":
        match = re.search(r"github\.com[/:]([^/]+)/([^/.]+)", source_uri)
        if match:
            return f"{match.group(1)}/{match.group(2)}"
        return source_uri.split("/")[-1].replace(".git", "")
    else:
        return pathlib.Path(source_uri).name


def _find_workspace_by_source(source_type: str, source_uri: str) -> Optional[dict]:
    for ws in _workspaces.values():
        if ws["source_type"] == source_type and ws["source_uri"] == source_uri:
            return ws
    return None


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/workspaces/import", response_model=WorkspaceResponse)
async def import_workspace(req: ImportWorkspaceRequest) -> WorkspaceResponse:
    existing = _find_workspace_by_source(req.source_type, req.source_uri)
    if existing:
        return WorkspaceResponse(
            workspace_id=existing["id"],
            display_name=existing["display_name"],
            source_type=existing["source_type"],
            source_uri=existing["source_uri"],
            local_path=existing["local_path"],
            created_at=existing["created_at"]
        )

    workspace_id = str(uuid.uuid4())
    display_name = req.display_name or _derive_display_name(req.source_type, req.source_uri)
    local_path = str(pathlib.Path(WORKSPACES_ROOT) / workspace_id / "repo")
    local_path = _ensure_under_workspaces_root(local_path)

    parent = pathlib.Path(local_path).parent
    parent.mkdir(parents=True, exist_ok=True)

    if req.source_type == "github":
        result = subprocess.run(
            ["git", "clone", "--depth", "1", req.source_uri, local_path],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise HTTPException(status_code=400, detail=f"git clone failed: {result.stderr.strip()}")
    elif req.source_type == "local":
        source_path = pathlib.Path(req.source_uri)
        if not source_path.exists():
            raise HTTPException(status_code=400, detail=f"Source path does not exist: {req.source_uri}")
        if source_path.is_dir():
            shutil.copytree(str(source_path), local_path)
        else:
            raise HTTPException(status_code=400, detail="Source path must be a directory")

    created_at = datetime.utcnow().isoformat() + "Z"
    workspace = {
        "id": workspace_id,
        "display_name": display_name,
        "source_type": req.source_type,
        "source_uri": req.source_uri,
        "local_path": local_path,
        "created_at": created_at
    }
    _workspaces[workspace_id] = workspace

    return WorkspaceResponse(
        workspace_id=workspace_id,
        display_name=display_name,
        source_type=req.source_type,
        source_uri=req.source_uri,
        local_path=local_path,
        created_at=created_at
    )


@app.get("/api/workspaces", response_model=WorkspaceListResponse)
async def list_workspaces() -> WorkspaceListResponse:
    items = [
        WorkspaceResponse(
            workspace_id=ws["id"],
            display_name=ws["display_name"],
            source_type=ws["source_type"],
            source_uri=ws["source_uri"],
            local_path=ws["local_path"],
            created_at=ws["created_at"]
        )
        for ws in _workspaces.values()
    ]
    return WorkspaceListResponse(items=items)


@app.get("/api/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(workspace_id: str) -> WorkspaceResponse:
    ws = _workspaces.get(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return WorkspaceResponse(
        workspace_id=ws["id"],
        display_name=ws["display_name"],
        source_type=ws["source_type"],
        source_uri=ws["source_uri"],
        local_path=ws["local_path"],
        created_at=ws["created_at"]
    )


@app.get("/api/workspaces/{workspace_id}/sessions", response_model=SessionListResponse)
async def list_workspace_sessions(workspace_id: str) -> SessionListResponse:
    if workspace_id not in _workspaces:
        raise HTTPException(status_code=404, detail="Workspace not found")
    items = [
        SessionResponse(
            session_id=s["id"],
            workspace_id=s["workspace_id"],
            runner_type=s["runner_type"],
            thread_id=s["thread_id"],
            created_at=s["created_at"]
        )
        for s in _sessions.values()
        if s.get("workspace_id") == workspace_id
    ]
    items.sort(key=lambda x: x.created_at, reverse=True)
    return SessionListResponse(items=items)


@app.post("/api/sessions", response_model=CreateSessionResponse)
async def create_session(req: CreateSessionRequest) -> CreateSessionResponse:
    session_id = str(uuid.uuid4())
    workspace_id = None
    
    if req.workspace_id:
        workspace = _workspaces.get(req.workspace_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        workspace_id = req.workspace_id
        repo_path = workspace["local_path"]
    elif req.repo_url:
        repo_path = _workspace_dir_for_session(session_id)
        repo_path = _ensure_under_workspaces_root(repo_path)

        parent = pathlib.Path(repo_path).parent
        parent.mkdir(parents=True, exist_ok=True)

        result = subprocess.run(
            ["git", "clone", "--depth", "1", req.repo_url, repo_path],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise HTTPException(status_code=400, detail=f"git clone failed: {result.stderr.strip()}")
    else:
        raise HTTPException(status_code=400, detail="Either workspace_id or repo_url is required")

    runner_url = _get_runner_url(req.runner_type)

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{runner_url}/threads",
            json={"workingDirectory": repo_path, "skipGitRepoCheck": False},
        )
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"runner error: {r.text}")
        data = r.json()

    thread_id = data.get("threadId")
    if not thread_id:
        raise HTTPException(status_code=502, detail="runner did not return threadId")

    created_at = datetime.utcnow().isoformat() + "Z"
    _sessions[session_id] = {
        "id": session_id,
        "repo_path": repo_path,
        "thread_id": thread_id,
        "runner_type": req.runner_type,
        "workspace_id": workspace_id,
        "created_at": created_at
    }
    return CreateSessionResponse(
        session_id=session_id,
        repo_path=repo_path,
        thread_id=thread_id,
        runner_type=req.runner_type,
        workspace_id=workspace_id
    )


@app.get("/api/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str) -> SessionResponse:
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse(
        session_id=session["id"],
        workspace_id=session.get("workspace_id", ""),
        runner_type=session["runner_type"],
        thread_id=session["thread_id"],
        created_at=session.get("created_at", "")
    )


@app.post("/api/sessions/{session_id}/prompt", response_model=PromptResponse)
async def prompt(session_id: str, req: PromptRequest) -> PromptResponse:
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="session not found")

    runner_type = session.get("runner_type", "codex")
    runner_url = _get_runner_url(runner_type)

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{runner_url}/runs",
            json={"threadId": session["thread_id"], "prompt": req.prompt},
        )
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"runner error: {r.text}")
        data = r.json()

    run_id = data.get("runId")
    if not run_id:
        raise HTTPException(status_code=502, detail="runner did not return runId")

    _runs[run_id] = runner_type

    return PromptResponse(run_id=run_id)


@app.get("/api/runs/{run_id}/events")
async def run_events(run_id: str) -> StreamingResponse:
    runner_type = _runs.get(run_id, "codex")
    runner_url = _get_runner_url(runner_type)

    async def stream() -> AsyncIterator[bytes]:
        yield b": connected\n\n"
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "GET",
                f"{runner_url}/runs/{run_id}/events",
                headers={"Accept": "text/event-stream"},
            ) as r:
                if r.status_code >= 400:
                    yield f"data: {{\"type\":\"error\",\"message\":{r.text!r}}}\n\n".encode("utf-8")
                    return
                async for chunk in r.aiter_bytes():
                    yield chunk

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
