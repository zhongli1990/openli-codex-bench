from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI(title="Evaluation Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


class EvaluateRequest(BaseModel):
    input: dict
    output: dict
    criteria: list[str] = ["accuracy", "safety", "completeness"]
    context: Optional[dict] = None


class EvaluateResponse(BaseModel):
    scores: dict[str, float]
    overall: float
    notes: str


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(req: EvaluateRequest) -> EvaluateResponse:
    scores = {}
    for criterion in req.criteria:
        scores[criterion] = 0.8
    
    overall = sum(scores.values()) / len(scores) if scores else 0.0
    
    return EvaluateResponse(
        scores=scores,
        overall=overall,
        notes="Placeholder evaluation. LangSmith integration pending."
    )
