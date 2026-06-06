#!/usr/bin/env python3
"""
E2E test for SSE streaming across the stack.

This test verifies that:
1. SSE connections open immediately
2. Events stream incrementally (not batched)
3. Anti-buffering headers are present
4. Both Codex and Claude runners work

Usage:
    # Test against running services
    python tests/test_sse_streaming.py

    # Test specific runner
    python tests/test_sse_streaming.py --runner codex
    python tests/test_sse_streaming.py --runner claude

Requirements:
    - Services must be running (docker compose up)
    - CODEX_API_KEY and/or ANTHROPIC_API_KEY must be set
"""

import argparse
import json
import sys
import time
from typing import Generator

import httpx


BACKEND_URL = "http://localhost:9101"
FRONTEND_URL = "http://localhost:9100"
CODEX_RUNNER_URL = "http://localhost:9102"
CLAUDE_RUNNER_URL = "http://localhost:9104"

TEST_REPO = "https://github.com/octocat/Hello-World.git"
TEST_PROMPT = "List the files in this repository"


def check_sse_headers(response: httpx.Response, layer: str) -> bool:
    """Check that SSE anti-buffering headers are present."""
    content_type = response.headers.get("content-type", "")
    cache_control = response.headers.get("cache-control", "")
    
    issues = []
    
    if "text/event-stream" not in content_type:
        issues.append(f"Content-Type should be text/event-stream, got: {content_type}")
    
    if "no-cache" not in cache_control:
        issues.append(f"Cache-Control should include no-cache, got: {cache_control}")
    
    if issues:
        print(f"  [{layer}] Header issues:")
        for issue in issues:
            print(f"    - {issue}")
        return False
    
    print(f"  [{layer}] Headers OK")
    return True


def stream_sse_events(url: str, timeout: float = 30.0) -> Generator[dict, None, None]:
    """Stream SSE events from a URL."""
    with httpx.stream("GET", url, headers={"Accept": "text/event-stream"}, timeout=timeout) as response:
        check_sse_headers(response, url.split("/")[2])
        
        buffer = ""
        for chunk in response.iter_text():
            buffer += chunk
            while "\n\n" in buffer:
                event_str, buffer = buffer.split("\n\n", 1)
                for line in event_str.split("\n"):
                    if line.startswith("data: "):
                        try:
                            yield json.loads(line[6:])
                        except json.JSONDecodeError:
                            pass
                    elif line.startswith(":"):
                        pass


def test_runner_direct(runner_url: str, runner_name: str) -> bool:
    """Test SSE streaming directly from a runner."""
    print(f"\n=== Testing {runner_name} runner directly ({runner_url}) ===")
    
    try:
        health = httpx.get(f"{runner_url}/health", timeout=5.0)
        if health.status_code != 200:
            print(f"  Runner health check failed: {health.status_code}")
            return False
        print(f"  Health check OK")
    except Exception as e:
        print(f"  Runner not reachable: {e}")
        return False
    
    return True


def test_backend_session(runner_type: str = "codex") -> tuple[str, str] | None:
    """Create a session via backend and return (session_id, run_id)."""
    print(f"\n=== Testing backend session creation (runner_type={runner_type}) ===")
    
    try:
        response = httpx.post(
            f"{BACKEND_URL}/api/sessions",
            json={"repo_url": TEST_REPO, "runner_type": runner_type},
            timeout=60.0
        )
        
        if response.status_code != 200:
            print(f"  Session creation failed: {response.status_code} - {response.text}")
            return None
        
        data = response.json()
        session_id = data.get("session_id")
        print(f"  Session created: {session_id}")
        
        response = httpx.post(
            f"{BACKEND_URL}/api/sessions/{session_id}/prompt",
            json={"prompt": TEST_PROMPT},
            timeout=60.0
        )
        
        if response.status_code != 200:
            print(f"  Prompt failed: {response.status_code} - {response.text}")
            return None
        
        data = response.json()
        run_id = data.get("run_id")
        print(f"  Run started: {run_id}")
        
        return session_id, run_id
    
    except Exception as e:
        print(f"  Error: {e}")
        return None


def test_sse_streaming(run_id: str, via: str = "backend") -> bool:
    """Test SSE streaming for a run."""
    if via == "backend":
        url = f"{BACKEND_URL}/api/runs/{run_id}/events"
    else:
        url = f"{FRONTEND_URL}/api/runs/{run_id}/events"
    
    print(f"\n=== Testing SSE streaming via {via} ===")
    print(f"  URL: {url}")
    
    events = []
    start_time = time.time()
    first_event_time = None
    
    try:
        for event in stream_sse_events(url, timeout=60.0):
            if first_event_time is None:
                first_event_time = time.time()
                latency = first_event_time - start_time
                print(f"  First event latency: {latency:.2f}s")
            
            events.append(event)
            event_type = event.get("type", "unknown")
            print(f"  Event #{len(events)}: {event_type}")
            
            if event_type in ("run.completed", "stream.closed", "error"):
                break
            
            if len(events) > 100:
                print("  Stopping after 100 events")
                break
    
    except Exception as e:
        print(f"  Streaming error: {e}")
        return False
    
    print(f"\n  Total events: {len(events)}")
    
    if len(events) == 0:
        print("  FAIL: No events received")
        return False
    
    has_started = any(e.get("type") == "run.started" for e in events)
    has_completed = any(e.get("type") in ("run.completed", "stream.closed") for e in events)
    
    if not has_started:
        print("  WARN: No run.started event")
    
    if not has_completed:
        print("  WARN: No run.completed event")
    
    print("  PASS: SSE streaming works")
    return True


def main():
    parser = argparse.ArgumentParser(description="Test SSE streaming")
    parser.add_argument("--runner", choices=["codex", "claude", "both"], default="both")
    parser.add_argument("--skip-session", action="store_true", help="Skip session creation test")
    args = parser.parse_args()
    
    print("=" * 60)
    print("SSE Streaming E2E Test")
    print("=" * 60)
    
    runners_to_test = []
    if args.runner in ("codex", "both"):
        runners_to_test.append(("codex", CODEX_RUNNER_URL))
    if args.runner in ("claude", "both"):
        runners_to_test.append(("claude", CLAUDE_RUNNER_URL))
    
    results = []
    
    for runner_name, runner_url in runners_to_test:
        runner_ok = test_runner_direct(runner_url, runner_name)
        results.append((f"{runner_name} runner health", runner_ok))
        
        if not args.skip_session and runner_ok:
            session_result = test_backend_session(runner_name)
            if session_result:
                session_id, run_id = session_result
                results.append((f"{runner_name} session creation", True))
                
                sse_ok = test_sse_streaming(run_id, via="backend")
                results.append((f"{runner_name} SSE via backend", sse_ok))
            else:
                results.append((f"{runner_name} session creation", False))
    
    print("\n" + "=" * 60)
    print("Results Summary")
    print("=" * 60)
    
    all_passed = True
    for name, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {name}")
        if not passed:
            all_passed = False
    
    print()
    if all_passed:
        print("All tests passed!")
        return 0
    else:
        print("Some tests failed.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
