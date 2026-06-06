import uuid
from datetime import datetime
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI(title="Memory Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


class CreateMemoryRequest(BaseModel):
    scope: Literal["session", "workspace"]
    scope_id: str
    kind: Literal["episodic", "long_term"] = "episodic"
    text: str
    tags: list[str] = []


class MemoryResponse(BaseModel):
    id: str
    scope: str
    scope_id: str
    kind: str
    text: str
    tags: list[str]
    created_at: str


class QueryMemoryRequest(BaseModel):
    scope: Literal["session", "workspace"]
    scope_id: str
    query: str
    top_k: int = 10


class MemoryQueryResponse(BaseModel):
    items: list[dict]


_memories: dict[str, dict] = {}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/memories", response_model=MemoryResponse)
async def create_memory(req: CreateMemoryRequest) -> MemoryResponse:
    memory_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat() + "Z"
    
    memory = {
        "id": memory_id,
        "scope": req.scope,
        "scope_id": req.scope_id,
        "kind": req.kind,
        "text": req.text,
        "tags": req.tags,
        "created_at": created_at
    }
    _memories[memory_id] = memory
    
    return MemoryResponse(**memory)


@app.post("/memories/query", response_model=MemoryQueryResponse)
async def query_memories(req: QueryMemoryRequest) -> MemoryQueryResponse:
    matching = [
        m for m in _memories.values()
        if m["scope"] == req.scope and m["scope_id"] == req.scope_id
    ]
    
    results = []
    for m in matching[:req.top_k]:
        score = 0.5 if req.query.lower() in m["text"].lower() else 0.1
        results.append({
            "id": m["id"],
            "text": m["text"],
            "score": score,
            "tags": m["tags"]
        })
    
    results.sort(key=lambda x: x["score"], reverse=True)
    
    return MemoryQueryResponse(items=results)
