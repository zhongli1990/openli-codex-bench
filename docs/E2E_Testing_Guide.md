# E2E Testing Guide

## OpenLI Codex - Manual End-to-End Testing

**Version**: v0.7.0  
**Last Updated**: Feb 9, 2026

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Test Data](#2-test-data)
3. [UI Component Tests](#3-ui-component-tests)
4. [Skills Management Tests](#4-skills-management-tests)
5. [Hooks Configuration Tests](#5-hooks-configuration-tests)
6. [Agent Console Tests](#6-agent-console-tests)
7. [Sales/Architect Scenario](#7-salesarchitect-scenario)
8. [Automated Tests (Playwright)](#8-automated-tests-playwright)
9. [Prompt & Skills Manager Tests (v0.7.0)](#9-prompt--skills-manager-tests-v070)

---

## 1. Prerequisites

### Start Services

```bash
# Ensure all services are running
docker compose up -d

# Verify services
docker compose ps

# Expected: All services "Up"
```

### Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:9100 |
| Agent Console | http://localhost:9100/codex |
| Prompts Page | http://localhost:9100/prompts |
| Skills Management | http://localhost:9100/admin/skills |
| Hooks Configuration | http://localhost:9100/admin/hooks |
| Backend API | http://localhost:9101 |
| Prompt Manager API | http://localhost:9105 |
| Claude Runner API | http://localhost:9104 |

---

## 2. Test Data

### Sample Users (displayed in Settings menu)

| Email | Name | Role | Tenant | Status |
|-------|------|------|--------|--------|
| admin@saas-codex.com | Platform Admin | Super Admin | Platform | Active |
| sarah.jones@nhs-trust.uk | Sarah Jones | Org Admin | NHS Birmingham Trust | Active |
| james.wilson@nhs-trust.uk | James Wilson | Project Admin | NHS Birmingham Trust | Active |
| emma.chen@enterprise.com | Emma Chen | Org Admin | Enterprise Corp | Active |
| michael.brown@enterprise.com | Michael Brown | Editor | Enterprise Corp | Active |
| lisa.taylor@nhs-trust.uk | Lisa Taylor | Editor | NHS Birmingham Trust | Active |
| david.smith@enterprise.com | David Smith | Viewer | Enterprise Corp | Active |
| pending.user@newclient.com | Pending User | Viewer | New Client Ltd | Pending |

### Sample User Groups

| Group | Permissions |
|-------|-------------|
| Super Admins | platform:*, tenant:*, user:*, skill:*, hook:* |
| Org Admins | tenant:read, tenant:write, user:manage, skill:manage |
| Project Managers | project:*, workspace:manage, session:manage |
| Developers | workspace:read, workspace:write, session:create, skill:use |
| Sales | workspace:read, session:create, skill:use:sow-generator |
| Architecture | workspace:read, workspace:write, skill:use:architecture-* |
| Clinical Leads | workspace:read, skill:use:healthcare-*, hook:view |
| Stakeholders | workspace:read, session:read |

### Platform Skills (10 total)

| Skill Name | Role | Description |
|------------|------|-------------|
| sow-generator | Sales | Statement of Work for NHS/Enterprise |
| project-charter | PM | Project initiation documents |
| prd-writer | Product | Product Requirements Documents |
| architecture-design | Architect | C4 diagrams, technical specs |
| test-strategy | QA | Test strategy and planning |
| user-guide | Support | End-user documentation |
| code-review | Dev | Code quality review |
| security-audit | Security | Security vulnerability scan |
| healthcare-compliance | Compliance | NHS/healthcare data compliance |
| e2e-test | QA | E2E test automation |

### Test Prompts

| Scenario | Prompt |
|----------|--------|
| SoW Generation | "Create a Statement of Work for NHS Trust Birmingham for a 6-month patient portal project" |
| Architecture | "Create architecture design with C4 diagrams for a patient booking API" |
| Code Review | "Review this codebase for security issues and best practices" |
| Blocked Command | "Execute: rm -rf /workspaces" |
| File Listing | "List all files in this workspace" |

---

## 3. UI Component Tests

### Test 3.1: Favicon and Title

**Steps**:
1. Open http://localhost:9100
2. Check browser tab

**Expected**:
- ✅ Favicon shows AI brain/circuit icon (gradient blue-purple)
- ✅ Title: "SaaS Codex | Enterprise AI Agent Platform"

---

### Test 3.2: About Modal

**Steps**:
1. Open http://localhost:9100
2. Click the **SaaS Codex logo** in top-left corner
3. OR click the **ℹ️ (info) icon** in top-right

**Expected**:
- ✅ Modal opens with gradient header
- ✅ Shows "SaaS Codex - Enterprise AI Agent Platform"
- ✅ Version: v0.6.5
- ✅ Build Date: Feb 8, 2026

**Steps (continued)**:
4. Click "Version History" tab

**Expected**:
- ✅ Shows 9 versions (v0.1.0 to v0.6.5)
- ✅ Each version shows date and feature list
- ✅ v0.6.5 shows: favicon, About modal, Settings menu

**Steps (continued)**:
5. Click "About" tab
6. Click X to close

**Expected**:
- ✅ About tab shows key features (8 items)
- ✅ Tech stack badges (Next.js, FastAPI, etc.)
- ✅ Modal closes properly

---

### Test 3.3: Settings & RBAC Menu

**Steps**:
1. Open http://localhost:9100
2. Click the **⚙️ (gear) icon** in top-right

**Expected**:
- ✅ Modal opens with "Settings & RBAC" header
- ✅ Three tabs: Sample Users, User Groups, RBAC Matrix

---

#### Test 3.3.1: Sample Users Tab

**Steps**:
1. In Settings modal, click "Sample Users" tab (default)

**Expected**:
- ✅ Table with 8 users
- ✅ Columns: User, Role, Tenant, Groups, Status
- ✅ Role badges with colors:
  - Super Admin: Red
  - Org Admin: Purple
  - Project Admin: Blue
  - Editor: Green
  - Viewer: Gray
- ✅ Status indicators (green dot = active, yellow = pending)

**Verify specific users**:
| User | Role Badge | Tenant |
|------|------------|--------|
| Platform Admin | Super Admin (red) | Platform |
| Sarah Jones | Org Admin (purple) | NHS Birmingham Trust |
| Pending User | Viewer (gray) | New Client Ltd |

---

#### Test 3.3.2: User Groups Tab

**Steps**:
1. Click "User Groups" tab

**Expected**:
- ✅ 8 group cards displayed
- ✅ Each card shows: name, description, permissions
- ✅ Permissions in monospace font with indigo background

**Verify specific groups**:
| Group | Permissions Include |
|-------|---------------------|
| Super Admins | platform:*, tenant:*, user:* |
| Sales | skill:use:sow-generator |
| Clinical Leads | skill:use:healthcare-* |

---

#### Test 3.3.3: RBAC Matrix Tab

**Steps**:
1. Click "RBAC Matrix" tab

**Expected**:
- ✅ 3-tier hierarchy diagram (Super Admin → Org Admin → End Users)
- ✅ Permission matrix table
- ✅ Legend: C=Create, R=Read, U=Update, D=Delete

**Verify matrix values**:
| Resource | Super | Org | Project | Editor | Viewer |
|----------|-------|-----|---------|--------|--------|
| Platform Skills | CRUD | R | R | R | R |
| Tenant Skills | CRUD | CRUD | R | R | R |
| Users | CRUD | CRU* | - | - | - |

---

## 4. Skills Management Tests

### Test 4.1: Navigate to Skills Page

**Steps**:
1. Open http://localhost:9100
2. Click "Skills" in navigation bar
3. OR go directly to http://localhost:9100/admin/skills

**Expected**:
- ✅ Page title: "Skills Management"
- ✅ Skills list loads with 10 platform skills
- ✅ Each skill shows: name, description, scope badge, version

---

### Test 4.2: Filter Skills by Scope

**Steps**:
1. On Skills page, find the "Scope" dropdown
2. Select "Platform"

**Expected**:
- ✅ Only platform skills shown (10)
- ✅ All skills have "platform" badge

**Steps (continued)**:
3. Select "Tenant"

**Expected**:
- ✅ Shows tenant skills (may be 0 initially)

---

### Test 4.3: Search Skills

**Steps**:
1. On Skills page, find the search box
2. Type "sow"

**Expected**:
- ✅ Only `sow-generator` skill shown
- ✅ Other skills filtered out

**Steps (continued)**:
3. Clear search box
4. Type "test"

**Expected**:
- ✅ Shows `test-strategy` and `e2e-test` skills

---

### Test 4.4: View Skill Details

**Steps**:
1. Clear search, show all skills
2. Click on `sow-generator` skill

**Expected**:
- ✅ Detail panel opens on right
- ✅ Shows skill name: "sow-generator"
- ✅ Shows description
- ✅ Shows SKILL.md content (markdown rendered)
- ✅ Shows version number
- ✅ Shows supporting files (if any)

---

### Test 4.5: Edit Skill (View Mode)

**Steps**:
1. With `sow-generator` selected
2. Click "Edit" button

**Expected**:
- ✅ Edit mode activates
- ✅ Description becomes editable input
- ✅ Change Summary input appears
- ✅ Content becomes editable textarea
- ✅ "Save" and "Cancel" buttons appear

**Steps (continued)**:
3. Click "Cancel"

**Expected**:
- ✅ Returns to view mode
- ✅ No changes saved

---

### Test 4.6: Create New Skill

**Steps**:
1. Click "+ New Skill" button

**Expected**:
- ✅ Modal opens with "Create New Skill" title
- ✅ Form fields: Name, Description, Scope dropdown

**Steps (continued)**:
2. Enter:
   - Name: `test-manual-skill`
   - Description: `Test skill created during manual testing`
   - Scope: `tenant`
3. Click "Create Skill"

**Expected**:
- ✅ Modal closes
- ✅ New skill appears in list
- ✅ Success message shown

---

### Test 4.7: Delete Skill

**Steps**:
1. Select the `test-manual-skill` you just created
2. Click "Delete" button
3. Confirm deletion in dialog

**Expected**:
- ✅ Skill removed from list
- ✅ Success message shown

---

### Test 4.8: Skills API Test

**Steps**:
```bash
# List all skills
curl http://localhost:9100/api/claude/skills | jq '.skills | length'

# Get specific skill
curl "http://localhost:9100/api/claude/skills/sow-generator" | jq '.name, .description'

# Test 404
curl "http://localhost:9100/api/claude/skills/nonexistent-skill"
```

**Expected**:
- ✅ List returns 10 skills
- ✅ Detail returns skill with name and description
- ✅ 404 returns error for nonexistent skill

---

## 5. Hooks Configuration Tests

### Test 5.1: Navigate to Hooks Page

**Steps**:
1. Click "Hooks" in navigation bar
2. OR go to http://localhost:9100/admin/hooks

**Expected**:
- ✅ Page title: "Hooks Configuration"
- ✅ Two sections: Platform Hooks, Tenant Hooks

---

### Test 5.2: Platform Security Hooks

**Steps**:
1. Find "Security Hooks" card in Platform Hooks section
2. Verify status badge shows "ON"
3. Click "Configure" button

**Expected**:
- ✅ Configuration panel expands
- ✅ Shows "Blocked Bash Patterns" list (13 patterns)
- ✅ Patterns include: rm -rf, sudo, chmod 777, curl | sh, etc.
- ✅ Shows "Blocked Path Patterns" list (2 patterns)
- ✅ Patterns include: .., /etc/passwd

---

### Test 5.3: Platform Audit Hooks

**Steps**:
1. Find "Audit Hooks" card
2. Verify status badge shows "ON"

**Expected**:
- ✅ Description mentions tool call logging
- ✅ Status is ON (enabled by default)

---

### Test 5.4: Tenant Compliance Hooks

**Steps**:
1. Find "Compliance Hooks" in Tenant Hooks section
2. Click "Configure"

**Expected**:
- ✅ Shows checkboxes for:
  - Detect NHS numbers
  - Detect PII (names, addresses)
  - Block external data transfer

**Steps (continued)**:
3. Toggle "Detect NHS numbers" checkbox

**Expected**:
- ✅ Checkbox becomes checked
- ✅ No errors

---

### Test 5.5: Info Box

**Steps**:
1. Scroll to bottom of Hooks page

**Expected**:
- ✅ "About Hooks" info box displayed
- ✅ Explains pre-tool and post-tool hooks

---

## 6. Agent Console Tests

### Test 6.1: Create Session with Claude

**Steps**:
1. Go to http://localhost:9100/codex
2. Enter GitHub URL: `https://github.com/octocat/Hello-World.git`
3. Select runner: "Claude Agent"
4. Click "Create Session"

**Expected**:
- ✅ Session created successfully
- ✅ Workspace imported
- ✅ Session ID displayed

---

### Test 6.2: Run Simple Prompt

**Steps**:
1. In prompt textarea, enter: `List all files in this repository`
2. Click "Run Prompt" or press Enter

**Expected**:
- ✅ Status changes to "Running"
- ✅ Transcript shows user message
- ✅ Claude responds with file listing
- ✅ Tool calls shown (list_files or bash ls)
- ✅ Status changes to "Completed"

---

### Test 6.3: Test Security Hook Blocking

**Steps**:
1. In prompt textarea, enter: `Execute this command: rm -rf /`
2. Click "Run Prompt"

**Expected**:
- ✅ Claude attempts to use bash tool
- ✅ Tool call is BLOCKED
- ✅ Red "🚫 BLOCKED" indicator in transcript
- ✅ Reason shown: "Blocked pattern: rm -rf"

---

### Test 6.4: View Raw Events

**Steps**:
1. After running a prompt
2. Click "Raw Events" tab

**Expected**:
- ✅ JSON events displayed
- ✅ Events include: run.started, ui.message.*, run.completed
- ✅ Timestamps shown

---

## 7. Sales/Architect Scenario

### Full E2E Workflow for Clinical Requirements Project

#### Step 1: Import Customer Repository

**Test Data**:
- GitHub URL: `https://github.com/octocat/Hello-World.git` (or your test repo)
- Display Name: "NHS Clinical Portal"

**Steps**:
1. Go to http://localhost:9100/codex
2. Enter the GitHub URL
3. Click "Import" or "Create Session"

**Expected**:
- ✅ Workspace created
- ✅ Files cloned

---

#### Step 2: Sales - Generate Statement of Work

**Test Data**:
```
Prompt: Analyze this codebase and create a Statement of Work for NHS Trust Birmingham. 
The project scope is:
- Add new patient appointment booking feature
- Integrate with NHS Spine for patient demographics
- Implement DCB0129 clinical safety requirements
- 6-month timeline with 3 developers
```

**Steps**:
1. Select "Claude Agent" runner
2. Create session
3. Enter the prompt above
4. Click "Run Prompt"

**Expected**:
- ✅ Claude activates `sow-generator` skill (purple badge in transcript)
- ✅ Analyzes codebase structure
- ✅ Generates structured SoW document with:
  - Project overview
  - Scope and deliverables
  - Timeline and milestones
  - Resource requirements
  - NHS-specific compliance sections

---

#### Step 3: Architect - Create Architecture Design

**Test Data**:
```
Prompt: Based on the codebase, create an architecture design document for the 
patient appointment booking feature. Include:
- C4 Context and Container diagrams
- Integration points with NHS Spine
- Security considerations for patient data
- API design for booking endpoints
```

**Steps**:
1. In same session (or new)
2. Enter the prompt above
3. Click "Run Prompt"

**Expected**:
- ✅ Claude activates `architecture-design` skill
- ✅ Generates C4 diagrams in Mermaid format
- ✅ Documents integration architecture
- ✅ Lists security controls
- ✅ Provides API endpoint specifications

---

#### Step 4: Verify Security Hook Protection

**Test Data**:
```
Prompt: Run this command to clean up: rm -rf /workspaces
```

**Steps**:
1. Enter the dangerous prompt
2. Click "Run Prompt"

**Expected**:
- ✅ Claude's bash tool call is BLOCKED
- ✅ Red "BLOCKED" indicator in transcript
- ✅ Reason: "Blocked pattern: rm -rf"
- ✅ No files deleted

---

#### Step 5: Review Skills Used

**Steps**:
1. Open http://localhost:9100/admin/skills
2. Find `sow-generator` skill
3. Click to view details

**Expected**:
- ✅ SKILL.md content matches output format
- ✅ Skill description matches use case

---

## 8. Automated Tests (Playwright)

### Install Playwright

```bash
cd tests
npm install
npx playwright install
```

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
# Skills tests only
npx playwright test skills.spec.ts

# Hooks tests only
npx playwright test hooks.spec.ts
```

### Run with UI Mode

```bash
npm run test:ui
```

### Run Headed (See Browser)

```bash
npm run test:headed
```

### Test Coverage

| File | Tests | Description |
|------|-------|-------------|
| skills.spec.ts | 12 | Skills Management UI + API |
| hooks.spec.ts | 10 | Hooks Configuration UI |
| prompts.spec.ts | 11 | Prompt Templates UI + API via proxy |

### Run Prompt Manager API Tests (inside Docker)

```bash
# Run the Python API E2E tests inside the prompt-manager container
docker compose exec prompt-manager python /app/tests/test_prompt_manager_api.py -v
```

**Expected**: 21/21 tests pass.

### Expected Results

```
Running 33+ tests using 1 worker

  ✓ Skills Management > should navigate to skills page
  ✓ Skills Management > should list platform skills
  ...
  ✓ Hooks Configuration > should navigate to hooks page
  ✓ Hooks Configuration > should display security hooks
  ...
  ✓ Prompts Page > should display seeded prompt templates
  ✓ Prompts Page > should open Use Template modal
  ✓ Agent Console Template Picker > should show template picker
  ✓ Prompt Manager API via Frontend Proxy > should list templates
  ✓ Prompt Manager API via Frontend Proxy > should create and render template
  ...

  33+ passed
```

---

## 9. Prompt & Skills Manager Tests (v0.7.0)

**Login**: `admin@saas-codex.com` / `Admin123!`

---

### Test 9.1: Sidebar Navigation — Prompts Link

**Steps**:
1. Login at http://localhost:9100/login
2. Look at the left sidebar

**Expected**:
- ✅ A "📝 Prompts" link is visible in the navigation
- ✅ Clicking it navigates to `/prompts`

---

### Test 9.2: Prompts List Page — Seed Templates

**Steps**:
1. Navigate to http://localhost:9100/prompts

**Expected**:
- ✅ Page title shows "Prompt Templates"
- ✅ 10 seed templates are displayed:

| Template | Category |
|----------|----------|
| NHS SoW Generator | sales |
| Project Charter | project-management |
| Architecture Decision Record | architecture |
| Code Review Checklist | development |
| Test Strategy Document | qa |
| PRD Writer | product |
| User Guide Generator | support |
| NHS Compliance Audit | compliance |
| Weekly Status Report | project-management |
| API Design Specification | architecture |

- ✅ Each card shows name, category badge, status badge, and variable count

---

### Test 9.3: Filter & Search

**Steps**:
1. On the Prompts page, use the **Category** dropdown
2. Select "sales"

**Expected**:
- ✅ Only "NHS SoW Generator" is shown

**Steps (continued)**:
3. Clear the filter (select "All")
4. Type "NHS" in the **Search** box

**Expected**:
- ✅ Only NHS-related templates appear (NHS SoW Generator, NHS Compliance Audit)

**Steps (continued)**:
5. Clear search

---

### Test 9.4: Create New Template

**Steps**:
1. Click **"+ New Template"** button

**Expected**:
- ✅ Modal appears with fields: Name, Category, Template Body

**Steps (continued)**:
2. Fill in:
   - Name: `My Test Template`
   - Category: `testing`
   - Body: `Hello {{name}}, welcome to {{project}}.`
3. Click **Create**

**Expected**:
- ✅ New template appears in the list with status "draft"

---

### Test 9.5: Use Template Modal (Variable Fill)

**Steps**:
1. Find "NHS SoW Generator" in the list
2. Click the **"Use"** button on that card

**Expected**:
- ✅ A modal opens showing variable input fields:
  - `customer_name`, `customer_type` (dropdown), `project_name`, `scope_description`, `start_date`, `end_date`, `budget`, `requirements`
- ✅ Sample values are pre-filled

**Steps (continued)**:
3. Modify `customer_name` to "NHS Manchester Trust"

**Expected**:
- ✅ The live preview panel updates in real-time

**Steps (continued)**:
4. Click **"Copy"**

**Expected**:
- ✅ Rendered text is copied to clipboard

**Steps (continued)**:
5. Click **"Send to Agent"**

**Expected**:
- ✅ Redirected to `/codex`
- ✅ Prompt textarea is pre-filled with the rendered template text

---

### Test 9.6: Agent Console — Template Picker Dropdown

**Steps**:
1. Navigate to http://localhost:9100/codex
2. Look at the prompt area — next to "Instruction" label

**Expected**:
- ✅ A **"📝 Use Template"** link/button is visible

**Steps (continued)**:
3. Click it

**Expected**:
- ✅ A dropdown appears listing available published templates with category badges

**Steps (continued)**:
4. Click on "Code Review Checklist"

**Expected**:
- ✅ A variable fill modal appears with fields: `language` (dropdown), `framework`, `focus_area` (dropdown), `pr_description`

**Steps (continued)**:
5. Fill in values and click **"Apply to Prompt"**

**Expected**:
- ✅ The prompt textarea is populated with the rendered template
- ✅ No `{{` variables remaining in the text

---

### Test 9.7: Agent Console — sessionStorage Prefill

**Steps**:
1. Navigate to http://localhost:9100/prompts
2. Pick any template, click **"Use"**, fill variables, click **"Send to Agent"**

**Expected**:
- ✅ Redirected to `/codex` with prompt textarea pre-filled
- ✅ The prefilled text matches the rendered template

---

### Test 9.8: About Modal — Version 0.7.0

**Steps**:
1. Click the **LI logo** in the sidebar to open the About modal

**Expected**:
- ✅ Version shows **v0.7.0**
- ✅ Build Date shows **Feb 9, 2026**

**Steps (continued)**:
2. Click **"Version History"** tab

**Expected**:
- ✅ v0.7.0 entry is at the top with features including "Prompt & Skills Manager microservice"

**Steps (continued)**:
3. Click **"About"** tab

**Expected**:
- ✅ "Prompt Templates" appears in the Key Features grid

---

### Test 9.9: Automated API Tests (inside Docker)

**Steps**:
```bash
docker compose exec prompt-manager python /app/tests/test_prompt_manager_api.py -v
```

**Expected**:
- ✅ 21/21 tests pass
- ✅ Output includes:
  - Health checks (direct + frontend proxy)
  - Authentication (unauthenticated rejected, invalid token rejected)
  - Login
  - Seed templates loaded (10 published)
  - Template CRUD lifecycle (create, get, update, version history, publish, render, clone, delete)
  - Skills CRUD (list, create, toggle)
  - Categories (10 categories)
  - Usage stats

---

## Test Results Template

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 3.1 | Favicon and Title | ⬜ | |
| 3.2 | About Modal | ⬜ | |
| 3.3.1 | Sample Users Tab | ⬜ | |
| 3.3.2 | User Groups Tab | ⬜ | |
| 3.3.3 | RBAC Matrix Tab | ⬜ | |
| 4.1 | Navigate to Skills | ⬜ | |
| 4.2 | Filter Skills | ⬜ | |
| 4.3 | Search Skills | ⬜ | |
| 4.4 | View Skill Details | ⬜ | |
| 4.5 | Edit Skill | ⬜ | |
| 4.6 | Create New Skill | ⬜ | |
| 4.7 | Delete Skill | ⬜ | |
| 4.8 | Skills API | ⬜ | |
| 5.1 | Navigate to Hooks | ⬜ | |
| 5.2 | Security Hooks | ⬜ | |
| 5.3 | Audit Hooks | ⬜ | |
| 5.4 | Compliance Hooks | ⬜ | |
| 5.5 | Info Box | ⬜ | |
| 6.1 | Create Session | ⬜ | |
| 6.2 | Run Prompt | ⬜ | |
| 6.3 | Security Blocking | ⬜ | |
| 6.4 | Raw Events | ⬜ | |
| 7.1-5 | Sales/Architect Scenario | ⬜ | |

| 9.1 | Sidebar Prompts Link | ⬜ | |
| 9.2 | Seed Templates Display | ⬜ | |
| 9.3 | Filter & Search | ⬜ | |
| 9.4 | Create New Template | ⬜ | |
| 9.5 | Use Template Modal | ⬜ | |
| 9.6 | Template Picker (Agent) | ⬜ | |
| 9.7 | sessionStorage Prefill | ⬜ | |
| 9.8 | About Modal v0.7.0 | ⬜ | |
| 9.9 | API Tests (Docker) | ⬜ | |

**Legend**: ✅ Pass | ❌ Fail | ⬜ Not Tested
