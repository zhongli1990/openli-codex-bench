#!/usr/bin/env python3
"""
E2E API tests for the Prompt & Skills Manager microservice.

Tests the full CRUD lifecycle for prompt templates and skills,
including authentication, rendering, publishing, and categories.

Usage:
    # Run all tests (services must be running)
    python tests/test_prompt_manager_api.py

    # Run with verbose output
    python tests/test_prompt_manager_api.py -v

Requirements:
    - Docker services must be running (docker compose up)
    - Backend and prompt-manager services must be healthy
"""

import argparse
import json
import os
import sys
import time
import uuid

import httpx

# When running inside Docker Compose, use internal service names.
# Override with env vars if running from host (e.g. localhost:9105).
BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:8080")
PROMPT_MANAGER_URL = os.environ.get("PROMPT_MANAGER_URL", "http://prompt-manager:8083")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://frontend:3000")

# Default admin credentials
ADMIN_EMAIL = "admin@saas-codex.com"
ADMIN_PASSWORD = "Admin123!"

VERBOSE = False


def log(msg: str, level: str = "INFO"):
    print(f"  [{level}] {msg}")


def log_verbose(msg: str):
    if VERBOSE:
        log(msg, "DEBUG")


# ─────────────────────────────────────────────────────────────────────────────
# Auth helpers
# ─────────────────────────────────────────────────────────────────────────────

def get_auth_token() -> str | None:
    """Login to backend and get JWT token."""
    try:
        r = httpx.post(
            f"{BACKEND_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10.0,
        )
        if r.status_code == 200:
            token = r.json().get("access_token")
            log_verbose(f"Got auth token: {token[:20]}...")
            return token
        else:
            log(f"Login failed: {r.status_code} - {r.text}", "ERROR")
            return None
    except Exception as e:
        log(f"Login error: {e}", "ERROR")
        return None


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─────────────────────────────────────────────────────────────────────────────
# Health checks
# ─────────────────────────────────────────────────────────────────────────────

def test_health_check() -> bool:
    """Test prompt-manager health endpoint."""
    try:
        r = httpx.get(f"{PROMPT_MANAGER_URL}/health", timeout=5.0)
        if r.status_code == 200:
            data = r.json()
            assert data["status"] == "ok", f"Expected ok, got {data['status']}"
            assert data["service"] == "prompt-skills-manager"
            log(f"Health OK: {data}")
            return True
        else:
            log(f"Health check failed: {r.status_code}", "FAIL")
            return False
    except Exception as e:
        log(f"Health check error: {e}", "FAIL")
        return False


def test_health_via_frontend() -> bool:
    """Test prompt-manager health via frontend proxy."""
    try:
        r = httpx.get(f"{FRONTEND_URL}/api/prompt-manager/health", timeout=5.0)
        if r.status_code == 200:
            data = r.json()
            log(f"Frontend proxy health OK: {data}")
            return True
        else:
            log(f"Frontend proxy health failed: {r.status_code}", "WARN")
            return False
    except Exception as e:
        log(f"Frontend proxy not reachable: {e}", "WARN")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Template CRUD tests
# ─────────────────────────────────────────────────────────────────────────────

def test_list_templates(token: str) -> bool:
    """Test listing templates (should include seeded templates)."""
    try:
        r = httpx.get(
            f"{PROMPT_MANAGER_URL}/templates",
            headers=auth_headers(token),
            timeout=10.0,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "items" in data, "Response missing 'items'"
        assert "total" in data, "Response missing 'total'"
        log(f"Listed {data['total']} templates ({len(data['items'])} returned)")

        if data["total"] > 0:
            t = data["items"][0]
            assert "id" in t, "Template missing 'id'"
            assert "name" in t, "Template missing 'name'"
            assert "category" in t, "Template missing 'category'"
            assert "template_body" in t, "Template missing 'template_body'"
            assert "variables" in t, "Template missing 'variables'"
            assert "status" in t, "Template missing 'status'"
            log_verbose(f"First template: {t['name']} ({t['category']}, {t['status']})")
        return True
    except AssertionError as e:
        log(f"List templates failed: {e}", "FAIL")
        return False
    except Exception as e:
        log(f"List templates error: {e}", "FAIL")
        return False


def test_list_templates_with_filters(token: str) -> bool:
    """Test listing templates with category and status filters."""
    try:
        # Filter by status=published
        r = httpx.get(
            f"{PROMPT_MANAGER_URL}/templates?status=published",
            headers=auth_headers(token),
            timeout=10.0,
        )
        assert r.status_code == 200
        data = r.json()
        for t in data["items"]:
            assert t["status"] == "published", f"Expected published, got {t['status']}"
        log(f"Filter by status=published: {data['total']} results")

        # Filter by category
        r = httpx.get(
            f"{PROMPT_MANAGER_URL}/templates?category=sales",
            headers=auth_headers(token),
            timeout=10.0,
        )
        assert r.status_code == 200
        data = r.json()
        for t in data["items"]:
            assert t["category"] == "sales", f"Expected sales, got {t['category']}"
        log(f"Filter by category=sales: {data['total']} results")

        # Search
        r = httpx.get(
            f"{PROMPT_MANAGER_URL}/templates?search=NHS",
            headers=auth_headers(token),
            timeout=10.0,
        )
        assert r.status_code == 200
        data = r.json()
        log(f"Search 'NHS': {data['total']} results")
        return True
    except AssertionError as e:
        log(f"Filter test failed: {e}", "FAIL")
        return False
    except Exception as e:
        log(f"Filter test error: {e}", "FAIL")
        return False


def test_create_template(token: str) -> str | None:
    """Test creating a new template. Returns template ID."""
    try:
        payload = {
            "name": f"E2E Test Template {uuid.uuid4().hex[:6]}",
            "description": "Created by E2E test",
            "category": "testing",
            "template_body": "Hello {{name}}, your project is {{project}}.",
            "variables": [
                {"name": "name", "type": "string", "description": "User name", "required": True},
                {"name": "project", "type": "string", "description": "Project name", "required": True},
            ],
            "sample_values": {"name": "Alice", "project": "FHIR Migration"},
            "visibility": "private",
            "status": "draft",
        }
        r = httpx.post(
            f"{PROMPT_MANAGER_URL}/templates",
            headers=auth_headers(token),
            json=payload,
            timeout=10.0,
        )
        assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
        data = r.json()
        assert data["name"] == payload["name"]
        assert data["status"] == "draft"
        assert data["visibility"] == "private"
        assert data["version"] == 1
        assert len(data["variables"]) == 2
        log(f"Created template: {data['id']} ({data['name']})")
        return data["id"]
    except AssertionError as e:
        log(f"Create template failed: {e}", "FAIL")
        return None
    except Exception as e:
        log(f"Create template error: {e}", "FAIL")
        return None


def test_get_template(token: str, template_id: str) -> bool:
    """Test getting a specific template by ID."""
    try:
        r = httpx.get(
            f"{PROMPT_MANAGER_URL}/templates/{template_id}",
            headers=auth_headers(token),
            timeout=10.0,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data["id"] == template_id
        log(f"Get template OK: {data['name']} v{data['version']}")
        return True
    except AssertionError as e:
        log(f"Get template failed: {e}", "FAIL")
        return False
    except Exception as e:
        log(f"Get template error: {e}", "FAIL")
        return False


def test_update_template(token: str, template_id: str) -> str | None:
    """Test updating a template (creates new version). Returns new version ID."""
    try:
        payload = {
            "template_body": "Updated: Hello {{name}}, project {{project}} is ready.",
            "change_summary": "Updated body text for E2E test",
        }
        r = httpx.put(
            f"{PROMPT_MANAGER_URL}/templates/{template_id}",
            headers=auth_headers(token),
            json=payload,
            timeout=10.0,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data["version"] == 2, f"Expected version 2, got {data['version']}"
        assert data["is_latest"] is True
        assert data["parent_id"] == template_id
        assert "Updated:" in data["template_body"]
        log(f"Updated template: new version {data['id']} (v{data['version']})")
        return data["id"]
    except AssertionError as e:
        log(f"Update template failed: {e}", "FAIL")
        return None
    except Exception as e:
        log(f"Update template error: {e}", "FAIL")
        return None


def test_publish_template(token: str, template_id: str) -> bool:
    """Test publishing a template."""
    try:
        r = httpx.post(
            f"{PROMPT_MANAGER_URL}/templates/{template_id}/publish",
            headers=auth_headers(token),
            timeout=10.0,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data["status"] == "published"
        assert data["published_at"] is not None
        log(f"Published template: {data['id']}")
        return True
    except AssertionError as e:
        log(f"Publish template failed: {e}", "FAIL")
        return False
    except Exception as e:
        log(f"Publish template error: {e}", "FAIL")
        return False


def test_render_template(token: str, template_id: str) -> bool:
    """Test rendering a template with variables."""
    try:
        payload = {"variables": {"name": "Bob", "project": "TIE Upgrade"}}
        r = httpx.post(
            f"{PROMPT_MANAGER_URL}/templates/{template_id}/render",
            headers=auth_headers(token),
            json=payload,
            timeout=10.0,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "Bob" in data["rendered"], f"Expected 'Bob' in rendered text"
        assert "TIE Upgrade" in data["rendered"], f"Expected 'TIE Upgrade' in rendered text"
        assert "{{" not in data["rendered"], "Unresolved variables in rendered text"
        log(f"Rendered template OK: '{data['rendered'][:60]}...'")
        return True
    except AssertionError as e:
        log(f"Render template failed: {e}", "FAIL")
        return False
    except Exception as e:
        log(f"Render template error: {e}", "FAIL")
        return False


def test_clone_template(token: str, template_id: str) -> bool:
    """Test cloning a template."""
    try:
        r = httpx.post(
            f"{PROMPT_MANAGER_URL}/templates/{template_id}/clone",
            headers=auth_headers(token),
            timeout=10.0,
        )
        assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
        data = r.json()
        assert "(Copy)" in data["name"]
        assert data["version"] == 1
        assert data["status"] == "draft"
        log(f"Cloned template: {data['id']} ({data['name']})")
        return True
    except AssertionError as e:
        log(f"Clone template failed: {e}", "FAIL")
        return False
    except Exception as e:
        log(f"Clone template error: {e}", "FAIL")
        return False


def test_get_template_versions(token: str, template_id: str) -> bool:
    """Test getting version history for a template."""
    try:
        r = httpx.get(
            f"{PROMPT_MANAGER_URL}/templates/{template_id}/versions",
            headers=auth_headers(token),
            timeout=10.0,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data["total"] >= 2, f"Expected at least 2 versions, got {data['total']}"
        log(f"Version history: {data['total']} versions")
        return True
    except AssertionError as e:
        log(f"Get versions failed: {e}", "FAIL")
        return False
    except Exception as e:
        log(f"Get versions error: {e}", "FAIL")
        return False


def test_delete_template(token: str, template_id: str) -> bool:
    """Test deleting (archiving) a template."""
    try:
        r = httpx.delete(
            f"{PROMPT_MANAGER_URL}/templates/{template_id}",
            headers=auth_headers(token),
            timeout=10.0,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data["status"] == "archived"
        log(f"Deleted (archived) template: {template_id}")
        return True
    except AssertionError as e:
        log(f"Delete template failed: {e}", "FAIL")
        return False
    except Exception as e:
        log(f"Delete template error: {e}", "FAIL")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Skills API tests
# ─────────────────────────────────────────────────────────────────────────────

def test_list_skills(token: str) -> bool:
    """Test listing skills."""
    try:
        r = httpx.get(
            f"{PROMPT_MANAGER_URL}/skills",
            headers=auth_headers(token),
            timeout=10.0,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "items" in data
        assert "total" in data
        log(f"Listed {data['total']} skills")
        return True
    except AssertionError as e:
        log(f"List skills failed: {e}", "FAIL")
        return False
    except Exception as e:
        log(f"List skills error: {e}", "FAIL")
        return False


def test_create_skill(token: str) -> str | None:
    """Test creating a new skill. Returns skill ID."""
    try:
        payload = {
            "name": f"E2E Test Skill {uuid.uuid4().hex[:6]}",
            "description": "Created by E2E test",
            "category": "testing",
            "scope": "platform",
            "skill_content": "# Test Skill\n\nYou are a testing assistant.",
            "visibility": "public",
            "status": "draft",
        }
        r = httpx.post(
            f"{PROMPT_MANAGER_URL}/skills",
            headers=auth_headers(token),
            json=payload,
            timeout=10.0,
        )
        assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
        data = r.json()
        assert data["scope"] == "platform"
        assert data["version"] == 1
        log(f"Created skill: {data['id']} ({data['name']})")
        return data["id"]
    except AssertionError as e:
        log(f"Create skill failed: {e}", "FAIL")
        return None
    except Exception as e:
        log(f"Create skill error: {e}", "FAIL")
        return None


def test_toggle_skill(token: str, skill_id: str) -> bool:
    """Test toggling a skill's enabled state."""
    try:
        r = httpx.post(
            f"{PROMPT_MANAGER_URL}/skills/{skill_id}/toggle",
            headers=auth_headers(token),
            timeout=10.0,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        log(f"Toggled skill enabled={data.get('enabled')}")
        return True
    except AssertionError as e:
        log(f"Toggle skill failed: {e}", "FAIL")
        return False
    except Exception as e:
        log(f"Toggle skill error: {e}", "FAIL")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Categories & Usage tests
# ─────────────────────────────────────────────────────────────────────────────

def test_categories(token: str) -> bool:
    """Test categories endpoint."""
    try:
        r = httpx.get(
            f"{PROMPT_MANAGER_URL}/categories",
            headers=auth_headers(token),
            timeout=10.0,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert isinstance(data, list), "Expected list of categories"
        log(f"Categories: {len(data)} categories found")
        for cat in data[:5]:
            log_verbose(f"  {cat['name']}: {cat['template_count']} templates, {cat['skill_count']} skills")
        return True
    except AssertionError as e:
        log(f"Categories failed: {e}", "FAIL")
        return False
    except Exception as e:
        log(f"Categories error: {e}", "FAIL")
        return False


def test_usage_stats(token: str) -> bool:
    """Test usage stats endpoint."""
    try:
        r = httpx.get(
            f"{PROMPT_MANAGER_URL}/usage/stats",
            headers=auth_headers(token),
            timeout=10.0,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "total_uses" in data
        log(f"Usage stats: {data['total_uses']} total uses")
        return True
    except AssertionError as e:
        log(f"Usage stats failed: {e}", "FAIL")
        return False
    except Exception as e:
        log(f"Usage stats error: {e}", "FAIL")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Auth tests
# ─────────────────────────────────────────────────────────────────────────────

def test_unauthenticated_access() -> bool:
    """Test that unauthenticated requests are rejected."""
    try:
        r = httpx.get(f"{PROMPT_MANAGER_URL}/templates", timeout=5.0)
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"
        log("Unauthenticated access correctly rejected (401)")
        return True
    except AssertionError as e:
        log(f"Auth test failed: {e}", "FAIL")
        return False
    except Exception as e:
        log(f"Auth test error: {e}", "FAIL")
        return False


def test_invalid_token() -> bool:
    """Test that invalid tokens are rejected."""
    try:
        r = httpx.get(
            f"{PROMPT_MANAGER_URL}/templates",
            headers={"Authorization": "Bearer invalid-token-here"},
            timeout=5.0,
        )
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"
        log("Invalid token correctly rejected (401)")
        return True
    except AssertionError as e:
        log(f"Invalid token test failed: {e}", "FAIL")
        return False
    except Exception as e:
        log(f"Invalid token test error: {e}", "FAIL")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Seed verification
# ─────────────────────────────────────────────────────────────────────────────

def test_seed_templates(token: str) -> bool:
    """Verify that seed templates were loaded."""
    try:
        r = httpx.get(
            f"{PROMPT_MANAGER_URL}/templates?status=published&limit=50",
            headers=auth_headers(token),
            timeout=10.0,
        )
        assert r.status_code == 200
        data = r.json()
        names = [t["name"] for t in data["items"]]
        expected = ["NHS SoW Generator", "Project Charter", "Code Review Checklist"]
        found = [n for n in expected if n in names]
        log(f"Seed templates: found {len(found)}/{len(expected)} expected ({data['total']} total published)")
        if len(found) < len(expected):
            missing = [n for n in expected if n not in names]
            log(f"Missing seeds: {missing}", "WARN")
        return len(found) >= 1  # At least some seeds present
    except Exception as e:
        log(f"Seed verification error: {e}", "FAIL")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main():
    global VERBOSE
    parser = argparse.ArgumentParser(description="Prompt Manager E2E API Tests")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()
    VERBOSE = args.verbose

    print("=" * 70)
    print("Prompt & Skills Manager — E2E API Tests")
    print("=" * 70)

    results = []

    # 1. Health checks
    print("\n--- Health Checks ---")
    results.append(("Health check (direct)", test_health_check()))
    results.append(("Health check (frontend proxy)", test_health_via_frontend()))

    # 2. Auth tests
    print("\n--- Authentication ---")
    results.append(("Unauthenticated access rejected", test_unauthenticated_access()))
    results.append(("Invalid token rejected", test_invalid_token()))

    # 3. Get auth token
    print("\n--- Login ---")
    token = get_auth_token()
    if not token:
        log("Cannot proceed without auth token", "FATAL")
        results.append(("Login", False))
        _print_summary(results)
        return 1
    results.append(("Login", True))

    # 4. Seed verification
    print("\n--- Seed Templates ---")
    results.append(("Seed templates loaded", test_seed_templates(token)))

    # 5. Template CRUD lifecycle
    print("\n--- Template CRUD Lifecycle ---")
    results.append(("List templates", test_list_templates(token)))
    results.append(("List with filters", test_list_templates_with_filters(token)))

    template_id = test_create_template(token)
    results.append(("Create template", template_id is not None))

    if template_id:
        results.append(("Get template by ID", test_get_template(token, template_id)))

        new_version_id = test_update_template(token, template_id)
        results.append(("Update template (new version)", new_version_id is not None))

        if new_version_id:
            results.append(("Get version history", test_get_template_versions(token, new_version_id)))
            results.append(("Publish template", test_publish_template(token, new_version_id)))
            results.append(("Render template", test_render_template(token, new_version_id)))
            results.append(("Clone template", test_clone_template(token, new_version_id)))
            results.append(("Delete (archive) template", test_delete_template(token, new_version_id)))

    # 6. Skills
    print("\n--- Skills CRUD ---")
    results.append(("List skills", test_list_skills(token)))
    skill_id = test_create_skill(token)
    results.append(("Create skill", skill_id is not None))
    if skill_id:
        results.append(("Toggle skill", test_toggle_skill(token, skill_id)))

    # 7. Categories & Usage
    print("\n--- Categories & Usage ---")
    results.append(("Categories", test_categories(token)))
    results.append(("Usage stats", test_usage_stats(token)))

    _print_summary(results)
    return 0 if all(r[1] for r in results) else 1


def _print_summary(results):
    print("\n" + "=" * 70)
    print("Results Summary")
    print("=" * 70)
    passed = sum(1 for _, ok in results if ok)
    failed = sum(1 for _, ok in results if not ok)
    for name, ok in results:
        status = "PASS" if ok else "FAIL"
        icon = "✓" if ok else "✗"
        print(f"  {icon} [{status}] {name}")
    print(f"\n  Total: {passed} passed, {failed} failed, {len(results)} total")
    if failed == 0:
        print("  All tests passed!")
    else:
        print(f"  {failed} test(s) failed.")


if __name__ == "__main__":
    sys.exit(main())
