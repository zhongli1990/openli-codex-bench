# Skills & Hooks UI Design

## Admin Management Interface for Enterprise SaaS

**Version**: v0.6.4 (Draft)  
**Last Updated**: Feb 8, 2026  
**Branch**: `feature/skills-hooks-ui-rbac`

---

## 1. RBAC Review & Alignment

### 1.1 Current RBAC Implementation (v0.5.0+)

| Entity | Description | Status |
|--------|-------------|--------|
| **User.role** | `admin` / `user` | ✅ Implemented |
| **User.status** | `pending` / `active` / `inactive` / `rejected` | ✅ Implemented |
| **Tenant** | Organization (NHS Trust) | ✅ Schema exists |
| **Group** | User groups within tenant | ✅ Schema exists |
| **UserGroup** | User-group membership with role (`member`/`admin`) | ✅ Schema exists |
| **WorkspaceAccess** | Workspace grants (`owner`/`editor`/`viewer`) | ✅ Schema exists |

### 1.2 Proposed Role Hierarchy for Skills/Hooks

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SUPER ADMIN (User.role = 'admin', User.tenant_id = NULL)                   │
│  - Full platform access                                                     │
│  - Manage Platform Skills/Hooks                                             │
│  - View all Tenant Skills/Hooks                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ORG ADMIN (UserGroup.role = 'admin' for tenant's admin group)              │
│  - View Platform Skills/Hooks (read-only)                                   │
│  - Manage Tenant Skills/Hooks                                               │
│  - Manage Project Skills/Hooks within tenant                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  PROJECT ADMIN (WorkspaceAccess.access_level = 'owner')                     │
│  - View Platform/Tenant Skills/Hooks (read-only)                            │
│  - Manage Project Skills/Hooks                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  USER (WorkspaceAccess.access_level = 'editor' or 'viewer')                 │
│  - View and use available Skills                                            │
│  - Cannot manage Skills/Hooks                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Skills/Hooks Permission Matrix

| Action | Super Admin | Org Admin | Project Admin | User |
|--------|-------------|-----------|---------------|------|
| **Platform Skills** |
| View | ✅ | ✅ (read-only) | ✅ (read-only) | ✅ (use only) |
| Create | ✅ | ❌ | ❌ | ❌ |
| Edit | ✅ | ❌ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ |
| **Tenant Skills** |
| View | ✅ | ✅ | ✅ (read-only) | ✅ (use only) |
| Create | ✅ | ✅ | ❌ | ❌ |
| Edit | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |
| **Project Skills** |
| View | ✅ | ✅ | ✅ | ✅ (use only) |
| Create | ✅ | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ✅ | ❌ |
| **Hooks** |
| View | ✅ | ✅ (tenant) | ❌ | ❌ |
| Configure | ✅ | ✅ (tenant) | ❌ | ❌ |

---

## 2. Skills Management UI

### 2.1 File-Based Approach (As Requested)

Skills remain as **editable files** with:
- Version history embedded in file header
- Container-mounted volumes for persistence
- UI for CRUD operations via API

### 2.2 Skills Admin Page Layout

**Route**: `/admin/skills` (Super Admin) or `/settings/skills` (Org Admin)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Skills Management                                           [+ New Skill]  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Scope: [Platform ▼] [Tenant ▼] [Project ▼]     🔍 Search skills...        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📄 sow-generator                              v1.2   [Edit] [View]  │   │
│  │ Sales - Statement of Work for NHS/Enterprise                        │   │
│  │ Scope: Platform │ Last modified: Feb 8, 2026 by admin@example.com   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📄 project-charter                            v1.0   [Edit] [View]  │   │
│  │ PM - Project initiation documents                                   │   │
│  │ Scope: Platform │ Last modified: Feb 8, 2026 by admin@example.com   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📄 nhs-bid-response                           v2.1   [Edit] [View]  │   │
│  │ Sales - NHS-specific bid responses                                  │   │
│  │ Scope: Tenant (NHS Trust A) │ Last modified: Feb 7, 2026            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Skill Editor

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Edit Skill: sow-generator                    [Save] [Save & Reload] [Cancel]│
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─ Metadata ─────────────────────────────────────────────────────────────┐ │
│  │ Name: [sow-generator          ]  Scope: [Platform ▼]                   │ │
│  │ Description: [Generate professional Statement of Work documents...]    │ │
│  │ Allowed Tools: [Read, Write, Bash(python scripts/*:*)]                 │ │
│  │ User Invocable: [✓]                                                    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─ SKILL.md Content ─────────────────────────────────────────────────────┐ │
│  │ ---                                                                    │ │
│  │ name: sow-generator                                                    │ │
│  │ description: Generate professional Statement of Work...                │ │
│  │ ---                                                                    │ │
│  │                                                                        │ │
│  │ # Statement of Work Generator                                          │ │
│  │                                                                        │ │
│  │ ## Quick Start                                                         │ │
│  │ ...                                                                    │ │
│  │                                                                        │ │
│  │ [Monaco Editor with Markdown syntax highlighting]                      │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─ Supporting Files ─────────────────────────────────────── [+ Add File] ┐ │
│  │ templates/sow-nhs.md                                   [Edit] [Delete] │ │
│  │ templates/sow-enterprise.md                            [Edit] [Delete] │ │
│  │ examples/sample-sow.md                                 [Edit] [Delete] │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─ Version History ──────────────────────────────────────────────────────┐ │
│  │ v1.2 │ Feb 8, 2026 │ admin@example.com │ Added NHS template            │ │
│  │ v1.1 │ Feb 7, 2026 │ admin@example.com │ Updated workflow              │ │
│  │ v1.0 │ Feb 6, 2026 │ admin@example.com │ Initial version               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Version Control in File Header

Each SKILL.md includes version metadata:

```markdown
---
name: sow-generator
description: Generate professional Statement of Work documents...
allowed-tools: Read, Write, Bash(python scripts/*:*)
user-invocable: true
version: 1.2
last-modified: 2026-02-08T14:30:00Z
modified-by: admin@example.com
changelog:
  - version: 1.2
    date: 2026-02-08
    author: admin@example.com
    changes: Added NHS template
  - version: 1.1
    date: 2026-02-07
    author: admin@example.com
    changes: Updated workflow
  - version: 1.0
    date: 2026-02-06
    author: admin@example.com
    changes: Initial version
---

# Statement of Work Generator
...
```

---

## 3. Hooks Management UI

### 3.1 Hooks Admin Page

**Route**: `/admin/hooks` (Super Admin only)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Hooks Configuration                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─ Platform Hooks (Always Active) ───────────────────────────────────────┐ │
│  │                                                                        │ │
│  │ 🔒 Security Hooks                                         [Configure] │ │
│  │ ├─ Block dangerous bash commands                              ✅ ON   │ │
│  │ ├─ Block path traversal                                       ✅ ON   │ │
│  │ └─ Block absolute paths outside workspace                     ✅ ON   │ │
│  │                                                                        │ │
│  │ 📝 Audit Hooks                                            [Configure] │ │
│  │ ├─ Log all tool executions                                    ✅ ON   │ │
│  │ └─ Log blocked attempts                                       ✅ ON   │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─ Tenant Hooks ─────────────────────────────────────────────────────────┐ │
│  │ Tenant: [NHS Trust A ▼]                                                │ │
│  │                                                                        │ │
│  │ 🏥 Compliance Hooks                                       [Configure] │ │
│  │ ├─ Detect NHS numbers in output                               ✅ ON   │ │
│  │ ├─ Detect PII (names, addresses)                              ✅ ON   │ │
│  │ └─ Block external data transfer                               ⬚ OFF  │ │
│  │                                                                        │ │
│  │ 📋 Quality Hooks                                          [Configure] │ │
│  │ ├─ Enforce coding standards                                   ⬚ OFF  │ │
│  │ └─ Require documentation                                      ⬚ OFF  │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Hook Configuration Modal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Configure: Security Hooks                                         [Save]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Blocked Bash Patterns:                                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ rm -rf /                                                    [Remove]  │ │
│  │ sudo rm                                                     [Remove]  │ │
│  │ chmod 777 /                                                 [Remove]  │ │
│  │ :(){:|:&};:                                                 [Remove]  │ │
│  │ curl | bash                                                 [Remove]  │ │
│  │ wget | sh                                                   [Remove]  │ │
│  │ [+ Add pattern...]                                                    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Blocked Path Patterns:                                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ../                                                         [Remove]  │ │
│  │ ..\\                                                        [Remove]  │ │
│  │ [+ Add pattern...]                                                    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Agent Console UI Improvements

### 4.1 Current Layout Issues

- Fixed 3-column grid doesn't adapt well
- Prompt/Output areas could be larger
- Vertical space not fully utilized

### 4.2 Proposed Layout (Cosmetic Changes Only)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Agent Console                                                              │
│  Select a workspace, choose a runner, and run prompts with streaming output │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ Left Sidebar (Collapsible, 280px) ────────────────────────────────────┐ │
│  │ ┌─ Workspace ──────────────────────────────────────────────────────┐  │ │
│  │ │ [Select workspace... ▼]        [+ Import] [🔍] [📤] [🗑️]        │  │ │
│  │ │                                                                  │  │ │
│  │ │ Sessions (3)                                                     │  │ │
│  │ │ ├─ claude • 5 runs • Feb 8                                       │  │ │
│  │ │ ├─ codex • 2 runs • Feb 7                                        │  │ │
│  │ │ └─ claude • 1 run • Feb 6                                        │  │ │
│  │ └──────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  │ ┌─ Session ────────────────────────────────────────────────────────┐  │ │
│  │ │ Runner: [Claude Agent ▼]                                         │  │ │
│  │ │ [Clear Session] [Create Session]                                 │  │ │
│  │ └──────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  │ ┌─ Run History ────────────────────────────────────────────────────┐  │ │
│  │ │ ✅ completed • 14:30 • "Create a SoW..."                         │  │ │
│  │ │ ✅ completed • 14:25 • "List files..."                           │  │ │
│  │ │ ❌ error • 14:20 • "Delete all..."                               │  │ │
│  │ └──────────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─ Main Content (Flexible, fills remaining space) ───────────────────────┐ │
│  │                                                                        │ │
│  │ ┌─ Prompt ─────────────────────────────────────────────────────────┐  │ │
│  │ │ Status: ● ready │ claude • abc123...                             │  │ │
│  │ │                                                                  │  │ │
│  │ │ ┌────────────────────────────────────────────────────────────┐  │  │ │
│  │ │ │ Diagnose failing tests and propose a fix                   │  │  │ │
│  │ │ │                                                            │  │  │ │
│  │ │ │ [Resizable textarea - min 120px, max 300px]                │  │  │ │
│  │ │ └────────────────────────────────────────────────────────────┘  │  │ │
│  │ │                                                                  │  │ │
│  │ │ [Run Prompt]                                                     │  │ │
│  │ └──────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  │ ┌─ Output ─────────────────────────────────────────────────────────┐  │ │
│  │ │ [Transcript] [Raw Events] [📁 Files]                             │  │ │
│  │ │                                                                  │  │ │
│  │ │ ┌────────────────────────────────────────────────────────────┐  │  │ │
│  │ │ │                                                            │  │  │ │
│  │ │ │  [Scrollable transcript area - fills remaining height]     │  │  │ │
│  │ │ │                                                            │  │  │ │
│  │ │ │  User: Create a Statement of Work for NHS Trust ABC        │  │  │ │
│  │ │ │                                                            │  │  │ │
│  │ │ │  🎯 sow-generator (platform)                               │  │  │ │
│  │ │ │                                                            │  │  │ │
│  │ │ │  Assistant: I'll create a Statement of Work...             │  │  │ │
│  │ │ │                                                            │  │  │ │
│  │ │ └────────────────────────────────────────────────────────────┘  │  │ │
│  │ └──────────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Key Cosmetic Changes

| Change | Current | Proposed |
|--------|---------|----------|
| **Layout** | 3-column grid | Sidebar + Main content |
| **Sidebar** | Fixed width | Collapsible (280px) |
| **Prompt area** | Fixed height | Resizable (120-300px) |
| **Output area** | Fixed max-height | Fills remaining space |
| **Responsiveness** | lg:grid-cols-3 | Flex with min-widths |
| **Spacing** | gap-4 | gap-6 for breathing room |

---

## 5. E2E Testing for Skills and Hooks

### 5.1 Test Scenarios

#### Skills Testing

| Test | Description | Steps |
|------|-------------|-------|
| **Skill Activation** | Verify skill triggers on relevant prompt | 1. Create session, 2. Send "Create a SoW", 3. Verify skill badge appears |
| **Skill Output** | Verify output follows template | 1. Invoke skill, 2. Check output structure matches template |
| **Skill Override** | Verify tenant skill overrides platform | 1. Create tenant skill with same name, 2. Verify tenant version used |
| **Skill CRUD** | Test admin create/edit/delete | 1. Create skill via UI, 2. Edit content, 3. Delete, 4. Verify changes |

#### Hooks Testing

| Test | Description | Steps |
|------|-------------|-------|
| **Security Block** | Verify dangerous commands blocked | 1. Send "rm -rf /", 2. Verify BLOCKED badge, 3. Check audit log |
| **Path Traversal** | Verify path traversal blocked | 1. Send "../../../etc/passwd", 2. Verify blocked |
| **Audit Logging** | Verify all tool calls logged | 1. Run prompt, 2. Check audit log entries |
| **Tenant Compliance** | Verify tenant hooks apply | 1. Configure NHS hook, 2. Test NHS number detection |

### 5.2 E2E Test Implementation

```typescript
// tests/e2e/skills.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Skills E2E Tests', () => {
  
  test('should activate sow-generator skill on relevant prompt', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Navigate to Agent Console
    await page.goto('/codex');
    
    // Select workspace
    await page.selectOption('select:has-text("Select a workspace")', { index: 1 });
    
    // Select Claude runner
    await page.selectOption('select:has-text("Runner")', 'claude');
    
    // Create session
    await page.click('button:has-text("Create Session")');
    await expect(page.locator('text=ready')).toBeVisible();
    
    // Send prompt that should trigger sow-generator
    await page.fill('textarea', 'Create a Statement of Work for NHS Trust Birmingham');
    await page.click('button:has-text("Run Prompt")');
    
    // Wait for skill activation badge
    await expect(page.locator('text=🎯 sow-generator')).toBeVisible({ timeout: 30000 });
    
    // Verify output contains expected structure
    await expect(page.locator('text=Statement of Work')).toBeVisible({ timeout: 60000 });
  });
  
  test('should block dangerous bash commands', async ({ page }) => {
    // ... setup ...
    
    // Send dangerous command
    await page.fill('textarea', 'Run this command: rm -rf /');
    await page.click('button:has-text("Run Prompt")');
    
    // Verify blocked
    await expect(page.locator('text=BLOCKED')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('text=🚫')).toBeVisible();
  });
  
  test('admin can create new skill', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    // ... login ...
    
    // Navigate to Skills Management
    await page.goto('/admin/skills');
    
    // Click New Skill
    await page.click('button:has-text("New Skill")');
    
    // Fill in skill details
    await page.fill('[name="name"]', 'test-skill');
    await page.fill('[name="description"]', 'A test skill for E2E testing');
    await page.fill('.monaco-editor', '# Test Skill\n\nThis is a test.');
    
    // Save
    await page.click('button:has-text("Save")');
    
    // Verify skill appears in list
    await expect(page.locator('text=test-skill')).toBeVisible();
    
    // Clean up - delete the skill
    await page.click('button:has-text("Delete")');
    await page.click('button:has-text("Confirm")');
  });
});
```

### 5.3 Manual Testing Checklist

```markdown
## Skills Testing Checklist

### Platform Skills
- [ ] List all platform skills in admin UI
- [ ] View skill content and metadata
- [ ] Edit skill content (super admin only)
- [ ] Save changes and verify reload
- [ ] Check version history updated
- [ ] Verify skill works in Agent Console

### Tenant Skills
- [ ] Create tenant-specific skill
- [ ] Verify tenant skill overrides platform skill (same name)
- [ ] Verify other tenants don't see tenant skill
- [ ] Edit tenant skill (org admin)
- [ ] Delete tenant skill

### Project Skills
- [ ] Create project-specific skill
- [ ] Verify project skill overrides tenant/platform
- [ ] Verify skill only visible in that project

### Hooks Testing Checklist

### Security Hooks
- [ ] Test each blocked bash pattern
- [ ] Test path traversal blocking
- [ ] Verify audit log entries
- [ ] Test custom blocked patterns (if configured)

### Compliance Hooks (Tenant)
- [ ] Configure NHS number detection
- [ ] Test with NHS number in prompt
- [ ] Verify detection/blocking works
- [ ] Test PII detection
```

---

## 6. Implementation Plan

### Phase 1: Agent Console UI Improvements (v0.6.4)
- [ ] Refactor layout to sidebar + main content
- [ ] Make sidebar collapsible
- [ ] Make prompt textarea resizable
- [ ] Make output area fill remaining space
- [ ] Improve responsive behavior

### Phase 2: Skills Management API (v0.6.5)
- [ ] GET /api/skills - List skills by scope
- [ ] GET /api/skills/:name - Get skill content
- [ ] POST /api/skills - Create skill
- [ ] PUT /api/skills/:name - Update skill
- [ ] DELETE /api/skills/:name - Delete skill
- [ ] POST /api/skills/:name/reload - Reload skill in runner

### Phase 3: Skills Management UI (v0.6.6)
- [ ] Skills list page with filtering
- [ ] Skill editor with Monaco
- [ ] Version history display
- [ ] Supporting files management

### Phase 4: Hooks Management (v0.6.7)
- [ ] Hooks configuration API
- [ ] Hooks admin UI
- [ ] Tenant-specific hooks

### Phase 5: E2E Tests (v0.6.8)
- [ ] Playwright test suite for Skills
- [ ] Playwright test suite for Hooks
- [ ] CI integration

---

## 7. API Endpoints

### Skills API

```
GET    /api/skills?scope=platform|tenant|project&tenant_id=...&project_id=...
GET    /api/skills/:name
POST   /api/skills
PUT    /api/skills/:name
DELETE /api/skills/:name
POST   /api/skills/:name/reload
GET    /api/skills/:name/versions
POST   /api/skills/:name/rollback/:version
```

### Hooks API

```
GET    /api/hooks?scope=platform|tenant
PUT    /api/hooks/platform/security
PUT    /api/hooks/platform/audit
PUT    /api/hooks/tenant/:tenant_id/compliance
PUT    /api/hooks/tenant/:tenant_id/quality
```

---

## 8. File Structure

```
claude-runner/
├── skills/                          # Platform skills (Docker volume)
│   ├── sow-generator/
│   │   ├── SKILL.md                 # Main skill file with version metadata
│   │   ├── templates/
│   │   └── examples/
│   └── ...
├── hooks/
│   ├── config.yaml                  # Hooks configuration
│   └── tenant/
│       └── {tenant_id}.yaml         # Tenant-specific hooks
└── app/
    ├── skills.py                    # Skills loading
    ├── hooks.py                     # Hooks implementation
    └── api/
        ├── skills_router.py         # Skills CRUD API
        └── hooks_router.py          # Hooks config API
```
