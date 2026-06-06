import asyncio
import json
import os
import pathlib
import re
import shutil
import subprocess
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncIterator, Literal, Optional

import httpx
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select

from .database import engine, async_session_maker, Base, get_db
from .repositories import WorkspaceRepository, SessionRepository, RunRepository, MessageRepository
from .models import User, Workspace
from .auth.router import router as auth_router
from .auth.security import get_password_hash
from .auth.dependencies import get_current_user, get_current_user_optional
from .auth.rbac import tenant_filter, is_super_admin, has_min_role
from .admin.router import router as admin_router


WORKSPACES_ROOT = os.environ.get("WORKSPACES_ROOT", "/workspaces")
RUNNER_URL = os.environ.get("RUNNER_URL", "http://runner:8081")
RUNNER_CODEX_URL = os.environ.get("RUNNER_CODEX_URL", "http://runner:8081")
RUNNER_CLAUDE_URL = os.environ.get("RUNNER_CLAUDE_URL", "http://claude-runner:8082")
# Fleet-bench swap targets — OpenRunner's runners (same /threads+/runs+/events protocol → no adapter).
# Default to OpenRunner's host-published ports so this clone swaps runners by config alone.
RUNNER_OPENCODEX_URL = os.environ.get("RUNNER_OPENCODEX_URL", "http://host.docker.internal:9432")
RUNNER_MOCK_URL = os.environ.get("RUNNER_MOCK_URL", "http://host.docker.internal:9433")


def _derive_display_name(source_type: str, source_uri: str) -> str:
    if source_type == "github":
        match = re.search(r"github\.com[/:]([^/]+)/([^/.]+)", source_uri)
        if match:
            return f"{match.group(1)}/{match.group(2)}"
        return source_uri.split("/")[-1].replace(".git", "")
    else:
        return pathlib.Path(source_uri).name


async def scan_and_import_existing_workspaces():
    """Scan the workspaces directory and import any existing workspaces into the database."""
    workspaces_path = pathlib.Path(WORKSPACES_ROOT)
    if not workspaces_path.exists():
        return
    
    async with async_session_maker() as db:
        repo = WorkspaceRepository(db)
        
        for workspace_dir in workspaces_path.iterdir():
            if not workspace_dir.is_dir():
                continue
            
            repo_path = workspace_dir / "repo"
            if not repo_path.exists():
                continue
            
            # Try to get git remote URL
            try:
                result = subprocess.run(
                    ["git", "remote", "get-url", "origin"],
                    cwd=str(repo_path),
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    source_uri = result.stdout.strip()
                    source_type = "github" if "github.com" in source_uri else "local"
                else:
                    source_uri = str(repo_path)
                    source_type = "local"
            except Exception:
                source_uri = str(repo_path)
                source_type = "local"
            
            # Check if already exists
            existing = await repo.get_by_source(source_type, source_uri)
            if existing:
                continue
            
            # Also check by local path to avoid duplicates
            existing_by_path = await repo.get_by_id(uuid.UUID(workspace_dir.name)) if _is_valid_uuid(workspace_dir.name) else None
            if existing_by_path:
                continue
            
            # Derive display name
            display_name = _derive_display_name(source_type, source_uri)
            
            # Create workspace entry
            try:
                workspace_id = uuid.UUID(workspace_dir.name) if _is_valid_uuid(workspace_dir.name) else uuid.uuid4()
                await repo.create(
                    source_type=source_type,
                    source_uri=source_uri,
                    display_name=display_name,
                    local_path=str(repo_path)
                )
                print(f"Imported existing workspace: {display_name} ({source_uri})")
            except Exception as e:
                print(f"Failed to import workspace {workspace_dir.name}: {e}")


def _is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(val)
        return True
    except ValueError:
        return False


async def create_initial_admin():
    """Create initial admin user if none exists, and seed sample tenants/groups."""
    from .models import Tenant, Group, UserGroup
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@saas-codex.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Windsor_789+")
    
    async with async_session_maker() as db:
        result = await db.execute(select(User).where(User.email == admin_email))
        existing = result.scalar_one_or_none()
        
        if existing is None:
            admin = User(
                email=admin_email,
                password_hash=get_password_hash(admin_password),
                display_name="Platform Admin",
                status="active",
                role="super_admin"
            )
            db.add(admin)
            await db.commit()
            print(f"Created initial admin user: {admin_email}")
        else:
            # Migrate legacy 'admin' role to 'super_admin'
            if existing.role == "admin":
                existing.role = "super_admin"
                await db.commit()
                print(f"Migrated admin role to super_admin: {admin_email}")
        
        # Seed sample tenants if none exist
        tenant_result = await db.execute(select(Tenant))
        if not tenant_result.scalars().first():
            nhs_tenant = Tenant(
                name="NHS Birmingham Trust",
                slug="nhs-birmingham",
                status="active",
                metadata_json={"type": "healthcare", "region": "West Midlands"}
            )
            enterprise_tenant = Tenant(
                name="Enterprise Corp",
                slug="enterprise-corp",
                status="active",
                metadata_json={"type": "enterprise", "industry": "technology"}
            )
            db.add_all([nhs_tenant, enterprise_tenant])
            await db.flush()
            
            # Seed groups for each tenant
            nhs_groups = [
                Group(tenant_id=nhs_tenant.id, name="Administrators", description="Org Admins for NHS Trust"),
                Group(tenant_id=nhs_tenant.id, name="Clinical Leads", description="Clinical oversight and compliance"),
                Group(tenant_id=nhs_tenant.id, name="Developers", description="Development team"),
                Group(tenant_id=nhs_tenant.id, name="Sales", description="Sales and pre-sales team"),
            ]
            enterprise_groups = [
                Group(tenant_id=enterprise_tenant.id, name="Administrators", description="Org Admins for Enterprise Corp"),
                Group(tenant_id=enterprise_tenant.id, name="Architecture", description="Solution architects"),
                Group(tenant_id=enterprise_tenant.id, name="Developers", description="Development team"),
                Group(tenant_id=enterprise_tenant.id, name="Stakeholders", description="View-only stakeholders"),
            ]
            db.add_all(nhs_groups + enterprise_groups)
            await db.commit()
            print("Seeded sample tenants and groups")


async def ensure_superadmin():
    """Idempotently ensure a standing super_admin with login id 'superadmin' (all envs)."""
    superadmin_password = os.environ.get("SUPERADMIN_PASSWORD", "Windsor_789+")
    async with async_session_maker() as db:
        existing = (
            await db.execute(select(User).where(User.email == "superadmin"))
        ).scalar_one_or_none()
        if existing is not None:
            return
        db.add(
            User(
                email="superadmin",
                password_hash=get_password_hash(superadmin_password),
                display_name="Super Admin",
                status="active",
                role="super_admin",
            )
        )
        await db.commit()
        print("Created standing super_admin: superadmin")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create initial admin user
    await create_initial_admin()
    # Standing super_admin (all environments) — login id "superadmin"
    await ensure_superadmin()
    
    # Scan and import existing workspaces
    await scan_and_import_existing_workspaces()
    
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Include auth and admin routers
app.include_router(auth_router)
app.include_router(admin_router)


RunnerType = Literal["codex", "claude", "opencodex", "mock"]
SourceType = Literal["github", "local"]


class ImportWorkspaceRequest(BaseModel):
    source_type: SourceType
    source_uri: str
    display_name: Optional[str] = None


class WorkspaceResponse(BaseModel):
    workspace_id: str
    display_name: str
    source_type: str
    source_uri: str
    local_path: str
    created_at: str


class WorkspaceListResponse(BaseModel):
    items: list[WorkspaceResponse]


class DiscoveredFolder(BaseModel):
    folder_name: str
    path: str
    has_git: bool
    git_remote: Optional[str] = None
    suggested_name: str


class ScanWorkspacesResponse(BaseModel):
    discovered: list[DiscoveredFolder]


class ImportLocalRequest(BaseModel):
    folder_name: str
    display_name: Optional[str] = None


class CreateSessionRequest(BaseModel):
    repo_url: Optional[str] = None
    workspace_id: Optional[str] = None
    runner_type: RunnerType = "codex"


class SessionResponse(BaseModel):
    session_id: str
    workspace_id: str
    runner_type: str
    thread_id: str
    created_at: str
    run_count: int = 0


class SessionListResponse(BaseModel):
    items: list[SessionResponse]


class CreateSessionResponse(BaseModel):
    session_id: str
    repo_path: str
    thread_id: str
    runner_type: RunnerType
    workspace_id: Optional[str] = None


class PromptRequest(BaseModel):
    prompt: str


class PromptResponse(BaseModel):
    run_id: str


class RunResponse(BaseModel):
    run_id: str
    session_id: str
    prompt: str
    status: str
    created_at: str
    completed_at: Optional[str] = None


class RunListResponse(BaseModel):
    items: list[RunResponse]


class TranscriptMessage(BaseModel):
    role: str
    content: str
    tool_name: Optional[str] = None
    tool_input: Optional[dict] = None
    tool_output: Optional[dict] = None


class TranscriptResponse(BaseModel):
    run_id: str
    messages: list[TranscriptMessage]


class MessageResponse(BaseModel):
    message_id: str
    session_id: str
    run_id: Optional[str] = None
    role: str
    content: str
    metadata: Optional[dict] = None
    created_at: str


class MessageListResponse(BaseModel):
    items: list[MessageResponse]


class CreateMessageRequest(BaseModel):
    role: str
    content: str
    run_id: Optional[str] = None
    metadata: Optional[dict] = None


async def get_db() -> AsyncIterator[AsyncSession]:
    async with async_session_maker() as session:
        yield session


def _get_runner_url(runner_type: str) -> str:
    # Fleet-bench: route by runner_type across the embedded runners AND OpenRunner's swap-in runners.
    return {
        "claude": RUNNER_CLAUDE_URL,
        "codex": RUNNER_CODEX_URL,
        "opencodex": RUNNER_OPENCODEX_URL,   # OpenRunner (new)
        "mock": RUNNER_MOCK_URL,             # OpenRunner mock (zero-token like-for-like)
    }.get(runner_type, RUNNER_CODEX_URL)


def _workspace_dir_for_id(workspace_id: str) -> str:
    root = pathlib.Path(WORKSPACES_ROOT)
    root.mkdir(parents=True, exist_ok=True)
    return str(root / workspace_id / "repo")


def _ensure_under_workspaces_root(path_str: str) -> str:
    root = pathlib.Path(WORKSPACES_ROOT).resolve()
    path = pathlib.Path(path_str).resolve()
    if not str(path).startswith(str(root)):
        raise HTTPException(status_code=400, detail="invalid workspace path")
    return str(path)


def _format_datetime(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/workspaces/import", response_model=WorkspaceResponse)
async def import_workspace(
    req: ImportWorkspaceRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user_optional),
) -> WorkspaceResponse:
    repo = WorkspaceRepository(db)
    
    existing = await repo.get_by_source(req.source_type, req.source_uri)
    if existing:
        await repo.update_last_accessed(existing.id)
        return WorkspaceResponse(
            workspace_id=str(existing.id),
            display_name=existing.display_name,
            source_type=existing.source_type,
            source_uri=existing.source_uri,
            local_path=existing.local_path,
            created_at=_format_datetime(existing.created_at)
        )

    workspace_id = str(uuid.uuid4())
    display_name = req.display_name or _derive_display_name(req.source_type, req.source_uri)
    local_path = _workspace_dir_for_id(workspace_id)
    local_path = _ensure_under_workspaces_root(local_path)

    parent = pathlib.Path(local_path).parent
    parent.mkdir(parents=True, exist_ok=True)

    if req.source_type == "github":
        result = subprocess.run(
            ["git", "clone", "--depth", "1", req.source_uri, local_path],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise HTTPException(status_code=400, detail=f"git clone failed: {result.stderr.strip()}")
    elif req.source_type == "local":
        source_path = pathlib.Path(req.source_uri)
        if not source_path.exists():
            raise HTTPException(status_code=400, detail=f"Source path does not exist: {req.source_uri}")
        if source_path.is_dir():
            shutil.copytree(str(source_path), local_path)
        else:
            raise HTTPException(status_code=400, detail="Source path must be a directory")

    workspace = await repo.create(
        source_type=req.source_type,
        source_uri=req.source_uri,
        display_name=display_name,
        local_path=local_path,
        tenant_id=user.tenant_id if user else None,
    )

    return WorkspaceResponse(
        workspace_id=str(workspace.id),
        display_name=workspace.display_name,
        source_type=workspace.source_type,
        source_uri=workspace.source_uri,
        local_path=workspace.local_path,
        created_at=_format_datetime(workspace.created_at)
    )


@app.get("/api/workspaces/scan", response_model=ScanWorkspacesResponse)
async def scan_workspaces(db: AsyncSession = Depends(get_db)) -> ScanWorkspacesResponse:
    """Scan /workspaces for unregistered folders."""
    workspaces_path = pathlib.Path(WORKSPACES_ROOT)
    if not workspaces_path.exists():
        return ScanWorkspacesResponse(discovered=[])
    
    repo = WorkspaceRepository(db)
    registered_paths = set()
    all_workspaces = await repo.list_all()
    for ws in all_workspaces:
        registered_paths.add(ws.local_path)
    
    discovered = []
    for folder in workspaces_path.iterdir():
        if not folder.is_dir():
            continue
        
        repo_path = folder / "repo"
        if not repo_path.exists():
            continue
        
        path_str = str(repo_path)
        if path_str in registered_paths:
            continue
        
        # Check for git remote
        has_git = (repo_path / ".git").exists()
        git_remote = None
        suggested_name = folder.name
        
        if has_git:
            try:
                result = subprocess.run(
                    ["git", "remote", "get-url", "origin"],
                    cwd=str(repo_path),
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    git_remote = result.stdout.strip()
                    suggested_name = _derive_display_name("github", git_remote)
            except Exception:
                pass
        
        discovered.append(DiscoveredFolder(
            folder_name=folder.name,
            path=path_str,
            has_git=has_git,
            git_remote=git_remote,
            suggested_name=suggested_name
        ))
    
    return ScanWorkspacesResponse(discovered=discovered)


@app.post("/api/workspaces/import-local", response_model=WorkspaceResponse)
async def import_local_workspace(
    req: ImportLocalRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user_optional),
) -> WorkspaceResponse:
    """Import a manually copied local folder as a workspace."""
    folder_path = pathlib.Path(WORKSPACES_ROOT) / req.folder_name / "repo"
    
    if not folder_path.exists():
        raise HTTPException(status_code=400, detail=f"Folder not found: {req.folder_name}/repo")
    
    local_path = str(folder_path)
    _ensure_under_workspaces_root(local_path)
    
    repo = WorkspaceRepository(db)
    
    # Check if already registered by path
    all_workspaces = await repo.list_all()
    for ws in all_workspaces:
        if ws.local_path == local_path:
            return WorkspaceResponse(
                workspace_id=str(ws.id),
                display_name=ws.display_name,
                source_type=ws.source_type,
                source_uri=ws.source_uri,
                local_path=ws.local_path,
                created_at=_format_datetime(ws.created_at)
            )
    
    # Determine source info
    has_git = (folder_path / ".git").exists()
    git_remote = None
    source_type = "local"
    
    if has_git:
        try:
            result = subprocess.run(
                ["git", "remote", "get-url", "origin"],
                cwd=str(folder_path),
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                git_remote = result.stdout.strip()
                source_type = "github" if "github.com" in git_remote else "local"
        except Exception:
            pass
    
    source_uri = git_remote or local_path
    display_name = req.display_name or (
        _derive_display_name("github", git_remote) if git_remote 
        else req.folder_name
    )
    
    workspace = await repo.create(
        source_type=source_type,
        source_uri=source_uri,
        display_name=display_name,
        local_path=local_path,
        tenant_id=user.tenant_id if user else None,
    )
    
    return WorkspaceResponse(
        workspace_id=str(workspace.id),
        display_name=workspace.display_name,
        source_type=workspace.source_type,
        source_uri=workspace.source_uri,
        local_path=workspace.local_path,
        created_at=_format_datetime(workspace.created_at)
    )


@app.get("/api/workspaces", response_model=WorkspaceListResponse)
async def list_workspaces(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user_optional),
) -> WorkspaceListResponse:
    # Apply tenant-scoped filtering if user is authenticated
    query = select(Workspace).order_by(Workspace.created_at.desc())
    if user:
        query = tenant_filter(query, Workspace, user)
    result = await db.execute(query)
    workspaces = list(result.scalars().all())
    # Filter to only include workspaces whose folders still exist on disk
    items = [
        WorkspaceResponse(
            workspace_id=str(ws.id),
            display_name=ws.display_name,
            source_type=ws.source_type,
            source_uri=ws.source_uri,
            local_path=ws.local_path,
            created_at=_format_datetime(ws.created_at)
        )
        for ws in workspaces
        if pathlib.Path(ws.local_path).exists()
    ]
    return WorkspaceListResponse(items=items)


@app.get("/api/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    db: AsyncSession = Depends(get_db)
) -> WorkspaceResponse:
    repo = WorkspaceRepository(db)
    ws = await repo.get_by_id(uuid.UUID(workspace_id))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return WorkspaceResponse(
        workspace_id=str(ws.id),
        display_name=ws.display_name,
        source_type=ws.source_type,
        source_uri=ws.source_uri,
        local_path=ws.local_path,
        created_at=_format_datetime(ws.created_at)
    )


@app.delete("/api/workspaces/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a workspace and all associated sessions, runs, and events."""
    ws_repo = WorkspaceRepository(db)
    ws = await ws_repo.get_by_id(uuid.UUID(workspace_id))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Delete the workspace (cascade will handle sessions, runs, events)
    await ws_repo.delete(uuid.UUID(workspace_id))
    
    # Optionally delete local files (commented out for safety)
    # local_path = pathlib.Path(ws.local_path)
    # if local_path.exists():
    #     shutil.rmtree(local_path)
    
    return {"status": "deleted", "workspace_id": workspace_id}


@app.get("/api/workspaces/{workspace_id}/sessions", response_model=SessionListResponse)
async def list_workspace_sessions(
    workspace_id: str,
    db: AsyncSession = Depends(get_db)
) -> SessionListResponse:
    ws_repo = WorkspaceRepository(db)
    ws = await ws_repo.get_by_id(uuid.UUID(workspace_id))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    session_repo = SessionRepository(db)
    run_repo = RunRepository(db)
    sessions = await session_repo.list_by_workspace(uuid.UUID(workspace_id))
    
    items = []
    for s in sessions:
        runs = await run_repo.list_by_session(s.id)
        items.append(SessionResponse(
            session_id=str(s.id),
            workspace_id=str(s.workspace_id),
            runner_type=s.runner_type,
            thread_id=s.runner_thread_id,
            created_at=_format_datetime(s.created_at),
            run_count=len(runs)
        ))
    
    return SessionListResponse(items=items)


@app.post("/api/sessions", response_model=CreateSessionResponse)
async def create_session(
    req: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user_optional),
) -> CreateSessionResponse:
    ws_repo = WorkspaceRepository(db)
    session_repo = SessionRepository(db)
    
    workspace_id_uuid: Optional[uuid.UUID] = None
    
    if req.workspace_id:
        workspace = await ws_repo.get_by_id(uuid.UUID(req.workspace_id))
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        workspace_id_uuid = workspace.id
        repo_path = workspace.local_path
        await ws_repo.update_last_accessed(workspace.id)
    elif req.repo_url:
        temp_workspace_id = str(uuid.uuid4())
        repo_path = _workspace_dir_for_id(temp_workspace_id)
        repo_path = _ensure_under_workspaces_root(repo_path)

        parent = pathlib.Path(repo_path).parent
        parent.mkdir(parents=True, exist_ok=True)

        result = subprocess.run(
            ["git", "clone", "--depth", "1", req.repo_url, repo_path],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise HTTPException(status_code=400, detail=f"git clone failed: {result.stderr.strip()}")
        
        workspace = await ws_repo.create(
            source_type="github",
            source_uri=req.repo_url,
            display_name=_derive_display_name("github", req.repo_url),
            local_path=repo_path,
            tenant_id=user.tenant_id if user else None,
        )
        workspace_id_uuid = workspace.id
    else:
        raise HTTPException(status_code=400, detail="Either workspace_id or repo_url is required")

    runner_url = _get_runner_url(req.runner_type)

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{runner_url}/threads",
            json={"workingDirectory": repo_path, "skipGitRepoCheck": True},
        )
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"runner error: {r.text}")
        data = r.json()

    thread_id = data.get("threadId")
    if not thread_id:
        raise HTTPException(status_code=502, detail="runner did not return threadId")

    session = await session_repo.create(
        workspace_id=workspace_id_uuid,
        runner_type=req.runner_type,
        runner_thread_id=thread_id,
        working_directory=repo_path,
        tenant_id=user.tenant_id if user else None,
    )

    return CreateSessionResponse(
        session_id=str(session.id),
        repo_path=repo_path,
        thread_id=thread_id,
        runner_type=req.runner_type,
        workspace_id=str(workspace_id_uuid) if workspace_id_uuid else None
    )


@app.get("/api/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
) -> SessionResponse:
    session_repo = SessionRepository(db)
    run_repo = RunRepository(db)
    
    session = await session_repo.get_by_id(uuid.UUID(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    runs = await run_repo.list_by_session(session.id)
    
    return SessionResponse(
        session_id=str(session.id),
        workspace_id=str(session.workspace_id),
        runner_type=session.runner_type,
        thread_id=session.runner_thread_id,
        created_at=_format_datetime(session.created_at),
        run_count=len(runs)
    )


@app.get("/api/sessions/{session_id}/runs", response_model=RunListResponse)
async def list_session_runs(
    session_id: str,
    db: AsyncSession = Depends(get_db)
) -> RunListResponse:
    session_repo = SessionRepository(db)
    run_repo = RunRepository(db)
    
    session = await session_repo.get_by_id(uuid.UUID(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    runs = await run_repo.list_by_session(session.id)
    
    items = [
        RunResponse(
            run_id=str(r.id),
            session_id=str(r.session_id),
            prompt=r.prompt[:100] + "..." if len(r.prompt) > 100 else r.prompt,
            status=r.status,
            created_at=_format_datetime(r.created_at),
            completed_at=_format_datetime(r.completed_at) if r.completed_at else None
        )
        for r in runs
    ]
    
    return RunListResponse(items=items)


@app.post("/api/sessions/{session_id}/prompt", response_model=PromptResponse)
async def prompt(
    session_id: str,
    req: PromptRequest,
    db: AsyncSession = Depends(get_db)
) -> PromptResponse:
    session_repo = SessionRepository(db)
    run_repo = RunRepository(db)
    ws_repo = WorkspaceRepository(db)
    
    session = await session_repo.get_by_id(uuid.UUID(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="session not found")

    runner_type = session.runner_type
    runner_url = _get_runner_url(runner_type)
    thread_id = session.runner_thread_id

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{runner_url}/runs",
            json={"threadId": thread_id, "prompt": req.prompt},
        )
        
        # If thread not found (404), try to recreate it
        if r.status_code == 404 and "thread not found" in r.text.lower():
            # Get workspace path for thread recreation
            workspace = await ws_repo.get_by_id(session.workspace_id) if session.workspace_id else None
            if not workspace:
                raise HTTPException(status_code=502, detail="Session thread expired and workspace not found for recovery")
            
            # Recreate thread
            thread_r = await client.post(
                f"{runner_url}/threads",
                json={"workingDirectory": workspace.local_path, "skipGitRepoCheck": False},
            )
            if thread_r.status_code >= 400:
                raise HTTPException(status_code=502, detail=f"Failed to recreate thread: {thread_r.text}")
            
            new_thread_id = thread_r.json().get("threadId")
            if not new_thread_id:
                raise HTTPException(status_code=502, detail="Runner did not return threadId on recovery")
            
            # Update session with new thread ID
            await session_repo.update_thread_id(session.id, new_thread_id)
            thread_id = new_thread_id
            
            # Retry the run with new thread
            r = await client.post(
                f"{runner_url}/runs",
                json={"threadId": thread_id, "prompt": req.prompt},
            )
        
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"runner error: {r.text}")
        data = r.json()

    runner_run_id = data.get("runId")
    if not runner_run_id:
        raise HTTPException(status_code=502, detail="runner did not return runId")

    run = await run_repo.create(
        session_id=session.id,
        runner_run_id=runner_run_id,
        prompt=req.prompt
    )

    return PromptResponse(run_id=str(run.id))


@app.get("/api/runs/{run_id}", response_model=RunResponse)
async def get_run(
    run_id: str,
    db: AsyncSession = Depends(get_db)
) -> RunResponse:
    run_repo = RunRepository(db)
    run = await run_repo.get_by_id(uuid.UUID(run_id))
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    return RunResponse(
        run_id=str(run.id),
        session_id=str(run.session_id),
        prompt=run.prompt,
        status=run.status,
        created_at=_format_datetime(run.created_at),
        completed_at=_format_datetime(run.completed_at) if run.completed_at else None
    )


class RunDetailResponse(BaseModel):
    run_id: str
    prompt: str
    status: str
    created_at: str
    completed_at: Optional[str]
    events: list[dict]


@app.get("/api/runs/{run_id}/detail", response_model=RunDetailResponse)
async def get_run_detail(
    run_id: str,
    db: AsyncSession = Depends(get_db)
) -> RunDetailResponse:
    """Get run details including prompt and all persisted events."""
    run_repo = RunRepository(db)
    run = await run_repo.get_by_id(uuid.UUID(run_id))
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    events = await run_repo.get_events(run.id)
    
    return RunDetailResponse(
        run_id=str(run.id),
        prompt=run.prompt,
        status=run.status,
        created_at=run.created_at.isoformat(),
        completed_at=run.completed_at.isoformat() if run.completed_at else None,
        events=[{"at": int(e.at.timestamp() * 1000), "data": e.raw_json} for e in events]
    )


@app.get("/api/runs/{run_id}/transcript", response_model=TranscriptResponse)
async def get_run_transcript(
    run_id: str,
    db: AsyncSession = Depends(get_db)
) -> TranscriptResponse:
    run_repo = RunRepository(db)
    run = await run_repo.get_by_id(uuid.UUID(run_id))
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    events = await run_repo.get_events(run.id)
    
    messages: list[TranscriptMessage] = []
    current_assistant_text = ""
    
    for event in events:
        data = event.raw_json
        if not data or not isinstance(data, dict):
            continue
        
        event_type = data.get("type", "")
        
        if event_type == "ui.message.user":
            messages.append(TranscriptMessage(
                role="user",
                content=data.get("payload", {}).get("text", "")
            ))
        elif event_type == "ui.message.assistant.delta":
            current_assistant_text += data.get("payload", {}).get("textDelta", "")
        elif event_type == "ui.message.assistant.final":
            messages.append(TranscriptMessage(
                role="assistant",
                content=data.get("payload", {}).get("text", current_assistant_text)
            ))
            current_assistant_text = ""
        elif event_type == "ui.tool.call":
            payload = data.get("payload", {})
            messages.append(TranscriptMessage(
                role="tool",
                content=f"Calling {payload.get('toolName', 'unknown')}",
                tool_name=payload.get("toolName"),
                tool_input=payload.get("input")
            ))
        elif event_type == "ui.tool.result":
            payload = data.get("payload", {})
            messages.append(TranscriptMessage(
                role="tool",
                content=f"Result from {payload.get('toolName', 'unknown')}",
                tool_name=payload.get("toolName"),
                tool_output=payload.get("output")
            ))
    
    if current_assistant_text:
        messages.append(TranscriptMessage(
            role="assistant",
            content=current_assistant_text
        ))
    
    return TranscriptResponse(run_id=str(run.id), messages=messages)


@app.get("/api/runs/{run_id}/events")
async def run_events(
    run_id: str,
    db: AsyncSession = Depends(get_db)
) -> StreamingResponse:
    run_repo = RunRepository(db)
    session_repo = SessionRepository(db)
    
    run = await run_repo.get_by_id(uuid.UUID(run_id))
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    session = await session_repo.get_by_id(run.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    runner_type = session.runner_type
    runner_url = _get_runner_url(runner_type)
    runner_run_id = run.runner_run_id

    async def stream() -> AsyncIterator[bytes]:
        yield b": connected\n\n"
        seq = 0
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "GET",
                f"{runner_url}/runs/{runner_run_id}/events",
                headers={"Accept": "text/event-stream"},
            ) as r:
                if r.status_code >= 400:
                    yield f"data: {{\"type\":\"error\",\"message\":{r.text!r}}}\n\n".encode("utf-8")
                    return
                
                buffer = ""
                async for chunk in r.aiter_text():
                    buffer += chunk
                    while "\n\n" in buffer:
                        event_str, buffer = buffer.split("\n\n", 1)
                        yield (event_str + "\n\n").encode("utf-8")
                        
                        for line in event_str.split("\n"):
                            if line.startswith("data: "):
                                try:
                                    event_data = json.loads(line[6:])
                                    event_type = event_data.get("type")
                                    
                                    async with async_session_maker() as event_db:
                                        event_run_repo = RunRepository(event_db)
                                        await event_run_repo.add_event(
                                            run_id=run.id,
                                            seq=seq,
                                            event_type=event_type,
                                            raw_json=event_data
                                        )
                                        seq += 1
                                        
                                        if event_type in ("run.completed", "stream.closed"):
                                            await event_run_repo.update_status(
                                                run.id,
                                                "completed",
                                                datetime.now(timezone.utc)
                                            )
                                        elif event_type == "error":
                                            await event_run_repo.update_status(
                                                run.id,
                                                "error",
                                                datetime.now(timezone.utc)
                                            )
                                except json.JSONDecodeError:
                                    pass

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# Messages API (Chat Persistence)
# ─────────────────────────────────────────────────────────────────────────────

def _format_datetime(dt: datetime) -> str:
    return dt.isoformat() if dt else None


@app.get("/api/sessions/{session_id}/messages", response_model=MessageListResponse)
async def list_messages(
    session_id: str,
    db: AsyncSession = Depends(get_db)
) -> MessageListResponse:
    """Get all messages for a session (chat history)."""
    session_repo = SessionRepository(db)
    session = await session_repo.get_by_id(uuid.UUID(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    message_repo = MessageRepository(db)
    messages = await message_repo.list_by_session(uuid.UUID(session_id))
    
    items = [
        MessageResponse(
            message_id=str(msg.id),
            session_id=str(msg.session_id),
            run_id=str(msg.run_id) if msg.run_id else None,
            role=msg.role,
            content=msg.content,
            metadata=msg.metadata_json,
            created_at=_format_datetime(msg.created_at)
        )
        for msg in messages
    ]
    return MessageListResponse(items=items)


@app.post("/api/sessions/{session_id}/messages", response_model=MessageResponse)
async def create_message(
    session_id: str,
    req: CreateMessageRequest,
    db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    """Create a new message in a session (for chat persistence)."""
    session_repo = SessionRepository(db)
    session = await session_repo.get_by_id(uuid.UUID(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    message_repo = MessageRepository(db)
    message = await message_repo.create(
        session_id=uuid.UUID(session_id),
        role=req.role,
        content=req.content,
        run_id=uuid.UUID(req.run_id) if req.run_id else None,
        metadata_json=req.metadata
    )
    
    return MessageResponse(
        message_id=str(message.id),
        session_id=str(message.session_id),
        run_id=str(message.run_id) if message.run_id else None,
        role=message.role,
        content=message.content,
        metadata=message.metadata_json,
        created_at=_format_datetime(message.created_at)
    )


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard Stats API
# ─────────────────────────────────────────────────────────────────────────────

class DashboardStatsResponse(BaseModel):
    workspaces_count: int
    sessions_count: int
    runs_today: int
    runs_total: int
    recent_activity: list[dict]


class ServiceHealthResponse(BaseModel):
    service: str
    status: str
    latency_ms: Optional[int]


class SystemHealthResponse(BaseModel):
    services: list[ServiceHealthResponse]


@app.get("/api/stats/dashboard", response_model=DashboardStatsResponse)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)) -> DashboardStatsResponse:
    """Get aggregated dashboard statistics."""
    from sqlalchemy import select, func
    from .models import Workspace, Session, Run
    
    # Count workspaces (only those with existing folders)
    workspaces_result = await db.execute(select(Workspace))
    all_workspaces = workspaces_result.scalars().all()
    workspaces_count = sum(1 for ws in all_workspaces if pathlib.Path(ws.local_path).exists())
    
    # Count sessions
    sessions_result = await db.execute(select(func.count(Session.id)))
    sessions_count = sessions_result.scalar() or 0
    
    # Count runs today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    runs_today_result = await db.execute(
        select(func.count(Run.id)).where(Run.created_at >= today_start)
    )
    runs_today = runs_today_result.scalar() or 0
    
    # Count total runs
    runs_total_result = await db.execute(select(func.count(Run.id)))
    runs_total = runs_total_result.scalar() or 0
    
    # Recent activity (last 10 runs)
    recent_runs_result = await db.execute(
        select(Run, Session, Workspace)
        .join(Session, Run.session_id == Session.id)
        .join(Workspace, Session.workspace_id == Workspace.id)
        .order_by(Run.created_at.desc())
        .limit(10)
    )
    recent_activity = []
    for run, session, workspace in recent_runs_result.all():
        recent_activity.append({
            "type": "run",
            "status": run.status,
            "workspace_name": workspace.display_name,
            "runner_type": session.runner_type,
            "prompt_preview": run.prompt[:50] + "..." if len(run.prompt) > 50 else run.prompt,
            "created_at": _format_datetime(run.created_at)
        })
    
    return DashboardStatsResponse(
        workspaces_count=workspaces_count,
        sessions_count=sessions_count,
        runs_today=runs_today,
        runs_total=runs_total,
        recent_activity=recent_activity
    )


@app.get("/api/health/services", response_model=SystemHealthResponse)
async def get_system_health(db: AsyncSession = Depends(get_db)) -> SystemHealthResponse:
    """Check health of all backend services."""
    services = []
    
    async def check_service(name: str, url: str) -> ServiceHealthResponse:
        try:
            start = datetime.now()
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get(f"{url}/health")
                latency = int((datetime.now() - start).total_seconds() * 1000)
                if r.status_code == 200:
                    return ServiceHealthResponse(service=name, status="healthy", latency_ms=latency)
                else:
                    return ServiceHealthResponse(service=name, status="unhealthy", latency_ms=latency)
        except Exception:
            return ServiceHealthResponse(service=name, status="unreachable", latency_ms=None)
    
    # Check all services
    checks = await asyncio.gather(
        check_service("codex_runner", RUNNER_CODEX_URL),
        check_service("claude_runner", RUNNER_CLAUDE_URL),
    )
    services.append(ServiceHealthResponse(service="backend", status="healthy", latency_ms=1))
    services.extend(checks)
    
    # Check database
    try:
        from sqlalchemy import text
        await db.execute(text("SELECT 1"))
        services.append(ServiceHealthResponse(service="database", status="healthy", latency_ms=1))
    except Exception:
        services.append(ServiceHealthResponse(service="database", status="unhealthy", latency_ms=None))
    
    return SystemHealthResponse(services=services)


# ─────────────────────────────────────────────────────────────────────────────
# v0.5.0 File Operations API
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import File, UploadFile, Form
from fastapi.responses import FileResponse
from .services import file_service


class FileInfo(BaseModel):
    name: str
    path: str
    type: str  # file or directory
    size: Optional[int]
    modified_at: str


class FileListResponse(BaseModel):
    workspace_id: str
    current_path: str
    parent_path: Optional[str]
    items: list[FileInfo]


class FileContentResponse(BaseModel):
    name: str
    path: str
    type: str
    size: int
    modified_at: str
    content: Optional[str]
    content_type: str
    is_binary: bool


@app.get("/api/workspaces/{workspace_id}/files", response_model=FileListResponse)
async def list_workspace_files(
    workspace_id: str,
    path: str = "/",
    db: AsyncSession = Depends(get_db)
) -> FileListResponse:
    """List files and directories at a given path within a workspace."""
    ws_repo = WorkspaceRepository(db)
    ws = await ws_repo.get_by_id(uuid.UUID(workspace_id))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    result = file_service.list_directory(ws.local_path, path)
    
    return FileListResponse(
        workspace_id=workspace_id,
        current_path=result["current_path"],
        parent_path=result["parent_path"],
        items=[FileInfo(**item) for item in result["items"]]
    )


@app.get("/api/workspaces/{workspace_id}/files/view", response_model=FileContentResponse)
async def view_workspace_file(
    workspace_id: str,
    path: str,
    db: AsyncSession = Depends(get_db)
) -> FileContentResponse:
    """View file content for text-based files."""
    ws_repo = WorkspaceRepository(db)
    ws = await ws_repo.get_by_id(uuid.UUID(workspace_id))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    result = file_service.get_file_content(ws.local_path, path)
    
    return FileContentResponse(**result)


@app.get("/api/workspaces/{workspace_id}/files/download")
async def download_workspace_file(
    workspace_id: str,
    path: str,
    db: AsyncSession = Depends(get_db)
) -> FileResponse:
    """Download a single file from workspace."""
    ws_repo = WorkspaceRepository(db)
    ws = await ws_repo.get_by_id(uuid.UUID(workspace_id))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    file_path, filename = file_service.get_file_for_download(ws.local_path, path)
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/octet-stream"
    )


@app.get("/api/workspaces/{workspace_id}/files/download-zip")
async def download_workspace_folder_zip(
    workspace_id: str,
    path: str = "/",
    db: AsyncSession = Depends(get_db)
) -> StreamingResponse:
    """Download a folder as a ZIP archive."""
    ws_repo = WorkspaceRepository(db)
    ws = await ws_repo.get_by_id(uuid.UUID(workspace_id))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    buffer, filename = file_service.create_zip_from_directory(ws.local_path, path)
    
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@app.post("/api/workspaces/{workspace_id}/files/upload")
async def upload_file_to_workspace(
    workspace_id: str,
    path: str = Form("/"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
) -> FileInfo:
    """Upload a file to a workspace directory."""
    ws_repo = WorkspaceRepository(db)
    ws = await ws_repo.get_by_id(uuid.UUID(workspace_id))
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    content = await file.read()
    result = file_service.save_uploaded_file(ws.local_path, path, file.filename, content)
    
    return FileInfo(**result)


@app.post("/api/workspaces/upload", response_model=WorkspaceResponse)
async def upload_workspace(
    file: UploadFile = File(...),
    display_name: str = Form(...),
    db: AsyncSession = Depends(get_db)
) -> WorkspaceResponse:
    """
    Upload a zipped folder as a new workspace.
    
    - Maximum size: 1GB
    - Extracts to /workspaces/{workspace_id}/repo/
    - Registers with source_type="upload"
    """
    # Read file content
    content = await file.read()
    
    # Validate size
    if len(content) > file_service.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Upload too large. Maximum size: {file_service.MAX_UPLOAD_SIZE // 1024 // 1024 // 1024}GB"
        )
    
    # Generate workspace ID and path
    workspace_id = str(uuid.uuid4())
    local_path = _workspace_dir_for_id(workspace_id)
    local_path = _ensure_under_workspaces_root(local_path)
    
    # Extract ZIP
    file_count = file_service.extract_uploaded_workspace(content, local_path)
    
    # Create workspace record
    repo = WorkspaceRepository(db)
    source_uri = f"upload://{display_name}"
    
    workspace = await repo.create(
        source_type="upload",
        source_uri=source_uri,
        display_name=display_name,
        local_path=local_path
    )
    
    return WorkspaceResponse(
        workspace_id=str(workspace.id),
        display_name=workspace.display_name,
        source_type=workspace.source_type,
        source_uri=workspace.source_uri,
        local_path=workspace.local_path,
        created_at=_format_datetime(workspace.created_at)
    )
