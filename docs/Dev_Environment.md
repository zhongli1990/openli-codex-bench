# Dev Environment (Pinned Versions)

This project is a monorepo with:

- `frontend/` (Next.js)
- `runner/` (Node + `@openai/codex-sdk`)
- `backend/` (Python)

The primary supported workflow is running all services via `docker compose`.

## Pinned toolchain versions

- **Node.js**: **20 LTS** (minimum supported: Node 18+; recommended: Node 20 LTS)
- **npm**: included with Node
- **Python**: 3.12 (Docker uses `python:3.12-slim`)
- **Docker**: Docker Desktop (Windows) / Docker Engine (Linux)

Rationale:

- `@openai/codex-sdk` requires **Node 18+**.
- Next.js 14 is happiest on modern LTS (Node 18+).

## Docker Compose (recommended)

### 1) Set the API key

Create `.env` at repo root:

```bash
CODEX_API_KEY=...
```

### 2) Build and run

```bash
docker compose up --build
```

Note: the frontend is built with `output: "standalone"` and the container runs the standalone server (`node .next/standalone/server.js`). For local development (outside Docker), use `npm run dev` in `frontend/`.

### 3) Ports

- Frontend: `http://localhost:9100`
- Backend: `http://localhost:9101`
- Runner: `http://localhost:9102`
- Postgres: `localhost:9103`

### 4) Codex runner notes (Docker)

The runner uses `@openai/codex-sdk`, which invokes the Codex CLI under the hood.

In this repo:
- The runner image installs the Codex CLI and required TLS certificates.
- Codex sandboxing on Linux uses Landlock/seccomp and can fail inside Docker.
- The runner ships a Codex config at `runner/codex-config.toml` which is copied into the container at `/root/.codex/config.toml` and sets:
  - `sandbox_mode = "danger-full-access"`
  - `approval_policy = "never"`

This relies on Docker as the isolation boundary.

## Windows (dev machine) setup

### Install Node.js 20 LTS

Preferred (winget):

```powershell
winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
```

Alternative: download the Node.js LTS MSI from https://nodejs.org (LTS release).

### Verify

```powershell
node -v
```

Note: on some corporate Windows images, PowerShell blocks `npm` because it resolves to `npm.ps1` and script execution is disabled. In that case use `npm.cmd` (or call it by full path).

```powershell
npm.cmd -v
& "C:\Program Files\nodejs\npm.cmd" -v
```

### Install repo dependencies

Runner:

```powershell
npm.cmd install
```

Run this in `saas-codex/runner`.

Frontend:

```powershell
npm.cmd install
```

Run this in `saas-codex/frontend`.

## Ubuntu 24.04 (AWS) setup

### Option A (recommended): NodeSource (system-wide Node 20)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify:

```bash
node -v
npm -v
```

### Option B: nvm (per-user)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"

nvm install 20
nvm use 20
node -v
npm -v
```

## Notes on IDE “Cannot find module/type declarations” errors

If you open the repo before installing Node dependencies, TypeScript/IDE will report errors like:

- `Cannot find module 'react'`
- `Cannot find module 'next/link'`
- `Cannot find type definition file for 'node'`

Installing dependencies in `frontend/` and `runner/` resolves these.
