# Skills Usage Guide

## Enterprise SaaS Platform - Skills Management

**Version**: v0.6.4  
**Last Updated**: Feb 8, 2026

---

## Table of Contents

1. [How to Test and Use Skills](#1-how-to-test-and-use-skills)
2. [Skills RBAC Management](#2-skills-rbac-management)
3. [Skills Portability: Claude vs OpenAI](#3-skills-portability-claude-vs-openai)
4. [Best Practices per Role](#4-best-practices-per-role)

---

## 1. How to Test and Use Skills

### 1.1 Testing Skills in Current Docker Environment

#### Quick Test: List Available Skills
```bash
# Check skills loaded in claude-runner
docker compose exec -T claude-runner ls -la /app/skills/

# Verify skill content
docker compose exec -T claude-runner cat /app/skills/sow-generator/SKILL.md | head -20
```

#### Test via UI
1. Open http://localhost:9100/codex
2. Select **Claude Agent** from runner dropdown
3. Select a workspace
4. Create a new session
5. Use natural language to invoke skills:

| Skill | Example Prompts |
|-------|-----------------|
| `sow-generator` | "Create a Statement of Work for NHS Trust ABC" |
| `project-charter` | "Generate a project charter for the EHR integration project" |
| `prd-writer` | "Write a PRD for the patient portal feature" |
| `architecture-design` | "Create architecture documentation for the API gateway" |
| `test-strategy` | "Develop a test strategy for the mobile app" |
| `user-guide` | "Write a user guide for the admin dashboard" |

#### Test via API
```bash
# Create a thread
THREAD_RESPONSE=$(curl -s -X POST http://localhost:9104/threads \
  -H "Content-Type: application/json" \
  -d '{"workingDirectory": "/workspaces/test", "skipGitRepoCheck": true}')

THREAD_ID=$(echo $THREAD_RESPONSE | grep -o '"threadId":"[^"]*"' | cut -d'"' -f4)

# Start a run with skill invocation
curl -X POST http://localhost:9104/runs \
  -H "Content-Type: application/json" \
  -d "{\"threadId\": \"$THREAD_ID\", \"prompt\": \"Create a Statement of Work for NHS Trust ABC for a patient portal project\"}"
```

### 1.2 Skill Invocation Methods

| Method | How | Best For |
|--------|-----|----------|
| **Natural Language** | "Create a SoW for..." | Most users |
| **Explicit** | "/sow-generator NHS Trust ABC" | Power users |
| **Context-Based** | Claude auto-selects based on task | Seamless UX |

### 1.3 Verifying Skill Activation

In the UI transcript, look for:
- **Purple skill badge**: 🎯 `sow-generator` activated
- **Workflow checklist**: Claude copies and tracks progress
- **Structured output**: Follows the template exactly

---

## 2. Skills RBAC Management

### 2.1 Current State (v0.6.4)

**✅ Skills Management UI IMPLEMENTED**

As of v0.6.4, Skills can be managed via:
- **Admin UI**: http://localhost:9100/admin/skills
- **API**: http://localhost:9104/api/skills

**Features**:
- List all platform/tenant/project skills
- View skill details and SKILL.md content
- Create new skills with name validation
- Edit skills with version tracking
- Delete skills with confirmation
- Reload skills in runner

**Storage**:
- **Platform Skills**: `/app/skills/` (Docker image)
- **Tenant Skills**: `/workspaces/{tenant}/.claude/skills/`
- **Project Skills**: `/workspaces/{tenant}/{project}/.claude/skills/`

### 2.2 Proposed RBAC Model (Future v0.7.x)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPER ADMIN                                         │
│  - View/Create/Edit/Delete Platform Skills                                  │
│  - View all Tenant Skills (read-only)                                       │
│  - Approve Tenant Skill submissions                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                         ORG ADMIN (Tenant Admin)                            │
│  - View Platform Skills (read-only)                                         │
│  - View/Create/Edit/Delete Tenant Skills                                    │
│  - View/Create/Edit/Delete Project Skills (within tenant)                   │
│  - Assign Skills to projects                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                         PROJECT ADMIN                                       │
│  - View Platform Skills (read-only)                                         │
│  - View Tenant Skills (read-only)                                           │
│  - View/Create/Edit/Delete Project Skills                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                         USER                                                │
│  - View and use all available Skills                                        │
│  - Cannot create/edit/delete Skills                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Proposed Skills Management UI

#### Super Admin: Platform Skills Management

**Route**: `/admin/skills`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Platform Skills Management                              [+ Create Skill]   │
├─────────────────────────────────────────────────────────────────────────────┤
│  🔍 Search skills...                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📄 sow-generator                                    [Edit] [Delete] │   │
│  │ Sales - Statement of Work for NHS/Enterprise                        │   │
│  │ Last updated: Feb 8, 2026                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📄 project-charter                                  [Edit] [Delete] │   │
│  │ PM - Project initiation documents                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Skill Editor

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Edit Skill: sow-generator                              [Save] [Cancel]     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Name: [sow-generator          ]                                            │
│  Description: [Generate professional Statement of Work documents...]        │
│  Allowed Tools: [Read, Write, Bash(python scripts/*:*)]                     │
│  User Invocable: [✓]                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  SKILL.md Content:                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ---                                                                  │   │
│  │ name: sow-generator                                                  │   │
│  │ description: Generate professional Statement of Work...              │   │
│  │ ---                                                                  │   │
│  │                                                                      │   │
│  │ # Statement of Work Generator                                        │   │
│  │ ...                                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Supporting Files:                                      [+ Add File]        │
│  - templates/sow-nhs.md                                 [Edit] [Delete]     │
│  - templates/sow-enterprise.md                          [Edit] [Delete]     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Skills Storage Architecture (Proposed)

```
Option A: Filesystem-Based (Current)
├── /app/skills/                    # Platform (Docker image)
├── /workspaces/{tenant}/.claude/skills/   # Tenant
└── /workspaces/{tenant}/{project}/.claude/skills/  # Project

Option B: Database + Filesystem Hybrid (Recommended for SaaS)
├── Database: skills table
│   - id, tenant_id, project_id, name, description, content, created_by, etc.
│   - RBAC via existing user_groups, workspace_access tables
├── Runtime: Skills loaded from DB → written to temp filesystem
└── Benefits: RBAC, versioning, audit trail, hot reload
```

### 2.5 Implementation Roadmap for Skills RBAC

| Phase | Feature | Version |
|-------|---------|---------|
| 1 | Skills database schema | v0.7.0 |
| 2 | Super Admin UI for Platform Skills | v0.7.1 |
| 3 | Org Admin UI for Tenant Skills | v0.7.2 |
| 4 | Project Admin UI for Project Skills | v0.7.3 |
| 5 | Skills versioning and audit | v0.8.0 |

---

## 3. Skills Portability: Claude vs OpenAI

### 3.1 Short Answer

**Skills are Claude-specific and CANNOT be directly shared with OpenAI Codex runner.**

### 3.2 Why Skills Are Claude-Only

| Aspect | Claude Agent SDK | OpenAI Codex |
|--------|------------------|--------------|
| **Architecture** | Skills are a Claude Agent SDK feature | No equivalent concept |
| **Loading** | SKILL.md parsed by Claude SDK | N/A |
| **Context Injection** | SDK injects skill content into context | Manual prompt engineering |
| **Tool Permissions** | `allowed-tools` in frontmatter | Different tool system |

### 3.3 What CAN Be Shared

While Skills themselves are Claude-specific, the **templates and deliverable formats** can be reused:

```
Shareable (Runner-Agnostic):
├── templates/sow-nhs.md          # Output template
├── templates/sow-enterprise.md   # Output template
├── reference/nfr-checklist.md    # Reference material
└── examples/sample-sow.md        # Example outputs

NOT Shareable (Claude-Specific):
├── SKILL.md                      # Claude SDK format
└── allowed-tools configuration   # Claude SDK feature
```

### 3.4 Cross-Runner Strategy

For enterprise SaaS with both runners:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SHARED KNOWLEDGE BASE                                    │
│  /shared/templates/     - Output templates (Markdown)                       │
│  /shared/reference/     - Reference materials                               │
│  /shared/examples/      - Example outputs                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────┐    ┌─────────────────────────┐                │
│  │    CLAUDE RUNNER        │    │    CODEX RUNNER         │                │
│  │                         │    │                         │                │
│  │  Skills (SKILL.md)      │    │  System Prompts         │                │
│  │  - Loads shared/        │    │  - Loads shared/        │                │
│  │  - Claude SDK features  │    │  - OpenAI format        │                │
│  │  - Hooks integration    │    │  - Function calling     │                │
│  └─────────────────────────┘    └─────────────────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.5 Recommendation

For this enterprise SaaS platform:

1. **Primary**: Use Claude runner with full Skills support
2. **Fallback**: OpenAI Codex with equivalent system prompts
3. **Shared**: Templates and reference materials in `/shared/`
4. **Future**: Consider a "Skill Transpiler" that converts SKILL.md → OpenAI system prompt

---

## 4. Best Practices per Role

### 4.1 Sales & Pre-Sales

**Skills**: `sow-generator`, `proposal-writer`, `nhs-bid-response`

**Best Practices**:
1. Always specify customer type (NHS Trust / Enterprise / SMB)
2. Provide project scope and timeline upfront
3. Review generated pricing against internal rate cards
4. Customize NHS-specific sections for compliance

**Example Workflow**:
```
User: "Create a SoW for NHS Trust Birmingham for a 6-month patient portal project"

Claude:
1. Activates sow-generator skill
2. Selects NHS template
3. Generates structured SoW with:
   - NHS Digital standards compliance
   - IG Toolkit requirements
   - DCB0129 clinical safety (if applicable)
4. Outputs in standard template format
```

### 4.2 Project Management

**Skills**: `project-charter`, `status-report`, `risk-register`

**Best Practices**:
1. Define SMART objectives clearly
2. Identify all stakeholders upfront
3. Use RAG status consistently
4. Update risk register weekly

### 4.3 Product Management

**Skills**: `prd-writer`, `roadmap-planner`, `sprint-planning`

**Best Practices**:
1. Write user stories in standard format (As a... I want... So that...)
2. Include acceptance criteria in Gherkin format
3. Prioritize using MoSCoW or RICE framework
4. Link PRDs to architecture docs

### 4.4 Software Architecture

**Skills**: `requirements-spec`, `architecture-design`, `api-design`

**Best Practices**:
1. Use C4 model for diagrams (Context → Container → Component)
2. Document all Architecture Decision Records (ADRs)
3. Include NFR specifications with measurable targets
4. Reference security controls explicitly

### 4.5 Development

**Skills**: `implementation-spec`, `code-generator`, `pr-reviewer`

**Best Practices**:
1. Follow existing code conventions
2. Generate tests alongside implementation
3. Use PR review skill for consistent feedback
4. Document complex logic inline

### 4.6 QA & Testing

**Skills**: `test-strategy`, `test-plan`, `test-automation`

**Best Practices**:
1. Define test pyramid ratios (80% unit, 15% integration, 5% E2E)
2. Establish clear entry/exit criteria
3. Use risk-based test prioritization
4. Automate regression tests

### 4.7 Service & Support

**Skills**: `user-guide`, `troubleshooting`, `sla-report`

**Best Practices**:
1. Write for the target audience's technical level
2. Include screenshots for complex procedures
3. Maintain FAQ based on actual support tickets
4. Track SLA metrics consistently

---

## 5. Quick Reference: Skill Invocation

| Role | Skill | Invocation Example |
|------|-------|-------------------|
| Sales | `sow-generator` | "Create a SoW for [customer] for [project]" |
| PM | `project-charter` | "Generate a project charter for [project]" |
| Product | `prd-writer` | "Write a PRD for [feature]" |
| Architect | `architecture-design` | "Create architecture docs for [system]" |
| Dev | `code-generator` | "Generate CRUD endpoints for [entity]" |
| QA | `test-strategy` | "Develop test strategy for [project]" |
| Support | `user-guide` | "Write user guide for [feature]" |

---

## Appendix: Future Skills RBAC Database Schema

```sql
-- Skills table
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL,
    description VARCHAR(1024) NOT NULL,
    content TEXT NOT NULL,  -- SKILL.md content
    scope VARCHAR(20) NOT NULL,  -- 'platform', 'tenant', 'project'
    tenant_id UUID REFERENCES tenants(id),  -- NULL for platform skills
    project_id UUID REFERENCES workspaces(id),  -- NULL for platform/tenant skills
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(name, tenant_id, project_id)
);

-- Skill files (templates, reference, examples)
CREATE TABLE skill_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    path VARCHAR(255) NOT NULL,  -- e.g., 'templates/sow-nhs.md'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Skill audit log
CREATE TABLE skill_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID REFERENCES skills(id),
    action VARCHAR(20) NOT NULL,  -- 'create', 'update', 'delete'
    user_id UUID REFERENCES users(id),
    changes JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```
