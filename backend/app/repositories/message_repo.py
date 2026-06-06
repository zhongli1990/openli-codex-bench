import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Message


class MessageRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        session_id: uuid.UUID,
        role: str,
        content: str,
        run_id: Optional[uuid.UUID] = None,
        metadata_json: Optional[dict] = None
    ) -> Message:
        message = Message(
            id=uuid.uuid4(),
            session_id=session_id,
            run_id=run_id,
            role=role,
            content=content,
            metadata_json=metadata_json,
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def list_by_session(self, session_id: uuid.UUID) -> list[Message]:
        result = await self.db.execute(
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, message_id: uuid.UUID) -> Optional[Message]:
        result = await self.db.execute(
            select(Message).where(Message.id == message_id)
        )
        return result.scalar_one_or_none()
