import uuid
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import TemplateUsageLog


class UsageRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_usage(
        self,
        user_id: str,
        tenant_id: Optional[str] = None,
        template_id: Optional[str] = None,
        skill_id: Optional[str] = None,
        session_id: Optional[str] = None,
        rendered_prompt: Optional[str] = None,
        variables_used: Optional[dict] = None,
        model_used: Optional[str] = None,
    ) -> TemplateUsageLog:
        entry = TemplateUsageLog(
            user_id=uuid.UUID(user_id),
            tenant_id=uuid.UUID(tenant_id) if tenant_id else None,
            template_id=uuid.UUID(template_id) if template_id else None,
            skill_id=uuid.UUID(skill_id) if skill_id else None,
            session_id=uuid.UUID(session_id) if session_id else None,
            rendered_prompt=rendered_prompt,
            variables_used=variables_used,
            model_used=model_used,
        )
        self.db.add(entry)
        await self.db.commit()
        await self.db.refresh(entry)
        return entry

    async def get_usage_count(self, template_id: Optional[str] = None, skill_id: Optional[str] = None) -> int:
        query = select(func.count()).select_from(TemplateUsageLog)
        if template_id:
            query = query.where(TemplateUsageLog.template_id == uuid.UUID(template_id))
        if skill_id:
            query = query.where(TemplateUsageLog.skill_id == uuid.UUID(skill_id))
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_stats(self, tenant_id: Optional[str] = None) -> dict:
        base = select(TemplateUsageLog)
        if tenant_id:
            base = base.where(TemplateUsageLog.tenant_id == uuid.UUID(tenant_id))

        total_q = select(func.count()).select_from(base.subquery())
        total = (await self.db.execute(total_q)).scalar() or 0

        templates_q = select(func.count(func.distinct(TemplateUsageLog.template_id))).select_from(base.subquery())
        templates_used = (await self.db.execute(templates_q)).scalar() or 0

        skills_q = select(func.count(func.distinct(TemplateUsageLog.skill_id))).select_from(base.subquery())
        skills_used = (await self.db.execute(skills_q)).scalar() or 0

        return {
            "total_uses": total,
            "templates_used": templates_used,
            "skills_used": skills_used,
        }
