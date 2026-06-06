import os

WORKSPACES_ROOT = os.environ.get("WORKSPACES_ROOT", "/workspaces")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-20250514")
PORT = int(os.environ.get("PORT", "8082"))

# v0.6.0: Skills and hooks configuration
GLOBAL_SKILLS_PATH = os.environ.get("GLOBAL_SKILLS_PATH", "/app/skills")
ENABLE_HOOKS = os.environ.get("ENABLE_HOOKS", "true").lower() == "true"
MAX_AGENT_TURNS = int(os.environ.get("MAX_AGENT_TURNS", "20"))
