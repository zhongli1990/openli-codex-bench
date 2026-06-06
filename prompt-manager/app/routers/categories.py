from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import CurrentUser, get_current_user
from ..database import get_db
from ..models import PromptTemplate, Skill
from ..schemas import CategoryResponse

router = APIRouter(prefix="/categories", tags=["categories"])

# Default categories with descriptions
DEFAULT_CATEGORIES = [
    "sales",
    "project-management",
    "product",
    "architecture",
    "development",
    "qa",
    "support",
    "compliance",
    "general",
]


@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all categories with template and skill counts."""
    # Template counts by category
    tpl_q = (
        select(PromptTemplate.category, func.count(PromptTemplate.id))
        .where(PromptTemplate.is_latest == True)
        .group_by(PromptTemplate.category)
    )
    tpl_result = await db.execute(tpl_q)
    tpl_counts = dict(tpl_result.all())

    # Skill counts by category
    skill_q = (
        select(Skill.category, func.count(Skill.id))
        .where(Skill.is_latest == True)
        .group_by(Skill.category)
    )
    skill_result = await db.execute(skill_q)
    skill_counts = dict(skill_result.all())

    # Merge all categories
    all_cats = set(DEFAULT_CATEGORIES) | set(tpl_counts.keys()) | set(skill_counts.keys())

    categories = []
    for cat in sorted(all_cats):
        categories.append(CategoryResponse(
            name=cat,
            template_count=tpl_counts.get(cat, 0),
            skill_count=skill_counts.get(cat, 0),
        ))

    return categories
