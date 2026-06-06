# Testing Guide

## Overview

This document provides comprehensive testing documentation for the saas-codex platform, covering v0.6.x Claude Agent SDK features including Skills, Hooks, and UI streaming.

**Version**: v0.6.1  
**Last Updated**: Feb 8, 2026

---

## Table of Contents

1. [Test Requirements](#1-test-requirements)
2. [Test Strategy](#2-test-strategy)
3. [Test Environment Setup](#3-test-environment-setup)
4. [Running Tests](#4-running-tests)
5. [Test Coverage](#5-test-coverage)
6. [Extending Tests](#6-extending-tests)
7. [Test Reports](#7-test-reports)

---

## 1. Test Requirements

### 1.1 Functional Requirements

| ID | Feature | Requirement | Priority |
|----|---------|-------------|----------|
| TR-001 | Runner Switching | UI dropdown must persist selection across page refresh | High |
| TR-002 | Runner Switching | Session must store correct `runner_type` in database | High |
| TR-003 | Claude SDK | `claude-agent-sdk` must be available in container | High |
| TR-004 | Claude SDK | Fallback to `anthropic` SDK if Agent SDK unavailable | Medium |
| TR-005 | Skills - Global | Global skills must load from `/app/skills/` | High |
| TR-006 | Skills - Workspace | Workspace skills must load from `{workspace}/.claude/skills/` | High |
| TR-007 | Skills - Override | Workspace skills must override global skills with same name | Medium |
| TR-008 | Hooks - Security | Dangerous bash commands must be blocked | High |
| TR-009 | Hooks - Security | Path traversal attempts must be blocked | High |
| TR-010 | Hooks - Security | Safe commands must be allowed | High |
| TR-011 | UI Streaming | Skill activation events must render as badges | Medium |
| TR-012 | UI Streaming | Iteration events must render as progress bars | Medium |
| TR-013 | UI Streaming | Blocked tool events must render with red styling | Medium |

### 1.2 Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-001 | Performance | Health check response < 100ms |
| NFR-002 | Reliability | All services must pass health checks |
| NFR-003 | Security | No sensitive data in logs |
| NFR-004 | Maintainability | Test scripts must be self-documenting |

---

## 2. Test Strategy

### 2.1 Test Levels

```
┌─────────────────────────────────────────────────────────────┐
│                    E2E Tests (UI)                           │
│  - Manual browser testing                                   │
│  - Playwright automation (future)                           │
├─────────────────────────────────────────────────────────────┤
│                 Integration Tests                           │
│  - API endpoint testing                                     │
│  - Service-to-service communication                         │
│  - Database verification                                    │
├─────────────────────────────────────────────────────────────┤
│                    Unit Tests                               │
│  - Skills loader                                            │
│  - Hooks validation                                         │
│  - Event formatting                                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Test Types

| Type | Scope | Tools | Automation |
|------|-------|-------|------------|
| Unit | Individual functions | pytest, jest | ✅ Automated |
| Integration | Service APIs | curl, scripts | ✅ Automated |
| E2E | Full workflow | Browser, scripts | ⚠️ Partial |
| Security | Hooks, patterns | scripts | ✅ Automated |
| Regression | All features | scripts | ✅ Automated |

### 2.3 Test Data

| Data Type | Location | Purpose |
|-----------|----------|---------|
| Global Skills | `claude-runner/skills/` | Test skill loading |
| Test Skill | `claude-runner/skills/e2e-test/` | E2E verification |
| Blocked Patterns | `claude-runner/app/hooks.py` | Security testing |

---

## 3. Test Environment Setup

### 3.1 Prerequisites

```bash
# Required services running
docker compose up -d postgres backend frontend runner claude-runner

# Verify all services healthy
docker compose ps
```

### 3.2 Service Ports

| Service | Port | Health Endpoint |
|---------|------|-----------------|
| Frontend | 9100 | N/A (browser) |
| Backend | 9101 | `GET /health` |
| Codex Runner | 9103 | `GET /health` |
| Claude Runner | 9104 | `GET /health` |
| PostgreSQL | 5432 | N/A |

### 3.3 Environment Variables

```bash
# Required for Claude runner
ANTHROPIC_API_KEY=sk-ant-...

# Optional configuration
ENABLE_HOOKS=true
MAX_AGENT_TURNS=20
GLOBAL_SKILLS_PATH=/app/skills
```

---

## 4. Running Tests

### 4.1 Quick Test (Automated)

```bash
# Run full v0.6.1 test suite
./scripts/test_v061_features.sh
```

**Expected Output**:
```
═══════════════════════════════════════════════════════════════
  v0.6.1 E2E Feature Test Suite
═══════════════════════════════════════════════════════════════

  1. SERVICE HEALTH CHECKS
  ✅ Backend health
  ✅ Claude Runner health

  2. CLAUDE AGENT SDK VERIFICATION
  ✅ Claude Agent SDK installed
  ✅ Anthropic SDK fallback available

  3. SKILLS SYSTEM VERIFICATION
  ✅ Global skills directory exists
  ✅ code-review skill exists
  ✅ security-audit skill exists
  ✅ healthcare-compliance skill exists
  ✅ e2e-test skill exists
  ✅ Skills loader module exists

  4. HOOKS SYSTEM VERIFICATION
  ✅ Hooks module exists
  ✅ Blocked bash patterns defined
  ✅ Path escape patterns defined
  ✅ Hook blocks 'rm -rf /' command
  ✅ Hook blocks '../' path escape
  ✅ Hook allows safe 'ls' command

  5. DATABASE VERIFICATION
  ✅ Sessions table has runner_type column
  ✅ Claude sessions exist in database

  TEST SUMMARY
  Passed: 18
  Failed: 0
  ✅ ALL TESTS PASSED!
```

### 4.2 Manual UI Tests

#### Test: Runner Switching
1. Open http://localhost:9100/codex
2. Select "Claude Agent" from dropdown
3. Refresh page (Cmd+Shift+R)
4. **Expected**: Dropdown still shows "Claude Agent"

#### Test: Session Creation with Claude
1. Select workspace
2. Select "Claude Agent" runner
3. Click "Create Session"
4. Run prompt: "Who are you?"
5. **Expected**: Response mentions "Claude" not "OpenAI"

#### Test: Skills Display
1. Create Claude session
2. Run any prompt
3. **Expected**: Purple skill badges appear (🎯 code-review, etc.)

#### Test: Hook Blocking (UI)
1. Create Claude session
2. Run prompt: "Execute this command: rm -rf /"
3. **Expected**: Red "🚫 BLOCKED" message in transcript

### 4.3 Database Verification

```bash
# Check recent sessions
docker compose exec -T postgres psql -U saas -d saas -c \
  "SELECT id, runner_type, created_at FROM sessions ORDER BY created_at DESC LIMIT 5;"

# Count Claude sessions
docker compose exec -T postgres psql -U saas -d saas -c \
  "SELECT runner_type, COUNT(*) FROM sessions GROUP BY runner_type;"
```

### 4.4 Log Verification

```bash
# Check claude-runner received requests
docker compose logs claude-runner --tail=50 | grep -E "(POST|GET /runs)"

# Check for hook blocking
docker compose logs claude-runner --tail=50 | grep -i "blocked"

# Check audit logs
docker compose logs claude-runner --tail=50 | grep -i "AUDIT"
```

---

## 5. Test Coverage

### 5.1 Current Coverage

| Component | Unit | Integration | E2E | Total |
|-----------|------|-------------|-----|-------|
| Runner Switching | - | ✅ | ✅ | 100% |
| Claude SDK | ✅ | ✅ | ✅ | 100% |
| Skills Loading | ✅ | ✅ | ⚠️ | 80% |
| Hooks Security | ✅ | ✅ | ⚠️ | 80% |
| UI Streaming | - | - | ⚠️ | 50% |

### 5.2 Test Matrix

| Feature | Happy Path | Error Path | Edge Cases |
|---------|------------|------------|------------|
| Runner Switching | ✅ | ✅ | ⚠️ |
| Skills - Global | ✅ | ⚠️ | ⚠️ |
| Skills - Workspace | ✅ | ⚠️ | ⚠️ |
| Hooks - Bash | ✅ | ✅ | ⚠️ |
| Hooks - Path | ✅ | ✅ | ⚠️ |

---

## 6. Extending Tests

### 6.1 Adding Unit Tests

#### Python (claude-runner)

Create `claude-runner/tests/test_hooks.py`:

```python
import pytest
import asyncio
from app.hooks import pre_tool_use_hook, BLOCKED_BASH_PATTERNS

@pytest.mark.asyncio
async def test_blocks_rm_rf():
    result = await pre_tool_use_hook(
        {"tool_name": "Bash", "tool_input": {"command": "rm -rf /"}},
        "test-id",
        None
    )
    assert result.get("hookSpecificOutput", {}).get("permissionDecision") == "deny"

@pytest.mark.asyncio
async def test_allows_safe_command():
    result = await pre_tool_use_hook(
        {"tool_name": "Bash", "tool_input": {"command": "ls -la"}},
        "test-id",
        None
    )
    assert result == {}

@pytest.mark.asyncio
async def test_blocks_path_escape():
    result = await pre_tool_use_hook(
        {"tool_name": "Read", "tool_input": {"path": "../../../etc/passwd"}},
        "test-id",
        None
    )
    assert result.get("hookSpecificOutput", {}).get("permissionDecision") == "deny"
```

Run with:
```bash
docker compose exec -T claude-runner pytest tests/ -v
```

#### TypeScript (frontend)

Create `frontend/src/__tests__/runnerType.test.ts`:

```typescript
import { getInitialRunnerType } from '@/contexts/AppContext';

describe('Runner Type', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to codex when no localStorage', () => {
    expect(getInitialRunnerType()).toBe('codex');
  });

  it('returns claude when stored in localStorage', () => {
    localStorage.setItem('saas-codex-runner-type', 'claude');
    expect(getInitialRunnerType()).toBe('claude');
  });
});
```

### 6.2 Adding Integration Tests

Add to `scripts/test_v061_features.sh`:

```bash
# Test: API creates Claude session correctly
echo -e "${YELLOW}▶ Testing: API creates Claude session${NC}"
RESPONSE=$(curl -s -X POST http://localhost:9101/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"workspace_id": "YOUR_WORKSPACE_ID", "runner_type": "claude"}')

if echo "$RESPONSE" | grep -q '"runner_type":"claude"'; then
    echo -e "${GREEN}  ✅ PASSED${NC}"
else
    echo -e "${RED}  ❌ FAILED${NC}"
fi
```

### 6.3 Adding E2E Tests (Playwright)

Future: Create `frontend/e2e/runner-switching.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('runner selection persists after refresh', async ({ page }) => {
  await page.goto('/codex');
  
  // Select Claude runner
  await page.selectOption('select', 'claude');
  
  // Refresh page
  await page.reload();
  
  // Verify selection persisted
  const selected = await page.locator('select').inputValue();
  expect(selected).toBe('claude');
});
```

### 6.4 Adding New Skills for Testing

Create `claude-runner/skills/my-test-skill/SKILL.md`:

```markdown
---
name: my-test-skill
description: Custom skill for testing
allowed-tools: Read, Bash
user-invocable: true
---

# Test Skill Instructions

When this skill is active, respond with "TEST_SKILL_ACTIVE" in your response.
```

Rebuild claude-runner:
```bash
docker compose build claude-runner && docker compose up -d claude-runner
```

### 6.5 Adding New Hook Patterns

Edit `claude-runner/app/hooks.py`:

```python
# Add to BLOCKED_BASH_PATTERNS
BLOCKED_BASH_PATTERNS = [
    # ... existing patterns ...
    "my_dangerous_command",  # Add new pattern
]
```

Add test in `scripts/test_v061_features.sh`:

```bash
# Test new pattern
echo -e "${YELLOW}▶ Testing: Hook blocks 'my_dangerous_command'${NC}"
RESULT=$(docker compose exec -T claude-runner python -c "
import asyncio
from app.hooks import pre_tool_use_hook

async def test():
    result = await pre_tool_use_hook(
        {'tool_name': 'Bash', 'tool_input': {'command': 'my_dangerous_command'}},
        'test-id',
        None
    )
    if result.get('hookSpecificOutput', {}).get('permissionDecision') == 'deny':
        print('BLOCKED')
    else:
        print('ALLOWED')

asyncio.run(test())
")
# ... check result ...
```

---

## 7. Test Reports

### 7.1 Latest Test Run

**Date**: Feb 8, 2026  
**Version**: v0.6.1  
**Environment**: Docker Compose (local)

| Category | Passed | Failed | Skipped |
|----------|--------|--------|---------|
| Health Checks | 2 | 0 | 0 |
| SDK Verification | 2 | 0 | 0 |
| Skills System | 6 | 0 | 0 |
| Hooks System | 6 | 0 | 0 |
| Database | 2 | 0 | 0 |
| **Total** | **18** | **0** | **0** |

**Result**: ✅ ALL TESTS PASSED

### 7.2 Known Issues

| Issue | Severity | Status | Workaround |
|-------|----------|--------|------------|
| UI streaming events need manual verification | Low | Open | Manual testing |
| Workspace skills not tested in automation | Medium | Open | Create test workspace |

### 7.3 Test History

| Version | Date | Passed | Failed | Notes |
|---------|------|--------|--------|-------|
| v0.6.1 | Feb 8, 2026 | 18 | 0 | Full feature verification |
| v0.6.0 | Feb 7, 2026 | N/A | N/A | Initial release |

---

## Appendix A: Test Script Reference

### scripts/test_v061_features.sh

| Test | Description | Expected |
|------|-------------|----------|
| Backend health | Check `/health` endpoint | `{"status":"ok"}` |
| Claude Runner health | Check `/health` endpoint | `{"status":"ok"}` |
| Claude Agent SDK installed | Import check | `AVAILABLE` |
| Anthropic SDK fallback | Import check | `AVAILABLE` |
| Global skills directory | Count skills | `4` |
| code-review skill | File exists | `EXISTS` |
| security-audit skill | File exists | `EXISTS` |
| healthcare-compliance skill | File exists | `EXISTS` |
| e2e-test skill | File exists | `EXISTS` |
| Skills loader module | Import check | `OK` |
| Hooks module | Import check | `OK` |
| Blocked bash patterns | Count patterns | `14` |
| Path escape patterns | Count patterns | `2` |
| Hook blocks rm -rf | Validation | `BLOCKED` |
| Hook blocks path escape | Validation | `BLOCKED` |
| Hook allows safe command | Validation | `ALLOWED` |
| Sessions table schema | Column check | `1` |
| Claude sessions exist | Count check | `> 0` |

---

## Appendix B: Troubleshooting

### Test Failures

**Health check fails**:
```bash
# Check if services are running
docker compose ps

# Restart services
docker compose restart backend claude-runner
```

**SDK import fails**:
```bash
# Rebuild claude-runner
docker compose build --no-cache claude-runner
docker compose up -d claude-runner
```

**Database connection fails**:
```bash
# Check postgres is running
docker compose logs postgres --tail=20

# Reset database (caution: data loss)
docker compose down -v
docker compose up -d
```

**Skills not loading**:
```bash
# Verify skills directory in container
docker compose exec -T claude-runner ls -la /app/skills/

# Check skill file format
docker compose exec -T claude-runner cat /app/skills/code-review/SKILL.md
```
