"""
Pre/post tool use hooks for Claude Agent SDK.

Hooks provide validation and security controls for tool execution.

Hook Categories:
1. Security Hooks - Block dangerous operations
2. Compliance Hooks - Enforce data handling policies  
3. Audit Hooks - Log tool usage for compliance
4. Rate Limit Hooks - Prevent resource abuse (placeholder)
5. Custom Hooks - Tenant-specific rules (placeholder)

To extend hooks:
1. Add patterns to the appropriate *_PATTERNS list
2. Add new hook functions following the async signature
3. Register hooks in get_hook_matchers()
"""

from typing import Any
import logging

from .config import ENABLE_HOOKS

logger = logging.getLogger(__name__)


# =============================================================================
# SECURITY PATTERNS - Block dangerous operations
# =============================================================================

# Patterns that should be blocked in bash commands
BLOCKED_BASH_PATTERNS = [
    # Destructive file operations
    "rm -rf /",
    "rm -rf /*",
    "sudo rm",
    # Permission escalation
    "chmod 777 /",
    "chown root",
    # Disk operations
    "> /dev/sda",
    "mkfs.",
    "dd if=",
    # Fork bomb
    ":(){:|:&};:",
    # Remote code execution
    "curl | bash",
    "wget | bash",
    "curl | sh",
    "wget | sh",
    # Placeholder: Add more patterns as needed
]

# Patterns that indicate path escape attempts
PATH_ESCAPE_PATTERNS = [
    "../",
    "..\\",
    # Placeholder: Add more escape patterns
]

# =============================================================================
# COMPLIANCE PATTERNS - Data handling policies (Placeholder)
# =============================================================================

# Patterns for sensitive data detection (placeholder for future)
SENSITIVE_DATA_PATTERNS = [
    # NHS Number format (placeholder)
    # r"\d{3}\s?\d{3}\s?\d{4}",
    # Credit card (placeholder)
    # r"\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}",
]

# =============================================================================
# RATE LIMIT CONFIG - Resource abuse prevention (Placeholder)
# =============================================================================

RATE_LIMITS = {
    "bash_commands_per_minute": 30,  # Placeholder
    "file_writes_per_minute": 20,    # Placeholder
    "api_calls_per_minute": 60,      # Placeholder
}


async def pre_tool_use_hook(input_data: dict[str, Any], tool_use_id: str, context: Any) -> dict[str, Any]:
    """
    Hook called before tool execution.
    
    Returns empty dict to allow, or dict with hookSpecificOutput to deny.
    """
    if not ENABLE_HOOKS:
        return {}
    
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    
    # Check bash commands for dangerous patterns
    if tool_name == "Bash":
        command = tool_input.get("command", "")
        for pattern in BLOCKED_BASH_PATTERNS:
            if pattern in command:
                return {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": f"Blocked dangerous pattern: {pattern}",
                    }
                }
    
    # Check file operations for path escape attempts
    if tool_name in ["Read", "Write", "Edit", "read_file", "write_file"]:
        path = tool_input.get("path", "") or tool_input.get("file_path", "")
        for pattern in PATH_ESCAPE_PATTERNS:
            if pattern in path:
                return {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": f"Path escape attempt blocked: {pattern}",
                    }
                }
        
        # Block absolute paths outside workspace
        if path.startswith("/") and not path.startswith("/workspaces"):
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": "Absolute paths outside /workspaces are not allowed",
                }
            }
    
    return {}  # Allow


async def post_tool_use_hook(input_data: dict[str, Any], tool_use_id: str, result: Any, context: Any) -> dict[str, Any]:
    """
    Hook called after tool execution.
    
    Can be used for audit logging, result validation, etc.
    """
    if not ENABLE_HOOKS:
        return {}
    
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    
    # Audit logging (basic implementation)
    logger.info(f"[AUDIT] Tool executed: {tool_name}, tool_use_id: {tool_use_id}")
    
    # Placeholder: Add result validation here
    # - Check for sensitive data in output
    # - Validate file modifications
    # - Track resource usage
    
    return {}


def get_hook_matchers() -> dict[str, list[dict[str, Any]]]:
    """
    Get hook matchers for Claude Agent SDK.
    
    Returns dict mapping hook event names to list of matchers.
    """
    if not ENABLE_HOOKS:
        return {}
    
    return {
        "PreToolUse": [
            {"matcher": "*", "hooks": [pre_tool_use_hook]},
        ],
        "PostToolUse": [
            {"matcher": "*", "hooks": [post_tool_use_hook]},
        ],
    }
