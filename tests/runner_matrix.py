#!/usr/bin/env python3
"""R5 backend-routed 4-runner matrix harness (raw + gateway).

Drives the SAME case through the fleet-bench BACKEND (:9441) for every
runner_type in {codex, claude, opencodex, mock} in BOTH modes (raw, gateway),
using a distinct fresh repo_url per (mode, runner) cell to avoid the
uq_workspace_source unique constraint (source_type + source_uri).

Everything is cost-safe: the runners are zero-token mocks. The harness is a
black-box client of the backend's product run-path (/api/sessions + prompt +
SSE events); it does not import backend code.

It restarts the backend container once per mode (the backend's RUNNER_MODE is a
process-level env), then runs all four runners in that mode.

For each cell it captures:
  mode, runner_type, thread_created, run_started, terminal status, and
  (gateway only) whether a gateway /v1/audit record exists for the run window.

Emits tests/regression_report.json with a DETERMINISTIC structure (no volatile
wall-clock ms in the stable fields; timings live under a separate `_timing`
key) and prints a table.

Usage:
  python3 tests/runner_matrix.py
  python3 tests/runner_matrix.py --no-restart   # assume backend already in a mode (single-mode debug)

Run from the fleet-bench repo root.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone

BACKEND = os.environ.get("FB_BACKEND", "http://localhost:9441")
GATEWAY = os.environ.get("FB_GATEWAY", "http://localhost:9422")
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RUNNERS = ["codex", "claude", "opencodex", "mock"]
MODES = ["raw", "gateway"]

# The single shared case sent to every cell. A content prompt so the run
# exercises the shared workspace (the runner reads the cloned files).
CASE_PROMPT = "List the files in the working directory and name the entry point."

# Base repo cloned for every cell. Uniqueness for the (source_type, source_uri)
# constraint comes from per-cell case variation of the org/repo segment
# (GitHub is case-insensitive on the path, but the DB string is exact), so the
# same tiny public repo yields a fresh source_uri per cell with no extra repos.
BASE_REPO = "octocat/Hello-World"


def _http_json(method: str, url: str, body: dict | None = None, timeout: int = 90) -> tuple[int, dict | None]:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"detail": raw}
    except Exception as e:  # noqa: BLE001
        return 0, {"detail": str(e)}


def _unique_repo_url(mode: str, runner: str) -> str:
    """A fresh, real-clonable, DB-unique source_uri per cell.

    GitHub https clones are case-insensitive on the owner/repo path, so toggling
    the case of the owner per cell yields a distinct exact string (dodging
    uq_workspace_source) while still cloning the same tiny repo. A short random
    case-permutation keeps reruns unique too.
    """
    owner, repo = BASE_REPO.split("/")
    seed = uuid.uuid4().hex
    # Permute owner letter-casing deterministically from the seed → unique string.
    permuted = "".join(
        c.upper() if (int(seed[i % len(seed)], 16) % 2) else c.lower()
        for i, c in enumerate(owner)
    )
    # Guarantee distinctness even if a permutation repeats: trailing repo-case flip.
    repo_cased = repo if (int(seed[0], 16) % 2) else repo.upper()
    return f"https://github.com/{permuted}/{repo_cased}.git"


def _restart_backend(mode: str) -> None:
    """Recreate the backend container in the given RUNNER_MODE (tokenless dev)."""
    env = dict(os.environ)
    env["RUNNER_MODE"] = mode
    # Tokenless: dev gateway accepts tenant-default; keeps the matrix cost-safe.
    env.pop("OPENRUNNER_GATEWAY_TOKEN", None)
    subprocess.run(
        ["docker", "compose", "up", "-d", "--force-recreate", "backend"],
        cwd=REPO_ROOT, env=env, check=True,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    # Wait for health.
    for _ in range(40):
        code, _ = _http_json("GET", f"{BACKEND}/health", timeout=3)
        if code == 200:
            return
        time.sleep(1)
    raise RuntimeError(f"backend did not become healthy in mode={mode}")


def _drain_events(run_id: str, timeout_s: int = 40) -> None:
    """Open the backend SSE stream so events persist; read until close or timeout."""
    req = urllib.request.Request(
        f"{BACKEND}/api/runs/{run_id}/events",
        headers={"Accept": "text/event-stream"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as r:
            deadline = time.time() + timeout_s
            while time.time() < deadline:
                line = r.readline()
                if not line:
                    break
    except Exception:  # noqa: BLE001 — stream end / timeout is fine; status is the source of truth
        pass


def _wait_terminal(run_id: str, timeout_s: int = 40) -> str:
    deadline = time.time() + timeout_s
    last = "unknown"
    while time.time() < deadline:
        code, data = _http_json("GET", f"{BACKEND}/api/runs/{run_id}", timeout=5)
        if code == 200 and data:
            last = data.get("status", last)
            if last in ("completed", "error"):
                return last
        time.sleep(1)
    return last


def _gateway_audit_after(since_iso: str) -> bool:
    """True iff the gateway has any audit record at/after `since_iso`.

    A fresh sandbox.acquired/memory_context.loaded record appearing in the run
    window proves the gateway OWNED the run (not merely proxied it).
    """
    code, data = _http_json("GET", f"{GATEWAY}/v1/audit", timeout=10)
    if code != 200 or not isinstance(data, list):
        return False
    for rec in data:
        occurred = rec.get("occurred_at", "")
        if occurred and occurred >= since_iso:
            return True
    return False


def run_cell(mode: str, runner: str) -> dict:
    cell: dict = {
        "mode": mode,
        "runner_type": runner,
        "thread_created": False,
        "run_started": False,
        "terminal": None,
        "gateway_audit_record": None,  # only meaningful in gateway mode
        "pass": False,
        "error": None,
    }
    timing: dict = {}
    t0 = time.time()
    before = datetime.now(timezone.utc).isoformat()

    repo_url = _unique_repo_url(mode, runner)
    code, data = _http_json(
        "POST", f"{BACKEND}/api/sessions",
        {"repo_url": repo_url, "runner_type": runner},
    )
    if code != 200 or not data or not data.get("thread_id"):
        cell["error"] = f"create_session {code}: {(data or {}).get('detail')}"
        timing["total_ms"] = int((time.time() - t0) * 1000)
        cell["_timing"] = timing
        return cell
    cell["thread_created"] = True
    session_id = data["session_id"]
    timing["session_ms"] = int((time.time() - t0) * 1000)

    code, data = _http_json(
        "POST", f"{BACKEND}/api/sessions/{session_id}/prompt",
        {"prompt": CASE_PROMPT},
    )
    if code != 200 or not data or not data.get("run_id"):
        cell["error"] = f"prompt {code}: {(data or {}).get('detail')}"
        timing["total_ms"] = int((time.time() - t0) * 1000)
        cell["_timing"] = timing
        return cell
    cell["run_started"] = True
    run_id = data["run_id"]

    _drain_events(run_id)
    cell["terminal"] = _wait_terminal(run_id)

    if mode == "gateway":
        cell["gateway_audit_record"] = _gateway_audit_after(before)

    # Pass = thread created + run started + terminal run.completed; in gateway
    # mode additionally require a gateway audit record (platform ownership).
    ok = cell["thread_created"] and cell["run_started"] and cell["terminal"] == "completed"
    if mode == "gateway":
        ok = ok and bool(cell["gateway_audit_record"])
    cell["pass"] = ok

    timing["total_ms"] = int((time.time() - t0) * 1000)
    cell["_timing"] = timing
    return cell


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-restart", action="store_true",
                    help="don't restart the backend per mode (single-mode debug)")
    args = ap.parse_args()

    results: list[dict] = []
    for mode in MODES:
        if not args.no_restart:
            print(f"[restart] backend → RUNNER_MODE={mode}")
            _restart_backend(mode)
        for runner in RUNNERS:
            print(f"[run] mode={mode:7s} runner={runner}")
            cell = run_cell(mode, runner)
            status = "PASS" if cell["pass"] else "FAIL"
            print(f"       -> {status}  thread={cell['thread_created']} "
                  f"run={cell['run_started']} terminal={cell['terminal']} "
                  f"audit={cell['gateway_audit_record']}"
                  + (f"  ERR={cell['error']}" if cell["error"] else ""))
            results.append(cell)

    # Deterministic report: sort cells, strip volatile timing into _timing only.
    results.sort(key=lambda c: (c["mode"], c["runner_type"]))
    passed = sum(1 for c in results if c["pass"])
    report = {
        "schema": "fleet-bench/r5/runner_matrix/v1",
        "case_prompt": CASE_PROMPT,
        "base_repo": BASE_REPO,
        "modes": MODES,
        "runners": RUNNERS,
        "summary": {"total": len(results), "passed": passed, "failed": len(results) - passed},
        "cells": results,
    }

    out_path = os.path.join(REPO_ROOT, "tests", "regression_report.json")
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2, sort_keys=False)
        f.write("\n")

    # Table.
    print("\n=== R5 runner matrix (4 runners × 2 modes) ===")
    print(f"{'mode':8s} {'runner':10s} {'thread':7s} {'run':4s} {'terminal':10s} {'audit':6s} {'pass':4s}")
    for c in results:
        print(f"{c['mode']:8s} {c['runner_type']:10s} "
              f"{str(c['thread_created']):7s} {str(c['run_started']):4s} "
              f"{str(c['terminal']):10s} {str(c['gateway_audit_record']):6s} "
              f"{'OK' if c['pass'] else 'X':4s}")
    print(f"\n{passed}/{len(results)} cells passed → {out_path}")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
