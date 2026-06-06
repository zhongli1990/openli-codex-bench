"""Skills Management API for admin CRUD operations."""

import os
import re
import yaml
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/skills", tags=["skills"])

# Skills directories
PLATFORM_SKILLS_DIR = Path("/app/skills")
WORKSPACE_SKILLS_BASE = Path("/workspaces")


class SkillMetadata(BaseModel):
    """Skill metadata from YAML frontmatter."""
    name: str
    description: str
    allowed_tools: Optional[str] = Field(None, alias="allowed-tools")
    user_invocable: bool = Field(True, alias="user-invocable")
    version: str = "1.0"
    last_modified: Optional[str] = Field(None, alias="last-modified")
    modified_by: Optional[str] = Field(None, alias="modified-by")
    
    class Config:
        populate_by_name = True


class SkillFile(BaseModel):
    """Supporting file in a skill directory."""
    path: str
    content: str


class SkillResponse(BaseModel):
    """Full skill response."""
    name: str
    description: str
    scope: str  # platform, tenant, project
    content: str  # Full SKILL.md content
    version: str
    last_modified: Optional[str] = None
    modified_by: Optional[str] = None
    files: List[SkillFile] = []


class SkillListItem(BaseModel):
    """Skill list item (summary)."""
    name: str
    description: str
    scope: str
    version: str
    last_modified: Optional[str] = None
    modified_by: Optional[str] = None
    tenant_id: Optional[str] = None
    project_id: Optional[str] = None


class CreateSkillRequest(BaseModel):
    """Request to create a new skill."""
    name: str = Field(..., pattern=r"^[a-z0-9-]+$", max_length=64)
    description: str = Field(..., max_length=1024)
    content: str  # SKILL.md body content (without frontmatter)
    scope: str = "platform"  # platform, tenant, project
    tenant_id: Optional[str] = None
    project_id: Optional[str] = None
    allowed_tools: Optional[str] = None
    user_invocable: bool = True


class UpdateSkillRequest(BaseModel):
    """Request to update a skill."""
    description: Optional[str] = Field(None, max_length=1024)
    content: Optional[str] = None
    allowed_tools: Optional[str] = None
    user_invocable: Optional[bool] = None
    change_summary: str = "Updated skill"


def parse_skill_frontmatter(content: str) -> tuple[dict, str]:
    """Parse YAML frontmatter from SKILL.md content."""
    if not content.startswith("---"):
        return {}, content
    
    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content
    
    try:
        frontmatter = yaml.safe_load(parts[1])
        body = parts[2].strip()
        return frontmatter or {}, body
    except yaml.YAMLError:
        return {}, content


def build_skill_content(metadata: dict, body: str) -> str:
    """Build SKILL.md content from metadata and body."""
    frontmatter = yaml.dump(metadata, default_flow_style=False, allow_unicode=True)
    return f"---\n{frontmatter}---\n\n{body}"


def get_skill_dir(name: str, scope: str, tenant_id: Optional[str] = None, project_id: Optional[str] = None) -> Path:
    """Get the directory path for a skill."""
    if scope == "platform":
        return PLATFORM_SKILLS_DIR / name
    elif scope == "tenant" and tenant_id:
        return WORKSPACE_SKILLS_BASE / tenant_id / ".claude" / "skills" / name
    elif scope == "project" and tenant_id and project_id:
        return WORKSPACE_SKILLS_BASE / tenant_id / project_id / ".claude" / "skills" / name
    else:
        raise ValueError(f"Invalid scope or missing IDs: scope={scope}")


def load_skill(skill_dir: Path, scope: str, tenant_id: Optional[str] = None, project_id: Optional[str] = None) -> Optional[SkillResponse]:
    """Load a skill from its directory."""
    skill_file = skill_dir / "SKILL.md"
    if not skill_file.exists():
        return None
    
    content = skill_file.read_text()
    frontmatter, body = parse_skill_frontmatter(content)
    
    # Load supporting files
    files = []
    for root, dirs, filenames in os.walk(skill_dir):
        # Skip the root SKILL.md
        for filename in filenames:
            if filename == "SKILL.md" and root == str(skill_dir):
                continue
            file_path = Path(root) / filename
            rel_path = file_path.relative_to(skill_dir)
            try:
                files.append(SkillFile(
                    path=str(rel_path),
                    content=file_path.read_text()
                ))
            except Exception:
                pass  # Skip binary files
    
    return SkillResponse(
        name=frontmatter.get("name", skill_dir.name),
        description=frontmatter.get("description", ""),
        scope=scope,
        content=content,
        version=str(frontmatter.get("version", "1.0")),
        last_modified=frontmatter.get("last-modified"),
        modified_by=frontmatter.get("modified-by"),
        files=files
    )


def list_skills_in_dir(base_dir: Path, scope: str, tenant_id: Optional[str] = None, project_id: Optional[str] = None) -> List[SkillListItem]:
    """List all skills in a directory."""
    skills = []
    if not base_dir.exists():
        return skills
    
    for skill_dir in base_dir.iterdir():
        if not skill_dir.is_dir():
            continue
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.exists():
            continue
        
        content = skill_file.read_text()
        frontmatter, _ = parse_skill_frontmatter(content)
        
        skills.append(SkillListItem(
            name=frontmatter.get("name", skill_dir.name),
            description=frontmatter.get("description", ""),
            scope=scope,
            version=str(frontmatter.get("version", "1.0")),
            last_modified=frontmatter.get("last-modified"),
            modified_by=frontmatter.get("modified-by"),
            tenant_id=tenant_id,
            project_id=project_id
        ))
    
    return skills


@router.get("", response_model=List[SkillListItem])
async def list_skills(
    scope: Optional[str] = Query(None, description="Filter by scope: platform, tenant, project"),
    tenant_id: Optional[str] = Query(None, description="Tenant ID for tenant/project skills"),
    project_id: Optional[str] = Query(None, description="Project ID for project skills")
):
    """List all skills, optionally filtered by scope."""
    skills = []
    
    # Platform skills
    if scope is None or scope == "platform":
        skills.extend(list_skills_in_dir(PLATFORM_SKILLS_DIR, "platform"))
    
    # Tenant skills
    if (scope is None or scope == "tenant") and tenant_id:
        tenant_skills_dir = WORKSPACE_SKILLS_BASE / tenant_id / ".claude" / "skills"
        skills.extend(list_skills_in_dir(tenant_skills_dir, "tenant", tenant_id=tenant_id))
    
    # Project skills
    if (scope is None or scope == "project") and tenant_id and project_id:
        project_skills_dir = WORKSPACE_SKILLS_BASE / tenant_id / project_id / ".claude" / "skills"
        skills.extend(list_skills_in_dir(project_skills_dir, "project", tenant_id=tenant_id, project_id=project_id))
    
    return skills


@router.get("/{name}", response_model=SkillResponse)
async def get_skill(
    name: str,
    scope: str = Query("platform", description="Skill scope: platform, tenant, project"),
    tenant_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None)
):
    """Get a skill by name."""
    try:
        skill_dir = get_skill_dir(name, scope, tenant_id, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    skill = load_skill(skill_dir, scope, tenant_id, project_id)
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Skill '{name}' not found")
    
    return skill


@router.post("", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
async def create_skill(request: CreateSkillRequest):
    """Create a new skill."""
    # Validate name
    if not re.match(r"^[a-z0-9-]+$", request.name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skill name must contain only lowercase letters, numbers, and hyphens"
        )
    
    try:
        skill_dir = get_skill_dir(request.name, request.scope, request.tenant_id, request.project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    # Check if skill already exists
    if skill_dir.exists():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Skill '{request.name}' already exists"
        )
    
    # Create skill directory
    skill_dir.mkdir(parents=True, exist_ok=True)
    
    # Build metadata
    now = datetime.now(timezone.utc).isoformat()
    metadata = {
        "name": request.name,
        "description": request.description,
        "user-invocable": request.user_invocable,
        "version": "1.0",
        "last-modified": now,
        "modified-by": "admin",  # TODO: Get from auth context
        "changelog": [
            {
                "version": "1.0",
                "date": now[:10],
                "author": "admin",
                "changes": "Initial version"
            }
        ]
    }
    if request.allowed_tools:
        metadata["allowed-tools"] = request.allowed_tools
    
    # Write SKILL.md
    content = build_skill_content(metadata, request.content)
    (skill_dir / "SKILL.md").write_text(content)
    
    return load_skill(skill_dir, request.scope, request.tenant_id, request.project_id)


@router.put("/{name}", response_model=SkillResponse)
async def update_skill(
    name: str,
    request: UpdateSkillRequest,
    scope: str = Query("platform"),
    tenant_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None)
):
    """Update an existing skill."""
    try:
        skill_dir = get_skill_dir(name, scope, tenant_id, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    skill_file = skill_dir / "SKILL.md"
    if not skill_file.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Skill '{name}' not found")
    
    # Load existing content
    existing_content = skill_file.read_text()
    frontmatter, body = parse_skill_frontmatter(existing_content)
    
    # Update metadata
    now = datetime.now(timezone.utc).isoformat()
    old_version = frontmatter.get("version", "1.0")
    
    # Increment version
    try:
        major, minor = old_version.split(".")
        new_version = f"{major}.{int(minor) + 1}"
    except:
        new_version = "1.1"
    
    if request.description:
        frontmatter["description"] = request.description
    if request.allowed_tools is not None:
        frontmatter["allowed-tools"] = request.allowed_tools
    if request.user_invocable is not None:
        frontmatter["user-invocable"] = request.user_invocable
    
    frontmatter["version"] = new_version
    frontmatter["last-modified"] = now
    frontmatter["modified-by"] = "admin"  # TODO: Get from auth context
    
    # Add to changelog
    changelog = frontmatter.get("changelog", [])
    changelog.insert(0, {
        "version": new_version,
        "date": now[:10],
        "author": "admin",
        "changes": request.change_summary
    })
    frontmatter["changelog"] = changelog[:10]  # Keep last 10 versions
    
    # Update body if provided
    if request.content is not None:
        body = request.content
    
    # Write updated content
    content = build_skill_content(frontmatter, body)
    skill_file.write_text(content)
    
    return load_skill(skill_dir, scope, tenant_id, project_id)


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(
    name: str,
    scope: str = Query("platform"),
    tenant_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None)
):
    """Delete a skill."""
    try:
        skill_dir = get_skill_dir(name, scope, tenant_id, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    if not skill_dir.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Skill '{name}' not found")
    
    # Remove directory and all contents
    import shutil
    shutil.rmtree(skill_dir)


@router.post("/{name}/reload", status_code=status.HTTP_200_OK)
async def reload_skill(
    name: str,
    scope: str = Query("platform"),
    tenant_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None)
):
    """Reload a skill (trigger re-read on next agent run)."""
    try:
        skill_dir = get_skill_dir(name, scope, tenant_id, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    if not skill_dir.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Skill '{name}' not found")
    
    # Skills are loaded fresh on each agent run, so this is a no-op
    # In a more complex system, this could invalidate a cache
    return {"status": "ok", "message": f"Skill '{name}' will be reloaded on next agent run"}


@router.post("/{name}/files", response_model=SkillFile, status_code=status.HTTP_201_CREATED)
async def add_skill_file(
    name: str,
    file: SkillFile,
    scope: str = Query("platform"),
    tenant_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None)
):
    """Add a supporting file to a skill."""
    try:
        skill_dir = get_skill_dir(name, scope, tenant_id, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    if not skill_dir.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Skill '{name}' not found")
    
    # Validate path (no traversal)
    if ".." in file.path or file.path.startswith("/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file path")
    
    file_path = skill_dir / file.path
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(file.content)
    
    return file


@router.delete("/{name}/files/{file_path:path}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill_file(
    name: str,
    file_path: str,
    scope: str = Query("platform"),
    tenant_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None)
):
    """Delete a supporting file from a skill."""
    try:
        skill_dir = get_skill_dir(name, scope, tenant_id, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    if not skill_dir.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Skill '{name}' not found")
    
    # Validate path
    if ".." in file_path or file_path.startswith("/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file path")
    
    full_path = skill_dir / file_path
    if not full_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"File '{file_path}' not found")
    
    full_path.unlink()
