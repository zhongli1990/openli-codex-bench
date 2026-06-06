import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Session


class SessionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        workspace_id: uuid.UUID,
        runner_type: str,
        runner_thread_id: str,
        working_directory: str,
        tenant_id: Optional[uuid.UUID] = None
    ) -> Session:
        session = Session(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            runner_type=runner_type,
            runner_thread_id=runner_thread_id,
            working_directory=working_directory,
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def get_by_id(self, session_id: uuid.UUID) -> Optional[Session]:
        result = await self.db.execute(
            select(Session).where(Session.id == session_id)
        )
        return result.scalar_one_or_none()

    async def list_by_workspace(self, workspace_id: uuid.UUID) -> list[Session]:
        result = await self.db.execute(
            select(Session)
            .where(Session.workspace_id == workspace_id)
            .order_by(Session.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_thread_id(self, session_id: uuid.UUID, new_thread_id: str) -> None:
        """Update the runner_thread_id for a session (used for thread recovery)."""
        result = await self.db.execute(
            select(Session).where(Session.id == session_id)
        )
        session = result.scalar_one_or_none()
        if session:
            session.runner_thread_id = new_thread_id
            await self.db.commit()
