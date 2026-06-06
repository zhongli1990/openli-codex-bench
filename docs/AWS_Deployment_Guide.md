# AWS Deployment Guide

## OpenLI Codex - Ubuntu VM Deployment with Docker Compose

**Version**: v0.7.1  
**Last Updated**: Feb 9, 2026

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Fresh Installation](#2-fresh-installation)
3. [Upgrade from v0.5.x to v0.6.5](#3-upgrade-from-v05x-to-v065)
4. [Deploy Specific Version](#4-deploy-specific-version)
5. [Post-Deployment Verification](#5-post-deployment-verification)
6. [Rollback Procedure](#6-rollback-procedure)
7. [Troubleshooting](#7-troubleshooting)
8. [Upgrade from v0.6.x to v0.7.1](#8-upgrade-from-v06x-to-v071)

---

## 1. Prerequisites

### AWS EC2 Instance Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| Instance Type | t3.medium | t3.large |
| vCPUs | 2 | 4 |
| Memory | 4 GB | 8 GB |
| Storage | 30 GB | 50 GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Required Software

```bash
# Check versions
docker --version    # >= 24.0
docker compose version  # >= 2.20
git --version       # >= 2.34
```

### Security Group Rules

| Port | Protocol | Source | Description |
|------|----------|--------|-------------|
| 22 | TCP | Your IP | SSH access |
| 9100 | TCP | 0.0.0.0/0 | Frontend UI |
| 9101 | TCP | 0.0.0.0/0 | Backend API |
| 9104 | TCP | Internal | Claude Runner (optional) |

### Environment Variables Required

```bash
# Create .env file with these variables
ANTHROPIC_API_KEY=sk-ant-...      # Required for Claude runner
CODEX_API_KEY=sk-...              # Required for Codex runner
JWT_SECRET_KEY=your-secret-key    # For authentication
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=YourSecurePassword123!
```

---

## 2. Fresh Installation

### Step 1: Connect to AWS Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### Step 2: Install Docker (if not installed)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### Step 3: Clone Repository

```bash
# Clone the repository
cd /home/ubuntu
git clone https://github.com/zhongli1990/saas-codex.git
cd saas-codex

# Checkout latest stable version
git fetch --all --tags
git checkout v0.6.5
```

### Step 4: Configure Environment

```bash
# Create .env file
cat > .env << 'EOF'
# API Keys (REQUIRED)
ANTHROPIC_API_KEY=sk-ant-your-key-here
CODEX_API_KEY=sk-your-openai-key-here

# Authentication
JWT_SECRET_KEY=your-secure-random-string-here
JWT_EXPIRE_MINUTES=1440
ADMIN_EMAIL=admin@saas-codex.com
ADMIN_PASSWORD=Admin123!

# Database
DATABASE_URL=postgresql://saas:saas@postgres:5432/saas

# Optional: LangSmith
# LANGSMITH_API_KEY=your-langsmith-key
# LANGSMITH_PROJECT=saas-codex
EOF

# Secure the file
chmod 600 .env
```

### Step 5: Build and Start Services

```bash
# Build all images
docker compose build

# Start all services
docker compose up -d

# Check status
docker compose ps
```

### Step 6: Run Database Migrations

```bash
# Run Alembic migrations
docker compose exec backend alembic upgrade head

# Verify tables created
docker compose exec postgres psql -U saas -d saas -c "\dt"
```

### Step 7: Verify Deployment

```bash
# Health checks
curl http://localhost:9100/health  # Frontend
curl http://localhost:9101/health  # Backend
curl http://localhost:9104/health  # Claude Runner

# Test Skills API
curl http://localhost:9100/api/claude/skills
```

---

## 3. Upgrade from v0.5.x to v0.6.5

### ⚠️ IMPORTANT: Backup First!

```bash
# SSH to your AWS instance
ssh -i your-key.pem ubuntu@your-ec2-ip
cd /home/ubuntu/saas-codex

# Create backup directory
mkdir -p ~/backups/$(date +%Y%m%d)

# Backup database
docker compose exec -T postgres pg_dump -U saas saas > ~/backups/$(date +%Y%m%d)/saas_backup.sql

# Backup .env file
cp .env ~/backups/$(date +%Y%m%d)/.env.backup

# Backup workspaces (if needed)
sudo tar -czf ~/backups/$(date +%Y%m%d)/workspaces.tar.gz ./workspaces/
```

### Step 1: Stop Current Services

```bash
# Stop all services gracefully
docker compose down

# Verify all containers stopped
docker ps
```

### Step 2: Pull Latest Code

```bash
# Fetch all updates
git fetch --all --tags

# Check current version
git describe --tags

# Stash any local changes (if any)
git stash

# Checkout v0.6.5
git checkout v0.6.5

# Verify version
git describe --tags
# Expected: v0.6.5
```

### Step 3: Review Changes (v0.5.x → v0.6.5)

**New Features Added**:
| Version | Features |
|---------|----------|
| v0.6.0 | Claude Agent SDK, Skills system, Pre/post hooks |
| v0.6.1 | Runner selection fix |
| v0.6.2 | Test documentation, enhanced hooks |
| v0.6.3 | Enterprise skills architecture (6 new skills) |
| v0.6.4 | Skills/Hooks Admin UI, RBAC middleware, Playwright tests |
| v0.6.5 | Favicon, About modal, Settings/RBAC menu |

**New Files**:
- `claude-runner/skills/` - 10 platform skills
- `claude-runner/app/skills.py` - Skill loader
- `claude-runner/app/hooks.py` - Pre/post tool hooks
- `frontend/src/app/(app)/admin/skills/` - Skills UI
- `frontend/src/app/(app)/admin/hooks/` - Hooks UI
- `frontend/src/components/AboutModal.tsx`
- `frontend/src/components/SettingsMenu.tsx`
- `backend/app/auth/rbac.py` - RBAC middleware

**Database Changes**: None required (file-based skills)

### Step 4: Rebuild All Images

```bash
# Remove old images to ensure clean build
docker compose down --rmi local

# Rebuild all services
docker compose build --no-cache

# This may take 5-10 minutes
```

### Step 5: Start Services

```bash
# Start all services
docker compose up -d

# Watch logs for errors
docker compose logs -f --tail=100
# Press Ctrl+C to exit logs
```

### Step 6: Verify Database Schema

```bash
# Check if RBAC tables exist (from v0.5.x)
docker compose exec postgres psql -U saas -d saas -c "\dt"

# Expected tables:
# - users, workspaces, sessions, runs, run_events
# - tenants, groups, user_groups, workspace_access (RBAC)

# If alembic_version is missing, stamp it
docker compose exec backend alembic stamp head
```

### Step 7: Verify Skills Loaded

```bash
# Check skills in claude-runner
docker compose exec claude-runner ls -la /app/skills/

# Expected: 10 skill directories
# architecture-design, code-review, e2e-test, healthcare-compliance,
# prd-writer, project-charter, security-audit, sow-generator,
# test-strategy, user-guide

# Test Skills API
curl http://localhost:9100/api/claude/skills | jq '.skills | length'
# Expected: 10
```

### Step 8: Verify UI Features

Open browser and test:

1. **http://your-ec2-ip:9100** - Check new favicon in browser tab
2. **Click logo** - About modal should open with v0.6.5
3. **Click ⚙️ icon** - Settings menu with sample users
4. **http://your-ec2-ip:9100/admin/skills** - Skills Management UI
5. **http://your-ec2-ip:9100/admin/hooks** - Hooks Configuration UI

---

## 4. Deploy Specific Version

### Deploy Latest (main branch)

```bash
git fetch origin main
git checkout main
git pull origin main
docker compose build
docker compose up -d
```

### Deploy Specific Tag

```bash
# List available tags
git tag -l "v0.6.*"

# Deploy specific version
git checkout v0.6.4
docker compose build
docker compose up -d
```

### Deploy Specific Commit

```bash
# Deploy by commit hash
git checkout abc1234
docker compose build
docker compose up -d
```

---

## 5. Post-Deployment Verification

### Quick Health Check Script

```bash
#!/bin/bash
# save as: verify_deployment.sh

echo "=== SaaS Codex Deployment Verification ==="
echo ""

# Check Docker containers
echo "1. Container Status:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Health checks
echo "2. Service Health Checks:"
for port in 9100 9101 9104; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health 2>/dev/null)
  if [ "$status" = "200" ]; then
    echo "   Port $port: ✅ OK"
  else
    echo "   Port $port: ❌ FAILED (HTTP $status)"
  fi
done
echo ""

# Skills check
echo "3. Skills Loaded:"
skills_count=$(curl -s http://localhost:9100/api/claude/skills | grep -o '"name"' | wc -l)
echo "   Total skills: $skills_count"
echo ""

# Database check
echo "4. Database Tables:"
docker compose exec -T postgres psql -U saas -d saas -c "\dt" 2>/dev/null | grep -c "table"
echo ""

# Version check
echo "5. Git Version:"
git describe --tags 2>/dev/null || echo "   Not on a tag"
echo ""

echo "=== Verification Complete ==="
```

### Manual Verification Checklist

| Test | URL/Command | Expected Result |
|------|-------------|-----------------|
| Frontend loads | http://your-ip:9100 | Page loads with new favicon |
| Backend health | curl :9101/health | `{"status": "ok"}` |
| Claude Runner health | curl :9104/health | `{"status": "ok"}` |
| Skills API | curl :9100/api/claude/skills | 10 skills listed |
| About modal | Click logo | Shows v0.7.1 |
| Settings menu | Click ⚙️ | Shows sample users with roles |
| Skills UI | /admin/skills | Lists 10 platform skills |
| Hooks UI | /admin/hooks | Shows security/audit hooks |
| Prompts UI | /prompts | Lists seed prompt templates |
| User Management | /admin/users | Role dropdown, tenant column |
| Role change | Change role dropdown | No 422 error, role updates |

---

## 6. Rollback Procedure

### Quick Rollback to Previous Version

```bash
# Stop services
docker compose down

# Checkout previous version
git checkout v0.5.1  # or your previous version

# Rebuild and start
docker compose build
docker compose up -d

# Restore database if needed
docker compose exec -T postgres psql -U saas -d saas < ~/backups/YYYYMMDD/saas_backup.sql
```

### Rollback with Database Restore

```bash
# Stop services
docker compose down

# Restore database
docker compose up -d postgres
sleep 5
docker compose exec -T postgres psql -U saas -d saas < ~/backups/YYYYMMDD/saas_backup.sql

# Checkout previous version
git checkout v0.5.1

# Rebuild and start all
docker compose build
docker compose up -d
```

---

## 7. Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs backend
docker compose logs claude-runner
docker compose logs frontend

# Check for port conflicts
sudo lsof -i :9100
sudo lsof -i :9101
sudo lsof -i :9104

# Restart specific service
docker compose restart backend
```

### Database Connection Issues

```bash
# Check postgres is running
docker compose ps postgres

# Test connection
docker compose exec postgres psql -U saas -d saas -c "SELECT 1"

# Check backend can connect
docker compose logs backend | grep -i "database\|postgres"
```

### Skills Not Loading

```bash
# Check skills directory exists
docker compose exec claude-runner ls -la /app/skills/

# Check skill files
docker compose exec claude-runner cat /app/skills/sow-generator/SKILL.md | head -20

# Restart claude-runner
docker compose restart claude-runner
```

### Frontend API Proxy Errors

```bash
# Check frontend can reach backend
docker compose exec frontend curl http://backend:8080/health

# Check frontend can reach claude-runner
docker compose exec frontend curl http://claude-runner:8082/health

# Check network
docker network ls
docker network inspect saas-codex_default
```

### Memory Issues

```bash
# Check memory usage
docker stats --no-stream

# If low memory, restart with limits
docker compose down
docker system prune -f
docker compose up -d
```

---

## 8. Upgrade from v0.6.x to v0.7.1

This section covers upgrading an AWS production server running any v0.6.x release to v0.7.1.

### What Changed (v0.6.x → v0.7.1)

| Area | Changes |
|------|--------|
| **Database** | New migration `005_expand_rbac_roles` — expands role constraint to 5 roles, migrates `admin`→`super_admin`, `user`→`editor` |
| **Backend** | RBAC module rewritten (`rbac.py`), tenant-scoped filtering, new admin endpoints |
| **Frontend** | `providers.tsx` (AuthProvider wrapper), streaming event handling, role-gated UI |
| **Prompt Manager** | Auth updated for new RBAC roles |
| **Runners** | No changes (Codex + Claude runners unchanged) |

### Step 1: SSH and Backup

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
cd /home/ubuntu/saas-codex

# Backup database
mkdir -p ~/backups/$(date +%Y%m%d)
docker compose exec -T postgres pg_dump -U saas saas > ~/backups/$(date +%Y%m%d)/saas_pre_v071.sql

# Backup .env
cp .env ~/backups/$(date +%Y%m%d)/.env.backup

# Note current version
git describe --tags
```

### Step 2: Pull v0.7.1

```bash
git fetch --all --tags
git stash          # stash any local changes
git checkout v0.7.1
git describe --tags  # confirm: v0.7.1
```

### Step 3: Rebuild Changed Services

Only 3 services have code changes — no need to rebuild runners:

```bash
# Rebuild only what changed (saves time vs --no-cache on all)
docker compose build backend frontend prompt-manager
```

### Step 4: Run Database Migration

```bash
# Stop backend first to avoid conflicts
docker compose stop backend

# Run migration 005 (expands role constraint, migrates existing roles)
docker compose up -d postgres
sleep 3
docker compose run --rm backend alembic upgrade head

# Verify migration applied
docker compose exec postgres psql -U saas -d saas -c \
  "SELECT version_num FROM alembic_version;"
# Expected: includes 005_expand_rbac_roles
```

### Step 5: Restart Services

```bash
# Restart all services with new images
docker compose up -d

# Watch logs for errors (30 seconds)
docker compose logs -f --tail=50 backend frontend prompt-manager
# Press Ctrl+C when satisfied
```

### Step 6: Verify

```bash
# Health checks
curl -s http://localhost:9101/health | jq .
curl -s http://localhost:9105/health | jq .

# Verify roles migrated correctly
docker compose exec postgres psql -U saas -d saas -c \
  "SELECT email, role, tenant_id FROM users ORDER BY role;"

# Check all containers healthy
docker compose ps
```

Then in browser:

1. **Login** at `http://your-ip:9100/login`
2. **About modal** (click logo) → should show **v0.7.1**
3. **User Management** (`/admin/users`) → role dropdown works, no 422 error
4. **Prompts** (`/prompts`) → seed templates visible
5. **Agent Console** (`/codex`) → streaming shows thinking/tool calls in real-time

### Step 7: Verify Role Migration

The migration auto-converts old roles:

| Old Role | New Role |
|----------|----------|
| `admin` | `super_admin` |
| `user` | `editor` |

If you need to manually assign roles:

```bash
# Promote a user to org_admin
docker compose exec postgres psql -U saas -d saas -c \
  "UPDATE users SET role = 'org_admin' WHERE email = 'someone@example.com';"
```

### Rollback (if needed)

```bash
docker compose down
git checkout v0.6.9   # or your previous tag
docker compose build backend frontend prompt-manager
docker compose up -d postgres
sleep 3
docker compose exec -T postgres psql -U saas -d saas < ~/backups/YYYYMMDD/saas_pre_v071.sql
docker compose up -d
```

---

## Appendix: Service Ports Reference

| Service | Container Port | Host Port | URL |
|---------|---------------|-----------|-----|
| Frontend | 3000 | 9100 | http://your-ip:9100 |
| Backend | 8080 | 9101 | http://your-ip:9101 |
| Codex Runner | 8081 | 9102 | http://your-ip:9102 |
| PostgreSQL | 5432 | 9103 | localhost:9103 |
| Claude Runner | 8082 | 9104 | http://your-ip:9104 |
| Prompt Manager | 8083 | 9105 | http://your-ip:9105 |
| Evaluation | 8084 | 9106 | http://your-ip:9106 |
| Memory | 8085 | 9107 | http://your-ip:9107 |
| LLM Gateway | 8086 | 9108 | http://your-ip:9108 |

---

## Appendix: Quick Commands Reference

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Rebuild single service
docker compose build frontend && docker compose up -d frontend

# View logs
docker compose logs -f backend

# Enter container shell
docker compose exec backend bash

# Database shell
docker compose exec postgres psql -U saas -d saas

# Check disk space
df -h

# Clean up Docker
docker system prune -f
docker image prune -a -f
```
