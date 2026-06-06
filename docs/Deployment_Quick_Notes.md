# Deployment Quick Notes

## OpenLI Codex - Quick Reference Guide

**Version**: v0.6.7  
**Last Updated**: Feb 8, 2026  
**Copyright**: © 2026 Lightweight Integration Ltd, UK

---

## Documentation Index

### 1. AWS Deployment Guide
**File**: [AWS_Deployment_Guide.md](AWS_Deployment_Guide.md)

| Section | Content |
|---------|---------|
| Prerequisites | EC2 requirements, security groups, env vars |
| Fresh Installation | 7-step guide from scratch |
| Upgrade v0.5.x → v0.6.5 | Backup, pull, rebuild, verify |
| Deploy Specific Version | By tag, branch, or commit |
| Post-Deployment Verification | Health check script |
| Rollback Procedure | Quick rollback + DB restore |
| Troubleshooting | Common issues and fixes |

### 2. E2E Testing Guide
**File**: [E2E_Testing_Guide.md](E2E_Testing_Guide.md)

| Section | Content |
|---------|---------|
| Test Data | 8 users, 8 groups, 10 skills, test prompts |
| UI Component Tests | Favicon, About modal, Settings menu |
| Skills Management Tests | CRUD operations (7 tests) |
| Hooks Configuration Tests | Security, audit, compliance (5 tests) |
| Agent Console Tests | Session, prompts, blocking (4 tests) |
| Sales/Architect Scenario | Full clinical requirements workflow |
| Playwright Tests | Automated test instructions |

---

## Quick Reference: Upgrade from v0.5.x to v0.6.5

```bash
# SSH to AWS instance
ssh -i your-key.pem ubuntu@your-ec2-ip
cd /home/ubuntu/saas-codex

# 1. Backup
mkdir -p ~/backups/$(date +%Y%m%d)
docker compose exec -T postgres pg_dump -U saas saas > ~/backups/$(date +%Y%m%d)/saas_backup.sql
cp .env ~/backups/$(date +%Y%m%d)/.env.backup

# 2. Stop services
docker compose down

# 3. Pull v0.6.5
git fetch --all --tags
git checkout v0.6.5

# 4. Rebuild all images
docker compose build --no-cache

# 5. Start services
docker compose up -d

# 6. Verify
curl http://localhost:9100/api/claude/skills | jq '.skills | length'
# Expected: 10
```

---

## Quick Reference: Manual E2E Test Checklist

| Test | URL | Expected |
|------|-----|----------|
| Favicon | Browser tab | AI brain icon |
| About Modal | Click logo | v0.6.5, version history |
| Settings Menu | Click ⚙️ | 8 users, RBAC matrix |
| Skills UI | /admin/skills | 10 platform skills |
| Hooks UI | /admin/hooks | Security ON, Audit ON |
| Agent Console | /codex | Claude session works |
| Security Hook | "rm -rf /" prompt | BLOCKED |

---

## Service Ports Reference

| Service | Container Port | Host Port | URL |
|---------|---------------|-----------|-----|
| Frontend | 3000 | 9100 | http://your-ip:9100 |
| Backend | 8080 | 9101 | http://your-ip:9101 |
| Codex Runner | 8081 | 9102 | http://your-ip:9102 |
| PostgreSQL | 5432 | 9103 | localhost:9103 |
| Claude Runner | 8082 | 9104 | http://your-ip:9104 |

---

## Quick Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Rebuild single service
docker compose build frontend && docker compose up -d frontend

# View logs
docker compose logs -f backend

# Database shell
docker compose exec postgres psql -U saas -d saas

# Health check all services
for port in 9100 9101 9104; do
  echo "Port $port: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:$port/health)"
done
```

---

## Version History (v0.6.x)

| Version | Date | Highlights |
|---------|------|------------|
| v0.6.5 | Feb 8, 2026 | Favicon, About modal, Settings/RBAC menu |
| v0.6.4 | Feb 8, 2026 | Skills/Hooks Admin UI, RBAC middleware, Playwright tests |
| v0.6.3 | Feb 7, 2026 | Enterprise skills architecture (6 new skills) |
| v0.6.2 | Feb 8, 2026 | Test documentation, enhanced hooks |
| v0.6.1 | Feb 8, 2026 | Runner selection fix |
| v0.6.0 | Feb 7, 2026 | Claude Agent SDK, Skills system, Pre/post hooks |

---

## Files Changed in v0.6.5

| File | Action |
|------|--------|
| `docs/AWS_Deployment_Guide.md` | Created |
| `docs/E2E_Testing_Guide.md` | Created |
| `docs/Service_Guide.md` | Updated with references |
| `frontend/src/components/AboutModal.tsx` | Created |
| `frontend/src/components/SettingsMenu.tsx` | Created |
| `frontend/public/favicon.svg` | Updated |
| `frontend/src/app/layout.tsx` | Updated metadata |
| `frontend/src/components/TopNav.tsx` | Updated with logo/modals |

---

## Contact

**Lightweight Integration Ltd**  
United Kingdom  
Email: Zhong@li-ai.co.uk  
https://github.com/zhongli1990/saas-codex
