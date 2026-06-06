import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Variable definition
# ─────────────────────────────────────────────────────────────────────────────

class VariableDefinition(BaseModel):
    name: str
    type: str = "string"  # string, text, number, date, enum, boolean
    description: str = ""
    default: Optional[str] = None
    required: bool = True
    options: Optional[list[str]] = None  # for enum type


# ─────────────────────────────────────────────────────────────────────────────
# Prompt Templates
# ─────────────────────────────────────────────────────────────────────────────

class CreateTemplateRequest(BaseModel):
    name: str
    description: str = ""
    category: str
    subcategory: Optional[str] = None
    tags: list[str] = []
    template_body: str
    variables: list[VariableDefinition] = []
    sample_values: dict[str, str] = {}
    compatible_models: list[str] = []
    tested_models: list[str] = []
    recommended_model: Optional[str] = None
    visibility: str = "private"
    status: str = "draft"


class UpdateTemplateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    tags: Optional[list[str]] = None
    template_body: Optional[str] = None
    variables: Optional[list[VariableDefinition]] = None
    sample_values: Optional[dict[str, str]] = None
    compatible_models: Optional[list[str]] = None
    tested_models: Optional[list[str]] = None
    recommended_model: Optional[str] = None
    visibility: Optional[str] = None
    status: Optional[str] = None
    change_summary: Optional[str] = None


class TemplateResponse(BaseModel):
    id: str
    tenant_id: Optional[str] = None
    owner_id: str
    name: str
    slug: str
    description: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    tags: list = []
    template_body: str
    variables: list = []
    sample_values: dict = {}
    compatible_models: list = []
    tested_models: list = []
    recommended_model: Optional[str] = None
    version: int
    is_latest: bool
    parent_id: Optional[str] = None
    change_summary: Optional[str] = None
    status: str
    visibility: str
    created_at: str
    updated_at: str
    published_at: Optional[str] = None
    usage_count: int = 0

    model_config = {"from_attributes": True}


class TemplateListResponse(BaseModel):
    items: list[TemplateResponse]
    total: int


class RenderRequest(BaseModel):
    variables: dict[str, str]


class RenderResponse(BaseModel):
    rendered: str
    template_id: str
    template_name: str
    variables_used: dict[str, str]


# ─────────────────────────────────────────────────────────────────────────────
# Skills
# ─────────────────────────────────────────────────────────────────────────────

class SupportingFile(BaseModel):
    path: str
    content: str


class CreateSkillRequest(BaseModel):
    name: str
    description: str = ""
    category: str
    subcategory: Optional[str] = None
    tags: list[str] = []
    scope: str = "platform"
    skill_content: str
    allowed_tools: Optional[str] = None
    user_invocable: bool = True
    supporting_files: list[SupportingFile] = []
    compatible_models: list[str] = []
    tested_models: list[str] = []
    recommended_model: Optional[str] = None
    visibility: str = "private"
    status: str = "draft"
    workspace_id: Optional[str] = None


class UpdateSkillRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    tags: Optional[list[str]] = None
    scope: Optional[str] = None
    skill_content: Optional[str] = None
    allowed_tools: Optional[str] = None
    user_invocable: Optional[bool] = None
    supporting_files: Optional[list[SupportingFile]] = None
    compatible_models: Optional[list[str]] = None
    tested_models: Optional[list[str]] = None
    recommended_model: Optional[str] = None
    visibility: Optional[str] = None
    status: Optional[str] = None
    enabled: Optional[bool] = None
    change_summary: Optional[str] = None


class SkillResponse(BaseModel):
    id: str
    tenant_id: Optional[str] = None
    owner_id: str
    name: str
    slug: str
    description: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    tags: list = []
    scope: str
    skill_content: str
    allowed_tools: Optional[str] = None
    user_invocable: bool
    supporting_files: list = []
    compatible_models: list = []
    tested_models: list = []
    recommended_model: Optional[str] = None
    version: int
    is_latest: bool
    parent_id: Optional[str] = None
    change_summary: Optional[str] = None
    status: str
    visibility: str
    enabled: bool
    workspace_id: Optional[str] = None
    created_at: str
    updated_at: str
    published_at: Optional[str] = None

    model_config = {"from_attributes": True}


class SkillListResponse(BaseModel):
    items: list[SkillResponse]
    total: int


# ─────────────────────────────────────────────────────────────────────────────
# Usage
# ─────────────────────────────────────────────────────────────────────────────

class LogUsageRequest(BaseModel):
    template_id: Optional[str] = None
    skill_id: Optional[str] = None
    session_id: Optional[str] = None
    rendered_prompt: Optional[str] = None
    variables_used: Optional[dict] = None
    model_used: Optional[str] = None


class UsageStatsResponse(BaseModel):
    total_uses: int
    templates_used: int
    skills_used: int
    top_templates: list[dict] = []
    top_skills: list[dict] = []


# ─────────────────────────────────────────────────────────────────────────────
# Categories
# ─────────────────────────────────────────────────────────────────────────────

class CategoryResponse(BaseModel):
    name: str
    template_count: int = 0
    skill_count: int = 0
