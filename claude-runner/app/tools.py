import os
import subprocess
from pathlib import Path
from typing import Any


TOOLS = [
    {
        "name": "read_file",
        "description": "Read the contents of a file at the specified path",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "File path relative to the working directory"
                }
            },
            "required": ["path"]
        }
    },
    {
        "name": "write_file",
        "description": "Write content to a file at the specified path",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "File path relative to the working directory"
                },
                "content": {
                    "type": "string",
                    "description": "Content to write to the file"
                }
            },
            "required": ["path", "content"]
        }
    },
    {
        "name": "list_files",
        "description": "List files and directories at the specified path",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Directory path relative to the working directory"
                }
            },
            "required": ["path"]
        }
    },
    {
        "name": "bash",
        "description": "Execute a bash command in the working directory",
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The bash command to execute"
                }
            },
            "required": ["command"]
        }
    }
]


def resolve_path(working_directory: str, relative_path: str, workspaces_root: str) -> str:
    """Resolve a relative path within the working directory, ensuring it stays within bounds."""
    base = Path(working_directory).resolve()
    target = (base / relative_path).resolve()
    
    root = Path(workspaces_root).resolve()
    if not str(target).startswith(str(root)):
        raise ValueError(f"Path {relative_path} escapes workspaces root")
    
    return str(target)


def execute_tool(
    tool_name: str,
    tool_input: dict[str, Any],
    working_directory: str,
    workspaces_root: str
) -> dict[str, Any]:
    """Execute a tool and return the result."""
    try:
        if tool_name == "read_file":
            path = resolve_path(working_directory, tool_input["path"], workspaces_root)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            return {"success": True, "content": content}
        
        elif tool_name == "write_file":
            path = resolve_path(working_directory, tool_input["path"], workspaces_root)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                f.write(tool_input["content"])
            return {"success": True, "message": f"Wrote {len(tool_input['content'])} bytes to {tool_input['path']}"}
        
        elif tool_name == "list_files":
            path = resolve_path(working_directory, tool_input["path"], workspaces_root)
            entries = []
            for entry in os.listdir(path):
                full_path = os.path.join(path, entry)
                entry_type = "directory" if os.path.isdir(full_path) else "file"
                entries.append({"name": entry, "type": entry_type})
            return {"success": True, "entries": entries}
        
        elif tool_name == "bash":
            result = subprocess.run(
                tool_input["command"],
                shell=True,
                cwd=working_directory,
                capture_output=True,
                text=True,
                timeout=60
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.returncode
            }
        
        else:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}
    
    except Exception as e:
        return {"success": False, "error": str(e)}
