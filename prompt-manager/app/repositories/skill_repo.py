import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Skill


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug


class SkillRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_skills(
        self,
        user_id: str,
        tenant_id: Optional[str] = None,
        is_admin: bool = False,
        category: Optional[str] = None,
        scope: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        latest_only: bool = True,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[list[Skill], int]:
        query = select(Skill)

        if latest_only:
            query = query.where(Skill.is_latest == True)

        # RBAC visibility filter
        if not is_admin:
            visibility_conditions = [
                Skill.visibility == "public",
                Skill.owner_id == uuid.UUID(user_id),
            ]
            if tenant_id:
                visibility_conditions.append(
                    and_(
                        Skill.visibility == "tenant",
                        Skill.tenant_id == uuid.UUID(tenant_id),
                    )
                )
            query = query.where(or_(*visibility_conditions))

        if category:
            query = query.where(Skill.category == category)
        if scope:
            query = query.where(Skill.scope == scope)
        if status:
            query = query.where(Skill.status == status)
        if search:
            pattern = f"%{search}%"
            query = query.where(
                or_(
                    Skill.name.ilike(pattern),
                    Skill.description.ilike(pattern),
                    Skill.slug.ilike(pattern),
                )
            )

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        query = query.order_by(Skill.updated_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all(), total

    async def get_by_id(self, skill_id: str) -> Optional[Skill]:
        result = await self.db.execute(
            select(Skill).where(Skill.id == uuid.UUID(skill_id))
        )
        return result.scalar_one_or_none()

    async def get_latest_by_slug(self, slug: str, tenant_id: Optional[str] = None) -> Optional[Skill]:
        query = select(Skill).where(
            Skill.slug == slug,
            Skill.is_latest == True,
        )
        if tenant_id:
            query = query.where(Skill.tenant_id == uuid.UUID(tenant_id))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_versions(self, slug: str, tenant_id: Optional[str] = None) -> list[Skill]:
        query = select(Skill).where(Skill.slug == slug)
        if tenant_id:
            query = query.where(Skill.tenant_id == uuid.UUID(tenant_id))
        query = query.order_by(Skill.version.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create(self, data: dict, owner_id: str, tenant_id: Optional[str] = None) -> Skill:
        slug = _slugify(data["name"])

        skill = Skill(
            owner_id=uuid.UUID(owner_id),
            tenant_id=uuid.UUID(tenant_id) if tenant_id else None,
            name=data["name"],
            slug=slug,
            description=data.get("description"),
            category=data["category"],
            subcategory=data.get("subcategory"),
            tags=data.get("tags", []),
            scope=data.get("scope", "platform"),
            skill_content=data["skill_content"],
            allowed_tools=data.get("allowed_tools"),
            user_invocable=data.get("user_invocable", True),
            supporting_files=data.get("supporting_files", []),
            compatible_models=data.get("compatible_models", []),
            tested_models=data.get("tested_models", []),
            recommended_model=data.get("recommended_model"),
            version=1,
            is_latest=True,
            status=data.get("status", "draft"),
            visibility=data.get("visibility", "private"),
            enabled=True,
            workspace_id=uuid.UUID(data["workspace_id"]) if data.get("workspace_id") else None,
        )
        self.db.add(skill)
        await self.db.commit()
        await self.db.refresh(skill)
        return skill

    async def update(self, skill_id: str, data: dict, user_id: str) -> Skill:
        existing = await self.get_by_id(skill_id)
        if not existing:
            raise ValueError("Skill not found")

        existing.is_latest = False
        await self.db.flush()

        new_version = Skill(
            owner_id=existing.owner_id,
            tenant_id=existing.tenant_id,
            name=data.get("name", existing.name),
            slug=existing.slug,
            description=data.get("description", existing.description),
            category=data.get("category", existing.category),
            subcategory=data.get("subcategory", existing.subcategory),
            tags=data.get("tags", existing.tags),
            scope=data.get("scope", existing.scope),
            skill_content=data.get("skill_content", existing.skill_content),
            allowed_tools=data.get("allowed_tools", existing.allowed_tools),
            user_invocable=data.get("user_invocable", existing.user_invocable),
            supporting_files=data.get("supporting_files", existing.supporting_files),
            compatible_models=data.get("compatible_models", existing.compatible_models),
            tested_models=data.get("tested_models", existing.tested_models),
            recommended_model=data.get("recommended_model", existing.recommended_model),
            version=existing.version + 1,
            is_latest=True,
            parent_id=existing.id,
            change_summary=data.get("change_summary"),
            status=data.get("status", existing.status),
            visibility=data.get("visibility", existing.visibility),
            enabled=data.get("enabled", existing.enabled),
            workspace_id=existing.workspace_id,
        )
        self.db.add(new_version)
        await self.db.commit()
        await self.db.refresh(new_version)
        return new_version

    async def delete(self, skill_id: str) -> bool:
        skill = await self.get_by_id(skill_id)
        if not skill:
            return False
        skill.status = "archived"
        skill.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        return True

    async def publish(self, skill_id: str) -> Optional[Skill]:
        skill = await self.get_by_id(skill_id)
        if not skill:
            return None
        skill.status = "published"
        skill.published_at = datetime.now(timezone.utc)
        skill.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(skill)
        return skill

    async def toggle(self, skill_id: str) -> Optional[Skill]:
        skill = await self.get_by_id(skill_id)
        if not skill:
            return None
        skill.enabled = not skill.enabled
        skill.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(skill)
        return skill

    async def clone(self, skill_id: str, owner_id: str, tenant_id: Optional[str] = None) -> Skill:
        source = await self.get_by_id(skill_id)
        if not source:
            raise ValueError("Skill not found")

        slug = _slugify(source.name + "-copy")

        clone = Skill(
            owner_id=uuid.UUID(owner_id),
            tenant_id=uuid.UUID(tenant_id) if tenant_id else None,
            name=f"{source.name} (Copy)",
            slug=slug,
            description=source.description,
            category=source.category,
            subcategory=source.subcategory,
            tags=source.tags,
            scope=source.scope,
            skill_content=source.skill_content,
            allowed_tools=source.allowed_tools,
            user_invocable=source.user_invocable,
            supporting_files=source.supporting_files,
            compatible_models=source.compatible_models,
            tested_models=source.tested_models,
            recommended_model=source.recommended_model,
            version=1,
            is_latest=True,
            status="draft",
            visibility="private",
            enabled=True,
        )
        self.db.add(clone)
        await self.db.commit()
        await self.db.refresh(clone)
        return clone
