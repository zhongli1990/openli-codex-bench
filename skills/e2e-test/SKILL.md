---
name: e2e-test
description: End-to-end testing skill for v0.6.1 verification
allowed-tools: Read, Bash, Grep
user-invocable: true
---

# E2E Test Skill

This skill is designed for automated testing of the Claude Agent SDK integration.

## Test Scenarios

When asked to perform E2E tests, follow these steps:

1. **Identity Check**: Confirm you are Claude (not OpenAI)
2. **Skill Activation**: Report which skills are active
3. **Tool Execution**: Execute a safe bash command to verify tools work
4. **Response Format**: Return structured JSON with test results

## Response Format

Always respond with a JSON block containing:
```json
{
  "identity": "claude",
  "model": "<your model name>",
  "skills_active": true,
  "test_passed": true
}
```
