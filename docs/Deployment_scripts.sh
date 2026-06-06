# 1. SSH in and backup
ssh -i your-key.pem ubuntu@your-ec2-ip
cd /home/ubuntu/saas-codex
mkdir -p ~/backups/$(date +%Y%m%d)
docker compose exec -T postgres pg_dump -U saas saas > ~/backups/$(date +%Y%m%d)/saas_pre_v071.sql
cp .env ~/backups/$(date +%Y%m%d)/.env.backup
# 2. Pull v0.7.1
git fetch --all --tags
git stash
git checkout v0.7.1
# 3. Rebuild only changed services (runners unchanged)
docker compose build backend frontend prompt-manager
# 4. Run DB migration (expands roles: admin→super_admin, user→editor)
docker compose stop backend
docker compose up -d postgres
sleep 3
docker compose run --rm backend alembic upgrade head
# 5. Restart everything
docker compose up -d
# 6. Verify
docker compose ps
curl -s http://localhost:9101/health