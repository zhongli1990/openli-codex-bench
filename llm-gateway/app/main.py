import os
from datetime import datetime
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI(title="LLM Gateway Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    provider: Literal["openai", "anthropic"]
    model: str
    messages: list[Message]
    metadata: Optional[dict] = None


class UsageInfo(BaseModel):
    input_tokens: int
    output_tokens: int


class ChatResponse(BaseModel):
    text: str
    usage: UsageInfo


_usage_log: list[dict] = []


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    _usage_log.append({
        "provider": req.provider,
        "model": req.model,
        "message_count": len(req.messages),
        "metadata": req.metadata,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })
    
    return ChatResponse(
        text=f"[Placeholder response from {req.provider}/{req.model}] This is a stub. Real LLM integration pending.",
        usage=UsageInfo(input_tokens=100, output_tokens=50)
    )


@app.get("/usage")
async def get_usage() -> dict:
    return {"entries": _usage_log[-100:], "total_count": len(_usage_log)}
