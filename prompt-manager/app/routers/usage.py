from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import CurrentUser, get_current_user
from ..database import get_db
from ..repositories.usage_repo import UsageRepository
from ..schemas import LogUsageRequest, UsageStatsResponse

router = APIRouter(prefix="/usage", tags=["usage"])


@router.post("/log")
async def log_usage(
    req: LogUsageRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = UsageRepository(db)
    entry = await repo.log_usage(
        user_id=user.user_id,
        tenant_id=user.tenant_id,
        template_id=req.template_id,
        skill_id=req.skill_id,
        session_id=req.session_id,
        rendered_prompt=req.rendered_prompt,
        variables_used=req.variables_used,
        model_used=req.model_used,
    )
    return {"id": str(entry.id), "status": "logged"}


@router.get("/stats", response_model=UsageStatsResponse)
async def get_usage_stats(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = UsageRepository(db)
    stats = await repo.get_stats(tenant_id=user.tenant_id)
    return UsageStatsResponse(**stats)
