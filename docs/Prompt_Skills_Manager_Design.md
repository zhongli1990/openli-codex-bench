# Prompt & Skills Manager - Full-Stack Design

**Version**: v0.7.0 (Draft)
**Last Updated**: Feb 9, 2026
**Branch**: `feature/prompt-skills-manager`
**Status**: Design Phase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Decision](#2-architecture-decision)
3. [Database Schema](#3-database-schema)
4. [Backend API Design](#4-backend-api-design)
5. [Frontend UI/UX Design](#5-frontend-uiux-design)
6. [Agent Tab Integration](#6-agent-tab-integration)
7. [RBAC & Multi-Tenancy](#7-rbac--multi-tenancy)
8. [Implementation Plan](#8-implementation-plan)

---

## 1. Executive Summary

### Problem

The current `prompt-manager` microservice is a **placeholder** with in-memory storage and no persistence, versioning, or multi-tenant support. Skills are file-based in `claude-runner/skills/` with no database backing, no ownership, and no sharing across teams. NHS Trust users need a professional-grade system to:

- Create, version, and share parameterised prompt templates across teams
- Manage Skills with proper ownership, categories, and lifecycle
- Use prompt templates directly from the Agent Console with variable substitution
- Enforce RBAC so only authorised users can create/edit/share templates

### Solution

Upgrade the existing `prompt-manager` Docker service into a **standalone microservice** with:

- PostgreSQL persistence (shared DB, own schema/tables)
- Full CRUD + versioning for Prompt Templates and Skills
- Multi-tenant ownership linked to existing RBAC users
- REST API consumed by the existing frontend portal
- UI tabs embedded in the current portal (not a separate microfrontend)

### Why Not a Separate Microfrontend?

| Approach | Pros | Cons |
|----------|------|------|
| **Embedded tabs (chosen)** | Shared auth, consistent UX, simpler deployment | Tighter coupling |
| Separate microfrontend | Independent deployment | Separate auth, CORS, iframe/module-federation complexity |

**Decision**: Embed in existing portal. The prompt-manager backend is already a separate Docker service. The frontend tabs reuse the existing Next.js proxy pattern (`/api/prompt-manager/*` → `http://prompt-manager:8083/*`). This keeps auth unified and deployment simple. It can be extracted later if needed.

---

## 2. Architecture Decision

### 2.1 Service Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Docker Compose                                   │
│                                                                          │
│  ┌──────────┐    ┌──────────┐    ┌────────────────────┐                 │
│  │ Frontend  │───▶│ Backend  │    │  Prompt Manager    │                 │
│  │ (Next.js) │    │ (FastAPI)│    │  (FastAPI)         │                 │
│  │ :9100     │    │ :9101    │    │  :9105 (8083)      │                 │
│  └──────┬───┘    └──────────┘    └────────┬───────────┘                 │
│         │                                  │                             │
│         │  /api/prompt-manager/*           │                             │
│         └─────────────────────────────────▶│                             │
│                                            │                             │
│                    ┌───────────┐           │                             │
│                    │ PostgreSQL│◀──────────┘                             │
│                    │ :9103     │                                          │
│                    └───────────┘                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Database** | Shared PostgreSQL, own tables | Avoids second DB, prompt-manager connects to same `saas` DB |
| **Auth** | JWT token forwarding from frontend | Frontend passes `Authorization` header; prompt-manager validates same JWT |
| **ORM** | SQLAlchemy 2.0 async | Consistent with backend service |
| **Migrations** | Alembic (own migration chain) | Independent versioning from backend |
| **Frontend** | Embedded tabs in existing portal | Shared auth context, consistent UX |

---

## 3. Database Schema

### 3.1 Prompt Templates Table

```sql
CREATE TABLE prompt_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID REFERENCES tenants(id),          -- NULL = platform-wide
    owner_id        UUID REFERENCES users(id) NOT NULL,   -- creator
    
    -- Identity
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL,                 -- URL-friendly name
    description     TEXT,
    
    -- Classification
    category        VARCHAR(100) NOT NULL,                 -- e.g. 'sales', 'pm', 'architecture'
    subcategory     VARCHAR(100),                          -- e.g. 'nhs-bid', 'enterprise'
    tags            JSONB DEFAULT '[]',                    -- free-form tags
    
    -- Content
    template_body   TEXT NOT NULL,                         -- parameterised template with {{variables}}
    variables       JSONB DEFAULT '[]',                    -- [{name, type, description, default, required}]
    sample_values   JSONB DEFAULT '{}',                    -- {var_name: sample_value} for preview
    
    -- Model Compatibility
    compatible_models JSONB DEFAULT '[]',                  -- ['claude-sonnet-4', 'codex', ...]
    tested_models     JSONB DEFAULT '[]',                  -- models actually tested against
    recommended_model VARCHAR(100),                        -- best model for this template
    
    -- Versioning
    version         INTEGER NOT NULL DEFAULT 1,
    is_latest       BOOLEAN NOT NULL DEFAULT TRUE,
    parent_id       UUID REFERENCES prompt_templates(id),  -- previous version
    change_summary  TEXT,                                   -- what changed in this version
    
    -- Lifecycle
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft, published, archived, deprecated
    visibility      VARCHAR(20) NOT NULL DEFAULT 'private', -- private, team, tenant, public
    
    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at    TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE(tenant_id, slug, version),
    CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived', 'deprecated')),
    CONSTRAINT valid_visibility CHECK (visibility IN ('private', 'team', 'tenant', 'public'))
);

CREATE INDEX ix_prompt_template_tenant ON prompt_templates(tenant_id);
CREATE INDEX ix_prompt_template_owner ON prompt_templates(owner_id);
CREATE INDEX ix_prompt_template_category ON prompt_templates(category);
CREATE INDEX ix_prompt_template_status ON prompt_templates(status);
CREATE INDEX ix_prompt_template_slug ON prompt_templates(slug);
CREATE INDEX ix_prompt_template_latest ON prompt_templates(slug, is_latest) WHERE is_latest = TRUE;
```

### 3.2 Skills Table

```sql
CREATE TABLE skills (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID REFERENCES tenants(id),          -- NULL = platform-wide
    owner_id        UUID REFERENCES users(id) NOT NULL,
    
    -- Identity
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL,
    description     TEXT,
    
    -- Classification
    category        VARCHAR(100) NOT NULL,                 -- 'sales', 'pm', 'architecture', 'qa', etc.
    subcategory     VARCHAR(100),
    tags            JSONB DEFAULT '[]',
    scope           VARCHAR(20) NOT NULL DEFAULT 'platform', -- platform, tenant, project
    
    -- Content
    skill_content   TEXT NOT NULL,                         -- SKILL.md content (with YAML frontmatter)
    allowed_tools   TEXT,                                  -- e.g. 'Read, Write, Bash(python scripts/*:*)'
    user_invocable  BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Supporting Files
    supporting_files JSONB DEFAULT '[]',                   -- [{path, content}]
    
    -- Model Compatibility
    compatible_models JSONB DEFAULT '[]',
    tested_models     JSONB DEFAULT '[]',
    recommended_model VARCHAR(100),
    
    -- Versioning
    version         INTEGER NOT NULL DEFAULT 1,
    is_latest       BOOLEAN NOT NULL DEFAULT TRUE,
    parent_id       UUID REFERENCES skills(id),
    change_summary  TEXT,
    
    -- Lifecycle
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    visibility      VARCHAR(20) NOT NULL DEFAULT 'private',
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Workspace link (for project-scope skills)
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at    TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE(tenant_id, slug, version),
    CONSTRAINT valid_scope CHECK (scope IN ('platform', 'tenant', 'project')),
    CONSTRAINT valid_skill_status CHECK (status IN ('draft', 'published', 'archived', 'deprecated')),
    CONSTRAINT valid_skill_visibility CHECK (visibility IN ('private', 'team', 'tenant', 'public'))
);

CREATE INDEX ix_skill_tenant ON skills(tenant_id);
CREATE INDEX ix_skill_owner ON skills(owner_id);
CREATE INDEX ix_skill_category ON skills(category);
CREATE INDEX ix_skill_scope ON skills(scope);
CREATE INDEX ix_skill_status ON skills(status);
CREATE INDEX ix_skill_slug ON skills(slug);
CREATE INDEX ix_skill_latest ON skills(slug, is_latest) WHERE is_latest = TRUE;
```

### 3.3 Template Usage Log (Analytics)

```sql
CREATE TABLE template_usage_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID REFERENCES prompt_templates(id) ON DELETE SET NULL,
    skill_id        UUID REFERENCES skills(id) ON DELETE SET NULL,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    tenant_id       UUID REFERENCES tenants(id),
    session_id      UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    rendered_prompt TEXT,                                   -- the final rendered prompt
    variables_used  JSONB,                                  -- actual variable values used
    model_used      VARCHAR(100),
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX ix_usage_template ON template_usage_log(template_id);
CREATE INDEX ix_usage_skill ON template_usage_log(skill_id);
CREATE INDEX ix_usage_user ON template_usage_log(user_id);
CREATE INDEX ix_usage_tenant ON template_usage_log(tenant_id);
```

### 3.4 Entity Relationship

```
┌──────────┐     ┌──────────────────┐     ┌──────────┐
│  tenants │◀────│ prompt_templates │────▶│  users   │
└──────────┘     └────────┬─────────┘     └──────────┘
                          │ parent_id              ▲
                          ▼ (version chain)        │
                 ┌──────────────────┐              │
                 │ prompt_templates │              │
                 │ (older version)  │              │
                 └──────────────────┘              │
                                                   │
┌──────────┐     ┌──────────────────┐              │
│  tenants │◀────│     skills       │──────────────┘
└──────────┘     └────────┬─────────┘
                          │ parent_id
                          ▼
                 ┌──────────────────┐
                 │     skills       │
                 │ (older version)  │
                 └──────────────────┘
```

---

## 4. Backend API Design

### 4.1 Prompt Templates API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/templates` | List templates (filtered by tenant, category, status, visibility) | Authenticated |
| `GET` | `/templates/{id}` | Get template by ID | Authenticated |
| `GET` | `/templates/slug/{slug}` | Get latest version by slug | Authenticated |
| `GET` | `/templates/{id}/versions` | List all versions of a template | Authenticated |
| `POST` | `/templates` | Create new template | Editor+ |
| `PUT` | `/templates/{id}` | Update template (creates new version) | Owner / Admin |
| `DELETE` | `/templates/{id}` | Soft-delete (archive) template | Owner / Admin |
| `POST` | `/templates/{id}/render` | Render template with variables | Authenticated |
| `POST` | `/templates/{id}/publish` | Publish a draft template | Owner / Admin |
| `POST` | `/templates/{id}/clone` | Clone template to own tenant | Authenticated |

### 4.2 Skills API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/skills` | List skills (filtered by scope, category, tenant) | Authenticated |
| `GET` | `/skills/{id}` | Get skill by ID | Authenticated |
| `GET` | `/skills/slug/{slug}` | Get latest version by slug | Authenticated |
| `GET` | `/skills/{id}/versions` | List all versions | Authenticated |
| `POST` | `/skills` | Create new skill | Editor+ |
| `PUT` | `/skills/{id}` | Update skill (creates new version) | Owner / Admin |
| `DELETE` | `/skills/{id}` | Soft-delete (archive) skill | Owner / Admin |
| `POST` | `/skills/{id}/publish` | Publish a draft skill | Owner / Admin |
| `POST` | `/skills/{id}/clone` | Clone skill | Authenticated |
| `POST` | `/skills/{id}/toggle` | Enable/disable skill | Owner / Admin |
| `POST` | `/skills/sync-from-files` | Import file-based skills into DB | Super Admin |

### 4.3 Categories API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/categories` | List all categories with counts |
| `GET` | `/categories/{name}/templates` | List templates in category |
| `GET` | `/categories/{name}/skills` | List skills in category |

### 4.4 Usage Analytics API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/usage/log` | Log template/skill usage |
| `GET` | `/usage/stats` | Get usage statistics |
| `GET` | `/usage/popular` | Get most-used templates/skills |

### 4.5 Request/Response Examples

#### Create Template

```json
POST /templates
{
  "name": "NHS SoW Generator",
  "description": "Generate Statement of Work for NHS Trust engagements",
  "category": "sales",
  "subcategory": "nhs-bid",
  "tags": ["nhs", "sow", "sales"],
  "template_body": "Generate a professional Statement of Work for {{customer_name}} ({{customer_type}}).\n\nProject: {{project_name}}\nScope: {{scope_description}}\nTimeline: {{start_date}} to {{end_date}}\nBudget: £{{budget}}\n\nRequirements:\n{{requirements}}\n\nPlease follow the standard SoW template with sections for Executive Summary, Scope, Deliverables, Timeline, Pricing, and Terms.",
  "variables": [
    {"name": "customer_name", "type": "string", "description": "NHS Trust name", "required": true},
    {"name": "customer_type", "type": "enum", "description": "Customer type", "options": ["NHS Trust", "Enterprise", "SMB"], "default": "NHS Trust", "required": true},
    {"name": "project_name", "type": "string", "description": "Project name", "required": true},
    {"name": "scope_description", "type": "text", "description": "Brief scope description", "required": true},
    {"name": "start_date", "type": "date", "description": "Project start date", "required": true},
    {"name": "end_date", "type": "date", "description": "Project end date", "required": true},
    {"name": "budget", "type": "number", "description": "Budget in GBP", "required": false},
    {"name": "requirements", "type": "text", "description": "Key requirements (one per line)", "required": true}
  ],
  "sample_values": {
    "customer_name": "NHS Birmingham Trust",
    "customer_type": "NHS Trust",
    "project_name": "TIE Integration Upgrade",
    "scope_description": "Upgrade HL7v2 ADT interfaces to FHIR R4",
    "start_date": "2026-04-01",
    "end_date": "2026-09-30",
    "budget": "150000",
    "requirements": "1. Migrate ADT^A01/A02/A03 to FHIR Patient\n2. Implement FHIR Encounter resources\n3. Maintain backward compatibility"
  },
  "compatible_models": ["claude-sonnet-4", "claude-3-5-sonnet"],
  "recommended_model": "claude-sonnet-4",
  "visibility": "tenant",
  "status": "draft"
}
```

#### Render Template

```json
POST /templates/{id}/render
{
  "variables": {
    "customer_name": "NHS Leeds Teaching Hospitals",
    "customer_type": "NHS Trust",
    "project_name": "Lab Results FHIR Migration",
    "scope_description": "Migrate lab results from HL7v2 ORU to FHIR DiagnosticReport",
    "start_date": "2026-05-01",
    "end_date": "2026-11-30",
    "budget": "200000",
    "requirements": "1. Map ORU^R01 to DiagnosticReport\n2. Implement Observation resources\n3. SNOMED CT coding"
  }
}

Response:
{
  "rendered": "Generate a professional Statement of Work for NHS Leeds Teaching Hospitals (NHS Trust).\n\nProject: Lab Results FHIR Migration\nScope: Migrate lab results from HL7v2 ORU to FHIR DiagnosticReport\nTimeline: 2026-05-01 to 2026-11-30\nBudget: £200000\n\nRequirements:\n1. Map ORU^R01 to DiagnosticReport\n2. Implement Observation resources\n3. SNOMED CT coding\n\nPlease follow the standard SoW template with sections for Executive Summary, Scope, Deliverables, Timeline, Pricing, and Terms.",
  "template_id": "...",
  "template_name": "NHS SoW Generator",
  "variables_used": { ... }
}
```

---

## 5. Frontend UI/UX Design

### 5.1 Navigation Structure

Add two new tabs to the existing sidebar/TopNav:

```
Existing:
  - Dashboard
  - Agent (codex)
  - Chat
  - Projects
  - Settings
  - Admin > Users / Skills / Hooks

New:
  - Prompts        ← NEW TAB (prompt template library)
  - Admin > Skills ← UPGRADE existing (DB-backed CRUD)
```

### 5.2 Prompts Tab (`/prompts`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Prompt Templates                              [+ New Template]         │
├─────────────────────────────────────────────────────────────────────────┤
│  Category: [All ▼]  Status: [Published ▼]  🔍 Search...                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ Sales ──────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ 📝 NHS SoW Generator                    v3 │ Published    │  │  │
│  │  │ Generate Statement of Work for NHS Trust engagements       │  │  │
│  │  │ 🏷️ nhs, sow, sales  │ 👤 admin  │ 🤖 Claude Sonnet 4    │  │  │
│  │  │ 📊 Used 47 times    │ ⏱️ Updated Feb 9, 2026              │  │  │
│  │  │                              [Use] [Edit] [Clone] [···]   │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ 📝 Proposal Writer                       v2 │ Published    │  │  │
│  │  │ Create sales proposals and RFP responses                   │  │  │
│  │  │ 🏷️ proposal, rfp    │ 👤 sales-lead │ 🤖 Claude Sonnet 4 │  │  │
│  │  │ 📊 Used 23 times    │ ⏱️ Updated Feb 8, 2026              │  │  │
│  │  │                              [Use] [Edit] [Clone] [···]   │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Project Management ─────────────────────────────────────────────┐  │
│  │  📝 Project Charter Generator          v1 │ Published            │  │
│  │  📝 Status Report Template             v2 │ Published            │  │
│  │  📝 Risk Register Template             v1 │ Draft                │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Architecture ───────────────────────────────────────────────────┐  │
│  │  📝 Requirements Spec Generator        v1 │ Published            │  │
│  │  📝 Architecture Decision Record       v1 │ Published            │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Template Editor (`/prompts/new` or `/prompts/{id}/edit`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Edit Template: NHS SoW Generator           [Save Draft] [Publish]      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ Metadata ───────────────────────────────────────────────────────┐  │
│  │ Name: [NHS SoW Generator        ]                                 │  │
│  │ Category: [Sales ▼]  Subcategory: [NHS Bid ▼]                     │  │
│  │ Description: [Generate Statement of Work for NHS Trust...]        │  │
│  │ Tags: [nhs] [sow] [sales] [+ Add]                                │  │
│  │ Visibility: [Tenant ▼]  Model: [Claude Sonnet 4 ▼]               │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Template Body ──────────────────────────────────────────────────┐  │
│  │ Generate a professional Statement of Work for                     │  │
│  │ {{customer_name}} ({{customer_type}}).                            │  │
│  │                                                                    │  │
│  │ Project: {{project_name}}                                         │  │
│  │ Scope: {{scope_description}}                                      │  │
│  │ Timeline: {{start_date}} to {{end_date}}                          │  │
│  │ Budget: £{{budget}}                                               │  │
│  │                                                                    │  │
│  │ [Syntax-highlighted textarea with {{variable}} highlighting]      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Variables (auto-detected from template) ────────────────────────┐  │
│  │ {{customer_name}}  │ string │ NHS Trust name        │ Required ✓ │  │
│  │ {{customer_type}}  │ enum   │ [NHS Trust,Ent,SMB]   │ Required ✓ │  │
│  │ {{project_name}}   │ string │ Project name          │ Required ✓ │  │
│  │ {{scope_desc...}}  │ text   │ Brief scope           │ Required ✓ │  │
│  │ {{start_date}}     │ date   │ Project start         │ Required ✓ │  │
│  │ {{end_date}}       │ date   │ Project end           │ Required ✓ │  │
│  │ {{budget}}         │ number │ Budget in GBP         │ Optional   │  │
│  │ {{requirements}}   │ text   │ Key requirements      │ Required ✓ │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Preview (with sample values) ───────────────────────────────────┐  │
│  │ Generate a professional Statement of Work for                     │  │
│  │ NHS Birmingham Trust (NHS Trust).                                 │  │
│  │ Project: TIE Integration Upgrade                                  │  │
│  │ ...                                                               │  │
│  │                                    [Copy to Clipboard] [Use Now]  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Version History ────────────────────────────────────────────────┐  │
│  │ v3 │ Feb 9 │ admin │ Added NHS compliance section    │ Current   │  │
│  │ v2 │ Feb 8 │ admin │ Updated pricing template        │ [Restore] │  │
│  │ v1 │ Feb 7 │ admin │ Initial version                 │ [Restore] │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Template "Use" Modal (Quick Fill)

When clicking **[Use]** on a template card:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Use Template: NHS SoW Generator                              [Close]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Fill in the variables below to generate your prompt:                   │
│                                                                         │
│  Customer Name *:    [NHS Leeds Teaching Hospitals    ]                  │
│  Customer Type *:    [NHS Trust ▼]                                      │
│  Project Name *:     [Lab Results FHIR Migration      ]                 │
│  Scope *:            [Migrate lab results from HL7v2  ]                 │
│  Start Date *:       [2026-05-01]                                       │
│  End Date *:         [2026-11-30]                                       │
│  Budget:             [200000]                                           │
│  Requirements *:     [1. Map ORU^R01 to Diagnostic... ]                 │
│                                                                         │
│  ┌─ Preview ────────────────────────────────────────────────────────┐  │
│  │ Generate a professional Statement of Work for                     │  │
│  │ NHS Leeds Teaching Hospitals (NHS Trust)...                       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  [Copy to Clipboard]  [Send to Agent Console]  [Cancel]                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.5 Skills Admin Upgrade (`/admin/skills`)

The existing Skills page at `/admin/skills` currently reads from file-based skills in `claude-runner/skills/`. Upgrade it to:

1. **Read from DB** (with fallback to file-based for backward compat)
2. **Full CRUD** - Create, Edit, Delete skills via the prompt-manager API
3. **Version history** - Show version chain
4. **Scope management** - Platform / Tenant / Project scope selector
5. **Supporting files** - Manage templates, examples, reference docs

---

## 6. Agent Tab Integration

### 6.1 Prompt Template Picker in Agent Console

Add a **template picker** above the prompt textarea in the Agent tab (`/codex`):

```
┌─ Prompt ─────────────────────────────────────────────────────────────┐
│ Status: ● ready │ claude • abc123...                                  │
│                                                                       │
│ ┌─ Template (optional) ──────────────────────────────────────────┐   │
│ │ [Select a prompt template... ▼]              [Fill Variables]   │   │
│ │                                                                 │   │
│ │ Recently used:                                                  │   │
│ │ • NHS SoW Generator                                             │   │
│ │ • Project Charter                                               │   │
│ │ • Code Review Checklist                                         │   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                       │
│ ┌────────────────────────────────────────────────────────────────┐   │
│ │ [Rendered prompt appears here after filling variables]          │   │
│ │                                                                 │   │
│ │ OR user types free-form prompt as before                        │   │
│ └────────────────────────────────────────────────────────────────┘   │
│                                                                       │
│ [Run Prompt]                                                          │
└───────────────────────────────────────────────────────────────────────┘
```

### 6.2 Behaviour

1. User selects a template from dropdown (filtered by RBAC visibility)
2. A modal opens with variable input fields (typed: string, text, date, enum, number)
3. User fills variables → preview updates live
4. Click "Send to Agent Console" → rendered prompt populates the textarea
5. User can still edit the rendered prompt before running
6. Usage is logged to `template_usage_log`

---

## 7. RBAC & Multi-Tenancy

### 7.1 Permission Model

Reuses existing RBAC from `RBAC_Design.md`:

| Action | Super Admin | Org Admin | Editor | Viewer |
|--------|-------------|-----------|--------|--------|
| **View public templates** | ✅ | ✅ | ✅ | ✅ |
| **View tenant templates** | ✅ | ✅ (own) | ✅ (own) | ✅ (own) |
| **View private templates** | ✅ | Own only | Own only | ❌ |
| **Create templates** | ✅ | ✅ | ✅ | ❌ |
| **Edit own templates** | ✅ | ✅ | ✅ | ❌ |
| **Edit others' templates** | ✅ | ✅ (own tenant) | ❌ | ❌ |
| **Publish templates** | ✅ | ✅ | ❌ | ❌ |
| **Delete templates** | ✅ | ✅ (own tenant) | Own only | ❌ |
| **Use templates** | ✅ | ✅ | ✅ | ✅ |

### 7.2 Visibility Rules

Templates and Skills have a `visibility` field:

| Visibility | Who Can See |
|------------|-------------|
| `private` | Owner only |
| `team` | Owner's group members |
| `tenant` | All users in same tenant |
| `public` | All authenticated users (cross-tenant) |

### 7.3 JWT Forwarding

The prompt-manager service validates the same JWT tokens as the backend:

```python
# prompt-manager validates JWT from Authorization header
# Uses same JWT_SECRET_KEY env var as backend
# Extracts user_id, tenant_id, role from token
```

---

## 8. Implementation Plan

### Phase 1: Backend Foundation (prompt-manager service)

| Step | Task | Files |
|------|------|-------|
| 1.1 | Add SQLAlchemy + Alembic to prompt-manager | `requirements.txt`, `database.py` |
| 1.2 | Create ORM models for prompt_templates, skills, template_usage_log | `models.py` |
| 1.3 | Create Alembic migration | `alembic/versions/001_*.py` |
| 1.4 | Implement repository layer | `repositories/` |
| 1.5 | Implement Prompt Templates CRUD API | `routers/templates.py` |
| 1.6 | Implement Skills CRUD API | `routers/skills.py` |
| 1.7 | Implement template rendering engine | `services/renderer.py` |
| 1.8 | Add JWT auth middleware | `auth/` |
| 1.9 | Update Dockerfile and docker-compose.yml | `Dockerfile`, `docker-compose.yml` |
| 1.10 | Seed platform templates and import existing file-based skills | `seeds/` |

### Phase 2: Frontend - Prompts Tab

| Step | Task | Files |
|------|------|-------|
| 2.1 | Add Next.js API proxy routes for prompt-manager | `api/prompt-manager/[...path]/route.ts` |
| 2.2 | Create Prompts list page | `(app)/prompts/page.tsx` |
| 2.3 | Create Template editor page | `(app)/prompts/[id]/edit/page.tsx` |
| 2.4 | Create "Use Template" modal component | `components/UseTemplateModal.tsx` |
| 2.5 | Add "Prompts" to sidebar navigation | `Sidebar.tsx` |

### Phase 3: Frontend - Skills Admin Upgrade

| Step | Task | Files |
|------|------|-------|
| 3.1 | Upgrade Skills page to use prompt-manager API | `admin/skills/page.tsx` |
| 3.2 | Add Skill editor with version history | `admin/skills/[id]/edit/page.tsx` |
| 3.3 | Add file-to-DB sync button for existing skills | `admin/skills/page.tsx` |

### Phase 4: Agent Tab Integration

| Step | Task | Files |
|------|------|-------|
| 4.1 | Add template picker dropdown to Agent page | `codex/page.tsx` |
| 4.2 | Add variable fill modal | `components/TemplateVariableModal.tsx` |
| 4.3 | Wire rendered prompt into textarea | `codex/page.tsx` |
| 4.4 | Log template usage on prompt run | `codex/page.tsx` |

### Phase 5: Polish & Testing

| Step | Task |
|------|------|
| 5.1 | Seed 5-10 platform prompt templates |
| 5.2 | Import existing 10 file-based skills into DB |
| 5.3 | E2E tests for template CRUD |
| 5.4 | E2E tests for template usage in Agent Console |
| 5.5 | Update documentation |

---

## Appendix A: Default Categories

| Category | Subcategories | Description |
|----------|---------------|-------------|
| `sales` | nhs-bid, enterprise, smb, proposal | Sales & pre-sales deliverables |
| `project-management` | charter, status, risk, change | PM documents |
| `product` | prd, roadmap, sprint, feature | Product management |
| `architecture` | requirements, design, api, database | Technical architecture |
| `development` | implementation, code-gen, review, refactor | Development support |
| `qa` | strategy, plan, automation, report | Testing & QA |
| `support` | user-guide, troubleshooting, runbook | Service & support |
| `compliance` | nhs, gdpr, security, audit | Compliance & governance |

## Appendix B: Seed Templates (Phase 5)

| # | Name | Category | Description |
|---|------|----------|-------------|
| 1 | NHS SoW Generator | sales | Statement of Work for NHS Trusts |
| 2 | Enterprise Proposal | sales | Sales proposal for enterprise |
| 3 | Project Charter | project-management | Project initiation document |
| 4 | Weekly Status Report | project-management | RAG status report |
| 5 | PRD Writer | product | Product Requirements Document |
| 6 | Architecture Decision Record | architecture | ADR template |
| 7 | Code Review Checklist | development | Structured code review |
| 8 | Test Strategy | qa | Test strategy document |
| 9 | User Guide | support | End-user documentation |
| 10 | NHS Compliance Check | compliance | NHS Digital standards audit |
