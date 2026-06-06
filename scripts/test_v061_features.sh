#!/bin/bash
#
# v0.6.1 E2E Feature Test Script
# Tests: Claude Agent SDK, Skills, Hooks, UI Streaming
#
# Usage: ./scripts/test_v061_features.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKEND_URL="http://localhost:9101"
CLAUDE_RUNNER_URL="http://localhost:9104"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  v0.6.1 E2E Feature Test Suite${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run a test
run_test() {
    local test_name="$1"
    local test_cmd="$2"
    local expected="$3"
    
    echo -e "${YELLOW}▶ Testing: ${test_name}${NC}"
    
    result=$(eval "$test_cmd" 2>&1) || true
    
    if echo "$result" | grep -q "$expected"; then
        echo -e "${GREEN}  ✅ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}  ❌ FAILED${NC}"
        echo -e "${RED}  Expected: $expected${NC}"
        echo -e "${RED}  Got: $result${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Helper function to run a test with exact match
run_test_exact() {
    local test_name="$1"
    local test_cmd="$2"
    local expected="$3"
    
    echo -e "${YELLOW}▶ Testing: ${test_name}${NC}"
    
    result=$(eval "$test_cmd" 2>&1) || true
    
    if [ "$result" = "$expected" ]; then
        echo -e "${GREEN}  ✅ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}  ❌ FAILED${NC}"
        echo -e "${RED}  Expected: $expected${NC}"
        echo -e "${RED}  Got: $result${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo -e "${BLUE}─────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}  1. SERVICE HEALTH CHECKS${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────${NC}"

run_test "Backend health" \
    "curl -s ${BACKEND_URL}/health | grep -o '\"status\":\"ok\"'" \
    '"status":"ok"'

run_test "Claude Runner health" \
    "curl -s ${CLAUDE_RUNNER_URL}/health | grep -o '\"status\":\"ok\"'" \
    '"status":"ok"'

echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}  2. CLAUDE AGENT SDK VERIFICATION${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────${NC}"

run_test "Claude Agent SDK installed" \
    "docker compose exec -T claude-runner python -c 'from claude_agent_sdk import query; print(\"AVAILABLE\")'" \
    "AVAILABLE"

run_test "Anthropic SDK fallback available" \
    "docker compose exec -T claude-runner python -c 'import anthropic; print(\"AVAILABLE\")'" \
    "AVAILABLE"

echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}  3. SKILLS SYSTEM VERIFICATION${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────${NC}"

run_test "Global skills directory exists" \
    "docker compose exec -T claude-runner ls /app/skills/ | wc -l | tr -d ' '" \
    "4"

run_test "code-review skill exists" \
    "docker compose exec -T claude-runner test -f /app/skills/code-review/SKILL.md && echo 'EXISTS'" \
    "EXISTS"

run_test "security-audit skill exists" \
    "docker compose exec -T claude-runner test -f /app/skills/security-audit/SKILL.md && echo 'EXISTS'" \
    "EXISTS"

run_test "healthcare-compliance skill exists" \
    "docker compose exec -T claude-runner test -f /app/skills/healthcare-compliance/SKILL.md && echo 'EXISTS'" \
    "EXISTS"

run_test "e2e-test skill exists" \
    "docker compose exec -T claude-runner test -f /app/skills/e2e-test/SKILL.md && echo 'EXISTS'" \
    "EXISTS"

run_test "Skills loader module exists" \
    "docker compose exec -T claude-runner python -c 'from app.skills import load_all_skills; print(\"OK\")'" \
    "OK"

echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}  4. HOOKS SYSTEM VERIFICATION${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────${NC}"

run_test "Hooks module exists" \
    "docker compose exec -T claude-runner python -c 'from app.hooks import pre_tool_use_hook; print(\"OK\")'" \
    "OK"

# Check that we have at least 10 blocked patterns (flexible for future additions)
echo -e "${YELLOW}▶ Testing: Blocked bash patterns defined (>=10)${NC}"
PATTERN_COUNT=$(docker compose exec -T claude-runner python -c 'from app.hooks import BLOCKED_BASH_PATTERNS; print(len(BLOCKED_BASH_PATTERNS))')
if [ "$PATTERN_COUNT" -ge 10 ]; then
    echo -e "${GREEN}  ✅ PASSED (${PATTERN_COUNT} patterns)${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}  ❌ FAILED - Expected >=10, got: $PATTERN_COUNT${NC}"
    ((TESTS_FAILED++))
fi

run_test "Path escape patterns defined" \
    "docker compose exec -T claude-runner python -c 'from app.hooks import PATH_ESCAPE_PATTERNS; print(len(PATH_ESCAPE_PATTERNS))'" \
    "2"

# Test hook blocking logic
echo -e "${YELLOW}▶ Testing: Hook blocks 'rm -rf /' command${NC}"
HOOK_TEST=$(docker compose exec -T claude-runner python -c "
import asyncio
from app.hooks import pre_tool_use_hook

async def test():
    result = await pre_tool_use_hook(
        {'tool_name': 'Bash', 'tool_input': {'command': 'rm -rf /'}},
        'test-id',
        None
    )
    if result.get('hookSpecificOutput', {}).get('permissionDecision') == 'deny':
        print('BLOCKED')
    else:
        print('ALLOWED')

asyncio.run(test())
")
if echo "$HOOK_TEST" | grep -q "BLOCKED"; then
    echo -e "${GREEN}  ✅ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}  ❌ FAILED - Expected BLOCKED, got: $HOOK_TEST${NC}"
    ((TESTS_FAILED++))
fi

# Test path escape blocking
echo -e "${YELLOW}▶ Testing: Hook blocks '../' path escape${NC}"
PATH_TEST=$(docker compose exec -T claude-runner python -c "
import asyncio
from app.hooks import pre_tool_use_hook

async def test():
    result = await pre_tool_use_hook(
        {'tool_name': 'Read', 'tool_input': {'path': '../../../etc/passwd'}},
        'test-id',
        None
    )
    if result.get('hookSpecificOutput', {}).get('permissionDecision') == 'deny':
        print('BLOCKED')
    else:
        print('ALLOWED')

asyncio.run(test())
")
if echo "$PATH_TEST" | grep -q "BLOCKED"; then
    echo -e "${GREEN}  ✅ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}  ❌ FAILED - Expected BLOCKED, got: $PATH_TEST${NC}"
    ((TESTS_FAILED++))
fi

# Test safe command allowed
echo -e "${YELLOW}▶ Testing: Hook allows safe 'ls' command${NC}"
SAFE_TEST=$(docker compose exec -T claude-runner python -c "
import asyncio
from app.hooks import pre_tool_use_hook

async def test():
    result = await pre_tool_use_hook(
        {'tool_name': 'Bash', 'tool_input': {'command': 'ls -la'}},
        'test-id',
        None
    )
    if result.get('hookSpecificOutput', {}).get('permissionDecision') == 'deny':
        print('BLOCKED')
    else:
        print('ALLOWED')

asyncio.run(test())
")
if echo "$SAFE_TEST" | grep -q "ALLOWED"; then
    echo -e "${GREEN}  ✅ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}  ❌ FAILED - Expected ALLOWED, got: $SAFE_TEST${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}  5. DATABASE VERIFICATION${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────${NC}"

run_test "Sessions table has runner_type column" \
    "docker compose exec -T postgres psql -U saas -d saas -c \"\\d sessions\" | grep runner_type | wc -l | tr -d ' '" \
    "1"

# Check for Claude sessions
CLAUDE_SESSIONS=$(docker compose exec -T postgres psql -U saas -d saas -t -c "SELECT COUNT(*) FROM sessions WHERE runner_type = 'claude';" | tr -d ' ')
echo -e "${YELLOW}▶ Testing: Claude sessions exist in database${NC}"
if [ "$CLAUDE_SESSIONS" -gt 0 ]; then
    echo -e "${GREEN}  ✅ PASSED (${CLAUDE_SESSIONS} Claude sessions found)${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}  ❌ FAILED - No Claude sessions found${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}  6. RUNNER LOGS VERIFICATION${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────────${NC}"

# Check claude-runner received actual requests (not just health checks)
RUNNER_REQUESTS=$(docker compose logs claude-runner --tail=100 2>&1 | grep -E "POST /threads|POST /runs|GET /runs" | wc -l | tr -d ' ')
echo -e "${YELLOW}▶ Testing: Claude runner received API requests${NC}"
if [ "$RUNNER_REQUESTS" -gt 0 ]; then
    echo -e "${GREEN}  ✅ PASSED (${RUNNER_REQUESTS} API requests logged)${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}  ⚠️  WARNING - No API requests found in recent logs (may need to run a prompt first)${NC}"
    # Don't fail this test, just warn
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TEST SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "  ${RED}Failed: ${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}  ✅ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}  ❌ SOME TESTS FAILED${NC}"
    exit 1
fi
