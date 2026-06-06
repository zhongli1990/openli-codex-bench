import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Run, RunEvent


class RunRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        session_id: uuid.UUID,
        runner_run_id: str,
        prompt: str,
        tenant_id: Optional[uuid.UUID] = None
    ) -> Run:
        run = Run(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            session_id=session_id,
            runner_run_id=runner_run_id,
            prompt=prompt,
            status="running",
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(run)
        await self.db.commit()
        await self.db.refresh(run)
        return run

    async def get_by_id(self, run_id: uuid.UUID) -> Optional[Run]:
        result = await self.db.execute(
            select(Run).where(Run.id == run_id)
        )
        return result.scalar_one_or_none()

    async def get_by_runner_run_id(self, runner_run_id: str) -> Optional[Run]:
        result = await self.db.execute(
            select(Run).where(Run.runner_run_id == runner_run_id)
        )
        return result.scalar_one_or_none()

    async def update_status(
        self,
        run_id: uuid.UUID,
        status: str,
        completed_at: Optional[datetime] = None
    ) -> None:
        run = await self.get_by_id(run_id)
        if run:
            run.status = status
            if completed_at:
                run.completed_at = completed_at
            await self.db.commit()

    async def list_by_session(self, session_id: uuid.UUID) -> list[Run]:
        result = await self.db.execute(
            select(Run)
            .where(Run.session_id == session_id)
            .order_by(Run.created_at.desc())
        )
        return list(result.scalars().all())

    async def add_event(
        self,
        run_id: uuid.UUID,
        seq: int,
        event_type: Optional[str],
        raw_json: dict,
        source: str = "runner"
    ) -> RunEvent:
        event = RunEvent(
            run_id=run_id,
            seq=seq,
            at=datetime.now(timezone.utc),
            source=source,
            event_type=event_type,
            raw_json=raw_json
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def get_events(self, run_id: uuid.UUID) -> list[RunEvent]:
        result = await self.db.execute(
            select(RunEvent)
            .where(RunEvent.run_id == run_id)
            .order_by(RunEvent.seq)
        )
        return list(result.scalars().all())

    async def get_next_seq(self, run_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.coalesce(func.max(RunEvent.seq), 0))
            .where(RunEvent.run_id == run_id)
        )
        return result.scalar() + 1
