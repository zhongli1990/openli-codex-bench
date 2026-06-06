import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import CurrentUser, get_current_user
from ..database import get_db
from ..models import PromptTemplate
from ..repositories.template_repo import TemplateRepository
from ..repositories.usage_repo import UsageRepository
from ..schemas import (
    CreateTemplateRequest,
    UpdateTemplateRequest,
    TemplateResponse,
    TemplateListResponse,
    RenderRequest,
    RenderResponse,
)

router = APIRouter(prefix="/templates", tags=["templates"])


def _to_response(t: PromptTemplate, usage_count: int = 0) -> TemplateResponse:
    return TemplateResponse(
        id=str(t.id),
        tenant_id=str(t.tenant_id) if t.tenant_id else None,
        owner_id=str(t.owner_id),
        name=t.name,
        slug=t.slug,
        description=t.description,
        category=t.category,
        subcategory=t.subcategory,
        tags=t.tags or [],
        template_body=t.template_body,
        variables=t.variables or [],
        sample_values=t.sample_values or {},
        compatible_models=t.compatible_models or [],
        tested_models=t.tested_models or [],
        recommended_model=t.recommended_model,
        version=t.version,
        is_latest=t.is_latest,
        parent_id=str(t.parent_id) if t.parent_id else None,
        change_summary=t.change_summary,
        status=t.status,
        visibility=t.visibility,
        created_at=t.created_at.isoformat() if t.created_at else "",
        updated_at=t.updated_at.isoformat() if t.updated_at else "",
        published_at=t.published_at.isoformat() if t.published_at else None,
        usage_count=usage_count,
    )


@router.get("", response_model=TemplateListResponse)
async def list_templates(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    visibility: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = TemplateRepository(db)
    templates, total = await repo.list_templates(
        user_id=user.user_id,
        tenant_id=user.tenant_id,
        is_admin=user.is_admin,
        category=category,
        status=status,
        visibility=visibility,
        search=search,
        offset=offset,
        limit=limit,
    )
    items = [_to_response(t) for t in templates]
    return TemplateListResponse(items=items, total=total)


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = TemplateRepository(db)
    template = await repo.get_by_id(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    usage_repo = UsageRepository(db)
    count = await usage_repo.get_usage_count(template_id=template_id)
    return _to_response(template, usage_count=count)


@router.get("/slug/{slug}", response_model=TemplateResponse)
async def get_template_by_slug(
    slug: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = TemplateRepository(db)
    template = await repo.get_latest_by_slug(slug, tenant_id=user.tenant_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return _to_response(template)


@router.get("/{template_id}/versions", response_model=TemplateListResponse)
async def get_template_versions(
    template_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = TemplateRepository(db)
    template = await repo.get_by_id(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    versions = await repo.get_versions(template.slug, tenant_id=str(template.tenant_id) if template.tenant_id else None)
    items = [_to_response(v) for v in versions]
    return TemplateListResponse(items=items, total=len(items))


@router.post("", response_model=TemplateResponse, status_code=201)
async def create_template(
    req: CreateTemplateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = TemplateRepository(db)
    data = req.model_dump()
    # Convert VariableDefinition objects to dicts
    data["variables"] = [v.model_dump() if hasattr(v, "model_dump") else v for v in data.get("variables", [])]
    template = await repo.create(data, owner_id=user.user_id, tenant_id=user.tenant_id)
    return _to_response(template)


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    req: UpdateTemplateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = TemplateRepository(db)
    existing = await repo.get_by_id(template_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")

    # Check ownership or admin
    if str(existing.owner_id) != user.user_id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to edit this template")

    data = req.model_dump(exclude_unset=True)
    if "variables" in data and data["variables"] is not None:
        data["variables"] = [v.model_dump() if hasattr(v, "model_dump") else v for v in data["variables"]]
    template = await repo.update(template_id, data, user_id=user.user_id)
    return _to_response(template)


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = TemplateRepository(db)
    existing = await repo.get_by_id(template_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")

    if str(existing.owner_id) != user.user_id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this template")

    await repo.delete(template_id)
    return {"status": "archived", "id": template_id}


@router.post("/{template_id}/render", response_model=RenderResponse)
async def render_template(
    template_id: str,
    req: RenderRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = TemplateRepository(db)
    template = await repo.get_by_id(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    rendered = template.template_body
    for var_name, var_value in req.variables.items():
        rendered = rendered.replace(f"{{{{{var_name}}}}}", var_value)

    # Check for unresolved variables
    unresolved = re.findall(r"\{\{(\w+)\}\}", rendered)
    if unresolved:
        # Fill with empty string for optional vars
        for var in unresolved:
            rendered = rendered.replace(f"{{{{{var}}}}}", "")

    # Log usage
    usage_repo = UsageRepository(db)
    await usage_repo.log_usage(
        user_id=user.user_id,
        tenant_id=user.tenant_id,
        template_id=template_id,
        rendered_prompt=rendered,
        variables_used=req.variables,
    )

    return RenderResponse(
        rendered=rendered.strip(),
        template_id=str(template.id),
        template_name=template.name,
        variables_used=req.variables,
    )


@router.post("/{template_id}/publish", response_model=TemplateResponse)
async def publish_template(
    template_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = TemplateRepository(db)
    existing = await repo.get_by_id(template_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")

    if str(existing.owner_id) != user.user_id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to publish this template")

    template = await repo.publish(template_id)
    return _to_response(template)


@router.post("/{template_id}/clone", response_model=TemplateResponse, status_code=201)
async def clone_template(
    template_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = TemplateRepository(db)
    clone = await repo.clone(template_id, owner_id=user.user_id, tenant_id=user.tenant_id)
    return _to_response(clone)
