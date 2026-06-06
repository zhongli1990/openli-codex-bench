import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func, update, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import PromptTemplate


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug


class TemplateRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_templates(
        self,
        user_id: str,
        tenant_id: Optional[str] = None,
        is_admin: bool = False,
        category: Optional[str] = None,
        status: Optional[str] = None,
        visibility: Optional[str] = None,
        search: Optional[str] = None,
        latest_only: bool = True,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[list[PromptTemplate], int]:
        """List templates with RBAC filtering."""
        query = select(PromptTemplate)

        if latest_only:
            query = query.where(PromptTemplate.is_latest == True)

        # RBAC visibility filter
        if not is_admin:
            visibility_conditions = [
                PromptTemplate.visibility == "public",
                PromptTemplate.owner_id == uuid.UUID(user_id),
            ]
            if tenant_id:
                visibility_conditions.append(
                    and_(
                        PromptTemplate.visibility == "tenant",
                        PromptTemplate.tenant_id == uuid.UUID(tenant_id),
                    )
                )
            query = query.where(or_(*visibility_conditions))

        if category:
            query = query.where(PromptTemplate.category == category)
        if status:
            query = query.where(PromptTemplate.status == status)
        if visibility:
            query = query.where(PromptTemplate.visibility == visibility)
        if search:
            pattern = f"%{search}%"
            query = query.where(
                or_(
                    PromptTemplate.name.ilike(pattern),
                    PromptTemplate.description.ilike(pattern),
                    PromptTemplate.slug.ilike(pattern),
                )
            )

        # Count
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        # Fetch
        query = query.order_by(PromptTemplate.updated_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all(), total

    async def get_by_id(self, template_id: str) -> Optional[PromptTemplate]:
        result = await self.db.execute(
            select(PromptTemplate).where(PromptTemplate.id == uuid.UUID(template_id))
        )
        return result.scalar_one_or_none()

    async def get_latest_by_slug(self, slug: str, tenant_id: Optional[str] = None) -> Optional[PromptTemplate]:
        query = select(PromptTemplate).where(
            PromptTemplate.slug == slug,
            PromptTemplate.is_latest == True,
        )
        if tenant_id:
            query = query.where(PromptTemplate.tenant_id == uuid.UUID(tenant_id))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_versions(self, slug: str, tenant_id: Optional[str] = None) -> list[PromptTemplate]:
        query = select(PromptTemplate).where(PromptTemplate.slug == slug)
        if tenant_id:
            query = query.where(PromptTemplate.tenant_id == uuid.UUID(tenant_id))
        query = query.order_by(PromptTemplate.version.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create(self, data: dict, owner_id: str, tenant_id: Optional[str] = None) -> PromptTemplate:
        slug = _slugify(data["name"])

        template = PromptTemplate(
            owner_id=uuid.UUID(owner_id),
            tenant_id=uuid.UUID(tenant_id) if tenant_id else None,
            name=data["name"],
            slug=slug,
            description=data.get("description"),
            category=data["category"],
            subcategory=data.get("subcategory"),
            tags=data.get("tags", []),
            template_body=data["template_body"],
            variables=data.get("variables", []),
            sample_values=data.get("sample_values", {}),
            compatible_models=data.get("compatible_models", []),
            tested_models=data.get("tested_models", []),
            recommended_model=data.get("recommended_model"),
            version=1,
            is_latest=True,
            status=data.get("status", "draft"),
            visibility=data.get("visibility", "private"),
        )
        self.db.add(template)
        await self.db.commit()
        await self.db.refresh(template)
        return template

    async def update(self, template_id: str, data: dict, user_id: str) -> PromptTemplate:
        """Update creates a new version, marks old as not latest."""
        existing = await self.get_by_id(template_id)
        if not existing:
            raise ValueError("Template not found")

        # Mark existing as not latest
        existing.is_latest = False
        await self.db.flush()

        # Create new version
        new_version = PromptTemplate(
            owner_id=existing.owner_id,
            tenant_id=existing.tenant_id,
            name=data.get("name", existing.name),
            slug=existing.slug,
            description=data.get("description", existing.description),
            category=data.get("category", existing.category),
            subcategory=data.get("subcategory", existing.subcategory),
            tags=data.get("tags", existing.tags),
            template_body=data.get("template_body", existing.template_body),
            variables=data.get("variables", existing.variables),
            sample_values=data.get("sample_values", existing.sample_values),
            compatible_models=data.get("compatible_models", existing.compatible_models),
            tested_models=data.get("tested_models", existing.tested_models),
            recommended_model=data.get("recommended_model", existing.recommended_model),
            version=existing.version + 1,
            is_latest=True,
            parent_id=existing.id,
            change_summary=data.get("change_summary"),
            status=data.get("status", existing.status),
            visibility=data.get("visibility", existing.visibility),
        )
        self.db.add(new_version)
        await self.db.commit()
        await self.db.refresh(new_version)
        return new_version

    async def delete(self, template_id: str) -> bool:
        """Soft delete: archive the template."""
        template = await self.get_by_id(template_id)
        if not template:
            return False
        template.status = "archived"
        template.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        return True

    async def publish(self, template_id: str) -> Optional[PromptTemplate]:
        template = await self.get_by_id(template_id)
        if not template:
            return None
        template.status = "published"
        template.published_at = datetime.now(timezone.utc)
        template.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(template)
        return template

    async def clone(self, template_id: str, owner_id: str, tenant_id: Optional[str] = None) -> PromptTemplate:
        """Clone a template to a new owner/tenant."""
        source = await self.get_by_id(template_id)
        if not source:
            raise ValueError("Template not found")

        slug = _slugify(source.name + "-copy")

        clone = PromptTemplate(
            owner_id=uuid.UUID(owner_id),
            tenant_id=uuid.UUID(tenant_id) if tenant_id else None,
            name=f"{source.name} (Copy)",
            slug=slug,
            description=source.description,
            category=source.category,
            subcategory=source.subcategory,
            tags=source.tags,
            template_body=source.template_body,
            variables=source.variables,
            sample_values=source.sample_values,
            compatible_models=source.compatible_models,
            tested_models=source.tested_models,
            recommended_model=source.recommended_model,
            version=1,
            is_latest=True,
            parent_id=None,
            status="draft",
            visibility="private",
        )
        self.db.add(clone)
        await self.db.commit()
        await self.db.refresh(clone)
        return clone
