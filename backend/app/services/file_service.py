"""
File operations service for workspace file browsing, upload, and download.
v0.5.0 feature implementation.
"""

import io
import os
import pathlib
import zipfile
from datetime import datetime, timezone
from typing import Optional, Literal

from fastapi import HTTPException


# Maximum file sizes
MAX_UPLOAD_SIZE = 1 * 1024 * 1024 * 1024  # 1GB for workspace upload
MAX_SINGLE_FILE_UPLOAD = 100 * 1024 * 1024  # 100MB for single file
MAX_VIEW_SIZE = 1 * 1024 * 1024  # 1MB for in-browser viewing

# File extensions that can be viewed in browser
VIEWABLE_EXTENSIONS = {
    ".md", ".txt", ".json", ".yaml", ".yml", ".xml",
    ".py", ".js", ".ts", ".tsx", ".jsx", ".java",
    ".html", ".css", ".sql", ".sh", ".bash",
    ".csv", ".log", ".conf", ".ini", ".toml",
    ".go", ".rs", ".c", ".cpp", ".h", ".hpp",
    ".rb", ".php", ".swift", ".kt", ".scala",
    ".dockerfile", ".gitignore", ".env.example"
}


def validate_path_under_workspace(workspace_path: str, requested_path: str) -> pathlib.Path:
    """
    Ensure requested path is within workspace directory.
    Prevents path traversal attacks.
    
    Args:
        workspace_path: The workspace's local_path
        requested_path: The user-requested path (relative)
    
    Returns:
        Resolved absolute path
    
    Raises:
        HTTPException: If path is outside workspace
    """
    base = pathlib.Path(workspace_path).resolve()
    
    # Handle empty or root path
    if not requested_path or requested_path == "/":
        return base
    
    # Remove leading slash and resolve
    clean_path = requested_path.lstrip("/")
    target = (base / clean_path).resolve()
    
    # Security check: ensure target is under base
    if not str(target).startswith(str(base)):
        raise HTTPException(status_code=400, detail="Invalid path: path traversal detected")
    
    return target


def list_directory(workspace_path: str, relative_path: str = "/") -> dict:
    """
    List files and directories at a given path within a workspace.
    
    Args:
        workspace_path: The workspace's local_path
        relative_path: Path relative to workspace root
    
    Returns:
        Dictionary with current_path, parent_path, and items list
    """
    target = validate_path_under_workspace(workspace_path, relative_path)
    
    if not target.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")
    
    base = pathlib.Path(workspace_path).resolve()
    items = []
    
    for entry in sorted(target.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
        try:
            stat = entry.stat()
            rel_path = "/" + str(entry.relative_to(base))
            
            items.append({
                "name": entry.name,
                "path": rel_path,
                "type": "directory" if entry.is_dir() else "file",
                "size": None if entry.is_dir() else stat.st_size,
                "modified_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
            })
        except (PermissionError, OSError):
            # Skip files we can't access
            continue
    
    # Calculate parent path
    parent_path = None
    if target != base:
        parent_rel = target.parent.relative_to(base)
        parent_path = "/" + str(parent_rel) if str(parent_rel) != "." else "/"
    
    # Current path
    current_rel = target.relative_to(base)
    current_path = "/" + str(current_rel) if str(current_rel) != "." else "/"
    
    return {
        "current_path": current_path,
        "parent_path": parent_path,
        "items": items
    }


def get_file_content(workspace_path: str, relative_path: str) -> dict:
    """
    Read file content for viewing in browser.
    
    Args:
        workspace_path: The workspace's local_path
        relative_path: Path relative to workspace root
    
    Returns:
        Dictionary with file info and content
    """
    target = validate_path_under_workspace(workspace_path, relative_path)
    
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if target.is_dir():
        raise HTTPException(status_code=400, detail="Cannot view directory content")
    
    stat = target.stat()
    
    # Check file size
    if stat.st_size > MAX_VIEW_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"File too large to view. Maximum size: {MAX_VIEW_SIZE // 1024 // 1024}MB"
        )
    
    # Check if file is viewable
    suffix = target.suffix.lower()
    is_viewable = suffix in VIEWABLE_EXTENSIONS or target.name.lower() in VIEWABLE_EXTENSIONS
    
    # Try to read as text
    content = None
    is_binary = False
    content_type = "text/plain"
    
    if is_viewable:
        try:
            content = target.read_text(encoding="utf-8")
            
            # Determine content type
            if suffix == ".md":
                content_type = "text/markdown"
            elif suffix == ".json":
                content_type = "application/json"
            elif suffix in (".yaml", ".yml"):
                content_type = "text/yaml"
            elif suffix == ".html":
                content_type = "text/html"
            elif suffix == ".css":
                content_type = "text/css"
            elif suffix in (".js", ".ts", ".tsx", ".jsx"):
                content_type = "text/javascript"
            elif suffix == ".py":
                content_type = "text/x-python"
                
        except UnicodeDecodeError:
            is_binary = True
            content = None
    else:
        is_binary = True
    
    base = pathlib.Path(workspace_path).resolve()
    rel_path = "/" + str(target.relative_to(base))
    
    return {
        "name": target.name,
        "path": rel_path,
        "type": "file",
        "size": stat.st_size,
        "modified_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        "content": content,
        "content_type": content_type,
        "is_binary": is_binary
    }


def get_file_for_download(workspace_path: str, relative_path: str) -> tuple[pathlib.Path, str]:
    """
    Get file path for download.
    
    Args:
        workspace_path: The workspace's local_path
        relative_path: Path relative to workspace root
    
    Returns:
        Tuple of (file_path, filename)
    """
    target = validate_path_under_workspace(workspace_path, relative_path)
    
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if target.is_dir():
        raise HTTPException(status_code=400, detail="Cannot download directory. Use download-zip instead.")
    
    return target, target.name


def create_zip_from_directory(workspace_path: str, relative_path: str = "/") -> tuple[io.BytesIO, str]:
    """
    Create a ZIP archive from a directory.
    
    Args:
        workspace_path: The workspace's local_path
        relative_path: Path relative to workspace root
    
    Returns:
        Tuple of (BytesIO buffer, suggested filename)
    """
    target = validate_path_under_workspace(workspace_path, relative_path)
    
    if not target.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")
    
    buffer = io.BytesIO()
    
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(target):
            # Skip hidden directories
            dirs[:] = [d for d in dirs if not d.startswith(".")]
            
            for file in files:
                if file.startswith("."):
                    continue
                    
                file_path = pathlib.Path(root) / file
                arcname = file_path.relative_to(target)
                zf.write(file_path, arcname)
    
    buffer.seek(0)
    
    # Generate filename
    if relative_path == "/" or not relative_path:
        zip_name = pathlib.Path(workspace_path).name + ".zip"
    else:
        zip_name = target.name + ".zip"
    
    return buffer, zip_name


def save_uploaded_file(
    workspace_path: str, 
    relative_path: str, 
    filename: str, 
    content: bytes
) -> dict:
    """
    Save an uploaded file to the workspace.
    
    Args:
        workspace_path: The workspace's local_path
        relative_path: Target directory path
        filename: Name of the file
        content: File content as bytes
    
    Returns:
        Dictionary with file info
    """
    # Validate size
    if len(content) > MAX_SINGLE_FILE_UPLOAD:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {MAX_SINGLE_FILE_UPLOAD // 1024 // 1024}MB"
        )
    
    # Validate target directory
    target_dir = validate_path_under_workspace(workspace_path, relative_path)
    
    if not target_dir.exists():
        target_dir.mkdir(parents=True, exist_ok=True)
    
    if not target_dir.is_dir():
        raise HTTPException(status_code=400, detail="Target path is not a directory")
    
    # Sanitize filename
    safe_filename = pathlib.Path(filename).name  # Remove any path components
    if not safe_filename or safe_filename.startswith("."):
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    # Write file
    file_path = target_dir / safe_filename
    file_path.write_bytes(content)
    
    stat = file_path.stat()
    base = pathlib.Path(workspace_path).resolve()
    rel_path = "/" + str(file_path.relative_to(base))
    
    return {
        "name": safe_filename,
        "path": rel_path,
        "type": "file",
        "size": stat.st_size,
        "modified_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
    }


def extract_uploaded_workspace(
    zip_content: bytes,
    workspace_path: str,
    max_size: int = MAX_UPLOAD_SIZE
) -> int:
    """
    Extract an uploaded ZIP file to create a new workspace.
    
    Args:
        zip_content: ZIP file content as bytes
        workspace_path: Target workspace path
        max_size: Maximum allowed size
    
    Returns:
        Number of files extracted
    
    Raises:
        HTTPException: If extraction fails
    """
    if len(zip_content) > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"Upload too large. Maximum size: {max_size // 1024 // 1024 // 1024}GB"
        )
    
    # Create target directory
    target = pathlib.Path(workspace_path)
    target.mkdir(parents=True, exist_ok=True)
    
    try:
        with zipfile.ZipFile(io.BytesIO(zip_content), "r") as zf:
            # Security: check for path traversal in zip
            for name in zf.namelist():
                if name.startswith("/") or ".." in name:
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid ZIP: contains unsafe paths"
                    )
            
            # Extract all files
            zf.extractall(target)
            
            return len(zf.namelist())
            
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid ZIP file")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract: {str(e)}")
