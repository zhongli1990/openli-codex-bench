import json
from datetime import datetime, timezone
from typing import Any


def make_event(
    run_id: str,
    event_type: str,
    payload: dict[str, Any] | None = None,
    seq: int = 0
) -> dict[str, Any]:
    """Create a normalized event envelope."""
    return {
        "v": 1,
        "runId": run_id,
        "provider": "claude",
        "kind": "raw",
        "type": event_type,
        "at": datetime.now(timezone.utc).isoformat(),
        "seq": seq,
        "payload": payload or {}
    }


def format_sse(data: dict[str, Any]) -> str:
    """Format data as an SSE message."""
    return f"data: {json.dumps(data)}\n\n"
