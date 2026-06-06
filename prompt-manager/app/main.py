import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from .database import engine, Base, get_db, async_session_maker
from .models import PromptTemplate
from .routers import templates_router, skills_router, usage_router, categories_router
from .auth import CurrentUser, require_admin

logger = logging.getLogger("prompt-manager")


async def _auto_seed():
    """Seed platform templates if the database is empty."""
    async with async_session_maker() as db:
        count = (await db.execute(select(func.count()).select_from(PromptTemplate))).scalar() or 0
        if count > 0:
            logger.info(f"Database has {count} templates, skipping seed.")
            return

        logger.info("Empty database detected — seeding platform templates...")
        from .seeds import SEED_TEMPLATES
        from .repositories.template_repo import TemplateRepository
        import uuid

        repo = TemplateRepository(db)
        # Use a deterministic "system" owner ID for seeds
        system_owner = "00000000-0000-0000-0000-000000000001"
        for tpl in SEED_TEMPLATES:
            try:
                data = dict(tpl)
                data["variables"] = [v if isinstance(v, dict) else v for v in data.get("variables", [])]
                await repo.create(data, owner_id=system_owner, tenant_id=None)
            except Exception as e:
                logger.warning(f"Failed to seed template '{tpl.get('name')}': {e}")
        logger.info(f"Seeded {len(SEED_TEMPLATES)} platform templates.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (Alembic is preferred for production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Auto-seed if empty
    await _auto_seed()
    yield


app = FastAPI(title="Prompt & Skills Manager", version="0.7.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(templates_router)
app.include_router(skills_router)
app.include_router(usage_router)
app.include_router(categories_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "prompt-skills-manager", "version": "0.7.0"}
