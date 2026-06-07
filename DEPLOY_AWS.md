# fleet-bench — AWS Deploy (R5 / G7 readiness; API-KEY-ONLY)

Deploy-profile runbook for fleet-bench on AWS. Satisfies **R5 §G7 AWS deploy-readiness (dry-run)**:
deploys with **API-key-only** auth — **no personal subscriptions, no Keychain, no `~/.codex`
mounts** — secrets injected by the platform, healthchecks + restart, documented ports/egress, and a
validated deploy profile.

> **fleet-bench holds NO provider/model keys.** All model auth (OpenAI/Anthropic API keys) lives in
> the **OpenRunner** deployment. fleet-bench is the product and routes runs to OpenRunner's
> agent-gateway. So the "API-key-only / no subscription" bar is satisfied two ways here:
> (1) fleet-bench's own deploy profile carries no subscription/Keychain/host-mount path; (2) the
> model auth it depends on is OpenRunner's API-key-only deploy profile (see `openrunner/DEPLOY_AWS.md`).
>
> **Subscription auth is FORBIDDEN in the deploy profile.** API keys only. See
> [`../openrunner/RUNNER_AUTH.md`](../openrunner/RUNNER_AUTH.md).
>
> **Scope split:** G7 (this doc) is the *readiness* profile. Secure-product **hardening**
> (isolation/egress/SSRF/resource gates) is owned by **OpenRunner R9**, not here.

## Files
- `docker-compose.aws.yml` — deploy overlay (gateway mode, configurable OpenRunner host, env-only
  secrets, NO subscription/host-mount lines).
- `.env.aws.example` — the exact env/secrets AWS must inject (placeholders only).

## 1. Deploy profile

```bash
# Validate (no secrets needed):
docker compose -f docker-compose.yml -f docker-compose.aws.yml config -q

# Boot:
docker compose -f docker-compose.yml -f docker-compose.aws.yml up -d
```

Always compose **base + aws overlay**. The aws overlay sets `RUNNER_MODE=gateway` (product path),
points `OPENRUNNER_GATEWAY_URL` / `RUNNER_*_URL` at the configurable OpenRunner host (default the
in-VPC `openrunner.internal` DNS placeholder), and takes all secrets from env only.

## 2. Deploy targets

**ECS / Fargate (recommended).** One task per service (backend, frontend, prompt-manager,
postgres-or-RDS). Map compose `environment:` keys to task-def
`environment` (non-secret) / `secrets` (SSM/Secrets Manager). ECS service replaces unhealthy tasks
(uses the compose healthchecks or an ALB health check). Front backend (8080) + frontend (3000) with
an ALB; keep the rest private. Use RDS for postgres in production (override `DATABASE_URL`).

**EC2 + compose.** Render `.env.aws` from SSM at boot (never committed), then `up -d`.
`restart: unless-stopped` recovers every service after a host reboot.

## 3. Secret mapping (SSM Parameter Store / Secrets Manager → env)

| Secret (SSM path)                          | Env var                     | Used by                       |
|--------------------------------------------|-----------------------------|-------------------------------|
| `/fleet-bench/prod/JWT_SECRET_KEY`         | `JWT_SECRET_KEY`            | backend + prompt-manager      |
| `/fleet-bench/prod/OPENRUNNER_GATEWAY_TOKEN`| `OPENRUNNER_GATEWAY_TOKEN` | backend (auth to OpenRunner)  |
| `/fleet-bench/prod/ADMIN_PASSWORD`         | `ADMIN_PASSWORD`           | backend bootstrap             |
| (optional) RDS conn string                 | `DATABASE_URL`             | backend + prompt-manager      |

Non-secret config (set as plain task-def `environment`): `RUNNER_MODE`, `OPENRUNNER_GATEWAY_URL`,
`RUNNER_*_URL`, `OPENRUNNER_TENANT/APP/USER`.

No `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` here — those belong to the OpenRunner deployment.

## 4. Ports + egress

**Published (base compose):** frontend `9440→3000`, backend `9441→8080`, postgres `9443→5432`,
prompt-manager `9445→8083`. (Ports 9446/9447/9448 left free — `evaluation`/`memory`/`llm-gateway`
removed; consumed from OpenRunner.) On AWS expose only frontend + backend via the ALB; keep the
rest private.

**Required egress:**
- The **OpenRunner host** (in-VPC), default `openrunner.internal:9422` (gateway) /
  `:9430-9433` (raw). Keep this VPC-internal.
- fleet-bench's own postgres / RDS.

fleet-bench makes **no provider-API calls** in the product (gateway) path — provider egress
(`api.openai.com` / `api.anthropic.com`) is OpenRunner's, not fleet-bench's.

## 5. Healthchecks + restart

`restart: unless-stopped` + per-service healthchecks (`/health` for backend, prompt-manager;
`/healthz.txt` for frontend; `pg_isready` for postgres) are all in
the base compose. ECS uses them to gate traffic and replace unhealthy tasks.

## 6. Dry-run boot

Backend boots and serves `/health` 200 without any model keys (it only talks to OpenRunner). A
key-less boot is a valid G7 dry-run.

## 7. Static guarantee (no subscription auth)

```bash
grep -nE '~/\.codex|CODEX_HOME|CLAUDE_CODE_OAUTH_TOKEN|[Kk]eychain|security find-generic-password' \
  docker-compose.aws.yml .env.aws.example   # expect: no matches
```
