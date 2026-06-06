import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Workspace


class WorkspaceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        source_type: str,
        source_uri: str,
        display_name: str,
        local_path: str,
        storage_mode: str = "managed_copy",
        tenant_id: Optional[uuid.UUID] = None,
        metadata_json: Optional[dict] = None
    ) -> Workspace:
        workspace = Workspace(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            source_type=source_type,
            source_uri=source_uri,
            storage_mode=storage_mode,
            display_name=display_name,
            local_path=local_path,
            created_at=datetime.now(timezone.utc),
            metadata_json=metadata_json
        )
        self.db.add(workspace)
        await self.db.commit()
        await self.db.refresh(workspace)
        return workspace

    async def get_by_id(self, workspace_id: uuid.UUID) -> Optional[Workspace]:
        result = await self.db.execute(
            select(Workspace).where(Workspace.id == workspace_id)
        )
        return result.scalar_one_or_none()

    async def get_by_source(self, source_type: str, source_uri: str) -> Optional[Workspace]:
        result = await self.db.execute(
            select(Workspace).where(
                Workspace.source_type == source_type,
                Workspace.source_uri == source_uri
            )
        )
        return result.scalar_one_or_none()

    async def list_all(self, tenant_id: Optional[uuid.UUID] = None) -> list[Workspace]:
        query = select(Workspace).order_by(Workspace.created_at.desc())
        if tenant_id:
            query = query.where(Workspace.tenant_id == tenant_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_last_accessed(self, workspace_id: uuid.UUID) -> None:
        workspace = await self.get_by_id(workspace_id)
        if workspace:
            workspace.last_accessed_at = datetime.now(timezone.utc)
            await self.db.commit()

    async def delete(self, workspace_id: uuid.UUID) -> bool:
        """Delete a workspace. Cascade delete will handle sessions, runs, events."""
        workspace = await self.get_by_id(workspace_id)
        if workspace:
            await self.db.delete(workspace)
            await self.db.commit()
            return True
        return False
