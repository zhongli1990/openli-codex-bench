import os
import pathlib
import re
import yaml
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import CurrentUser, get_current_user, require_admin
from ..database import get_db
from ..models import Skill
from ..repositories.skill_repo import SkillRepository
from ..schemas import (
    CreateSkillRequest,
    UpdateSkillRequest,
    SkillResponse,
    SkillListResponse,
)

router = APIRouter(prefix="/skills", tags=["skills"])

GLOBAL_SKILLS_PATH = os.environ.get("GLOBAL_SKILLS_PATH", "/app/skills")


def _to_response(s: Skill) -> SkillResponse:
    return SkillResponse(
        id=str(s.id),
        tenant_id=str(s.tenant_id) if s.tenant_id else None,
        owner_id=str(s.owner_id),
        name=s.name,
        slug=s.slug,
        description=s.description,
        category=s.category,
        subcategory=s.subcategory,
        tags=s.tags or [],
        scope=s.scope,
        skill_content=s.skill_content,
        allowed_tools=s.allowed_tools,
        user_invocable=s.user_invocable,
        supporting_files=s.supporting_files or [],
        compatible_models=s.compatible_models or [],
        tested_models=s.tested_models or [],
        recommended_model=s.recommended_model,
        version=s.version,
        is_latest=s.is_latest,
        parent_id=str(s.parent_id) if s.parent_id else None,
        change_summary=s.change_summary,
        status=s.status,
        visibility=s.visibility,
        enabled=s.enabled,
        workspace_id=str(s.workspace_id) if s.workspace_id else None,
        created_at=s.created_at.isoformat() if s.created_at else "",
        updated_at=s.updated_at.isoformat() if s.updated_at else "",
        published_at=s.published_at.isoformat() if s.published_at else None,
    )


@router.get("", response_model=SkillListResponse)
async def list_skills(
    category: Optional[str] = Query(None),
    scope: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SkillRepository(db)
    skills, total = await repo.list_skills(
        user_id=user.user_id,
        tenant_id=user.tenant_id,
        is_admin=user.is_admin,
        category=category,
        scope=scope,
        status=status,
        search=search,
        offset=offset,
        limit=limit,
    )
    items = [_to_response(s) for s in skills]
    return SkillListResponse(items=items, total=total)


@router.get("/{skill_id}", response_model=SkillResponse)
async def get_skill(
    skill_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SkillRepository(db)
    skill = await repo.get_by_id(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return _to_response(skill)


@router.get("/slug/{slug}", response_model=SkillResponse)
async def get_skill_by_slug(
    slug: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SkillRepository(db)
    skill = await repo.get_latest_by_slug(slug, tenant_id=user.tenant_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return _to_response(skill)


@router.get("/{skill_id}/versions", response_model=SkillListResponse)
async def get_skill_versions(
    skill_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SkillRepository(db)
    skill = await repo.get_by_id(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    versions = await repo.get_versions(skill.slug, tenant_id=str(skill.tenant_id) if skill.tenant_id else None)
    items = [_to_response(v) for v in versions]
    return SkillListResponse(items=items, total=len(items))


@router.post("", response_model=SkillResponse, status_code=201)
async def create_skill(
    req: CreateSkillRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SkillRepository(db)
    data = req.model_dump()
    if "supporting_files" in data:
        data["supporting_files"] = [
            sf.model_dump() if hasattr(sf, "model_dump") else sf
            for sf in data.get("supporting_files", [])
        ]
    skill = await repo.create(data, owner_id=user.user_id, tenant_id=user.tenant_id)
    return _to_response(skill)


@router.put("/{skill_id}", response_model=SkillResponse)
async def update_skill(
    skill_id: str,
    req: UpdateSkillRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SkillRepository(db)
    existing = await repo.get_by_id(skill_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Skill not found")

    if str(existing.owner_id) != user.user_id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to edit this skill")

    data = req.model_dump(exclude_unset=True)
    if "supporting_files" in data and data["supporting_files"] is not None:
        data["supporting_files"] = [
            sf.model_dump() if hasattr(sf, "model_dump") else sf
            for sf in data["supporting_files"]
        ]
    skill = await repo.update(skill_id, data, user_id=user.user_id)
    return _to_response(skill)


@router.delete("/{skill_id}")
async def delete_skill(
    skill_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SkillRepository(db)
    existing = await repo.get_by_id(skill_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Skill not found")

    if str(existing.owner_id) != user.user_id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this skill")

    await repo.delete(skill_id)
    return {"status": "archived", "id": skill_id}


@router.post("/{skill_id}/publish", response_model=SkillResponse)
async def publish_skill(
    skill_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SkillRepository(db)
    existing = await repo.get_by_id(skill_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Skill not found")

    if str(existing.owner_id) != user.user_id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to publish this skill")

    skill = await repo.publish(skill_id)
    return _to_response(skill)


@router.post("/{skill_id}/toggle", response_model=SkillResponse)
async def toggle_skill(
    skill_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SkillRepository(db)
    existing = await repo.get_by_id(skill_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Skill not found")

    if str(existing.owner_id) != user.user_id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to toggle this skill")

    skill = await repo.toggle(skill_id)
    return _to_response(skill)


@router.post("/{skill_id}/clone", response_model=SkillResponse, status_code=201)
async def clone_skill(
    skill_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SkillRepository(db)
    clone = await repo.clone(skill_id, owner_id=user.user_id, tenant_id=user.tenant_id)
    return _to_response(clone)


def _parse_skill_frontmatter(content: str) -> dict:
    """Parse YAML frontmatter from SKILL.md content."""
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if not match:
        return {}
    try:
        return yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError:
        return {}


def _infer_category(skill_name: str, parent_dir: str) -> str:
    """Infer category from skill name or parent directory."""
    category_map = {
        "sow": "sales", "proposal": "sales", "bid": "sales", "roi": "sales",
        "charter": "project-management", "status": "project-management", "risk": "project-management",
        "prd": "product", "roadmap": "product", "sprint": "product",
        "architecture": "architecture", "requirements": "architecture", "api-design": "architecture",
        "code": "development", "implementation": "development", "review": "development",
        "test": "qa", "e2e": "qa", "automation": "qa",
        "guide": "support", "troubleshoot": "support", "runbook": "support",
        "compliance": "compliance", "security": "compliance", "healthcare": "compliance",
    }
    name_lower = skill_name.lower()
    for keyword, category in category_map.items():
        if keyword in name_lower:
            return category
    return "general"


@router.post("/sync-from-files")
async def sync_skills_from_files(
    user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Import file-based skills from GLOBAL_SKILLS_PATH into the database.
    Only available to Super Admin.
    """
    skills_path = pathlib.Path(GLOBAL_SKILLS_PATH)
    if not skills_path.exists():
        return {"imported": 0, "message": f"Skills path not found: {GLOBAL_SKILLS_PATH}"}

    repo = SkillRepository(db)
    imported = 0
    skipped = 0
    errors = []

    for skill_dir in sorted(skills_path.iterdir()):
        if not skill_dir.is_dir():
            continue

        skill_md = skill_dir / "SKILL.md"
        if not skill_md.exists():
            continue

        skill_name = skill_dir.name
        content = skill_md.read_text(encoding="utf-8")
        frontmatter = _parse_skill_frontmatter(content)

        # Check if already exists
        existing = await repo.get_latest_by_slug(skill_name)
        if existing:
            skipped += 1
            continue

        try:
            # Collect supporting files
            supporting = []
            for f in skill_dir.rglob("*"):
                if f.is_file() and f.name != "SKILL.md":
                    rel_path = str(f.relative_to(skill_dir))
                    try:
                        file_content = f.read_text(encoding="utf-8")
                        supporting.append({"path": rel_path, "content": file_content})
                    except (UnicodeDecodeError, PermissionError):
                        pass

            data = {
                "name": frontmatter.get("name", skill_name),
                "description": frontmatter.get("description", ""),
                "category": _infer_category(skill_name, str(skill_dir.parent.name)),
                "scope": "platform",
                "skill_content": content,
                "allowed_tools": frontmatter.get("allowed-tools"),
                "user_invocable": frontmatter.get("user-invocable", True),
                "supporting_files": supporting,
                "status": "published",
                "visibility": "public",
            }
            await repo.create(data, owner_id=user.user_id, tenant_id=None)
            imported += 1
        except Exception as e:
            errors.append({"skill": skill_name, "error": str(e)})

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
        "total_found": imported + skipped + len(errors),
    }
