"""
Skill file loader for Claude Agent SDK.

Loads skills from:
1. Global skills: /app/skills/<skill-name>/SKILL.md
2. Workspace skills: /workspaces/<id>/.claude/skills/<skill-name>/SKILL.md

Workspace skills override global skills with the same name.
"""

import os
from pathlib import Path
from typing import Any

import yaml

from .config import GLOBAL_SKILLS_PATH


def load_skill(skill_path: Path) -> dict[str, Any] | None:
    """Load a single skill from a directory containing SKILL.md."""
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return None
    
    try:
        content = skill_md.read_text(encoding="utf-8")
    except Exception:
        return None
    
    # Parse YAML frontmatter
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            try:
                frontmatter = yaml.safe_load(parts[1])
                instructions = parts[2].strip()
                
                allowed_tools_raw = frontmatter.get("allowed-tools", "")
                if isinstance(allowed_tools_raw, str):
                    allowed_tools = [t.strip() for t in allowed_tools_raw.split(",") if t.strip()]
                else:
                    allowed_tools = list(allowed_tools_raw) if allowed_tools_raw else []
                
                return {
                    "name": frontmatter.get("name", skill_path.name),
                    "description": frontmatter.get("description", ""),
                    "allowed_tools": allowed_tools,
                    "disable_model_invocation": frontmatter.get("disable-model-invocation", False),
                    "user_invocable": frontmatter.get("user-invocable", True),
                    "instructions": instructions,
                    "path": str(skill_path),
                }
            except yaml.YAMLError:
                pass
    
    # No frontmatter, treat entire content as instructions
    return {
        "name": skill_path.name,
        "description": "",
        "allowed_tools": [],
        "disable_model_invocation": False,
        "user_invocable": True,
        "instructions": content,
        "path": str(skill_path),
    }


def load_skills_from_directory(skills_dir: Path, scope: str) -> list[dict[str, Any]]:
    """Load all skills from a directory."""
    skills = []
    if not skills_dir.exists() or not skills_dir.is_dir():
        return skills
    
    for skill_dir in skills_dir.iterdir():
        if skill_dir.is_dir():
            skill = load_skill(skill_dir)
            if skill:
                skill["scope"] = scope
                skills.append(skill)
    
    return skills


def load_all_skills(workspace_path: str) -> list[dict[str, Any]]:
    """
    Load all skills for a workspace.
    
    Order of precedence (later overrides earlier):
    1. Global skills from GLOBAL_SKILLS_PATH
    2. Workspace skills from <workspace>/.claude/skills/
    """
    skills_by_name: dict[str, dict[str, Any]] = {}
    
    # 1. Load global skills
    global_skills_dir = Path(GLOBAL_SKILLS_PATH)
    for skill in load_skills_from_directory(global_skills_dir, "global"):
        skills_by_name[skill["name"]] = skill
    
    # 2. Load workspace skills (override global)
    workspace_skills_dir = Path(workspace_path) / ".claude" / "skills"
    for skill in load_skills_from_directory(workspace_skills_dir, "workspace"):
        skills_by_name[skill["name"]] = skill
    
    return list(skills_by_name.values())


def build_system_prompt(skills: list[dict[str, Any]]) -> str:
    """Build system prompt incorporating loaded skills."""
    base_prompt = """You are an AI coding assistant with access to a workspace directory. You can read files, write files, list directories, and execute bash commands to help the user with their coding tasks.

When working on code:
1. First explore the codebase to understand its structure
2. Make targeted, minimal changes
3. Test your changes when possible
4. Explain what you're doing

Always use the available tools to interact with the filesystem rather than asking the user to do it manually."""
    
    if not skills:
        return base_prompt
    
    skill_section = "\n\n## Available Skills\n\n"
    skill_section += "The following skills are available to help with specific tasks:\n\n"
    
    for skill in skills:
        skill_section += f"### {skill['name']}\n"
        if skill["description"]:
            skill_section += f"**Description**: {skill['description']}\n\n"
        if skill["instructions"]:
            skill_section += f"{skill['instructions']}\n\n"
        skill_section += "---\n\n"
    
    return base_prompt + skill_section


def get_skill_names(skills: list[dict[str, Any]]) -> list[str]:
    """Get list of skill names."""
    return [skill["name"] for skill in skills]
