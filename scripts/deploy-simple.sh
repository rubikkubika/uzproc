#!/bin/bash
# deploy-simple.sh - Deployment script (macOS / Linux)
# Аналог scripts/deploy-simple.ps1 для bash.

set -e
cd "$(dirname "$0")/.."

SERVER="devops@10.123.48.62"
REMOTE_PATH="/home/devops/uzproc"
REMOTE_BACKUP_PATH="${REMOTE_PATH}/backup"
LOCAL_BACKUP_DIR="backup"

echo "Starting deployment from: $(pwd)"

echo ""
echo "Step 1: Building Docker images..."
docker compose build
echo "Images built successfully"

echo ""
echo "Step 2: Saving images to tar files..."
docker save uzproc-frontend:latest -o uzproc-frontend.tar
docker save uzproc-backend:latest -o uzproc-backend.tar
FRONTEND_SIZE=$(du -h uzproc-frontend.tar | cut -f1)
BACKEND_SIZE=$(du -h uzproc-backend.tar | cut -f1)
echo "Frontend image saved: uzproc-frontend.tar ($FRONTEND_SIZE)"
echo "Backend image saved: uzproc-backend.tar ($BACKEND_SIZE)"

echo ""
echo "Step 3: Creating database backup on server..."
BACKUP_DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILENAME="uzproc_backup_${BACKUP_DATE}.sql"

ssh -o ConnectTimeout=10 "$SERVER" "mkdir -p ${REMOTE_BACKUP_PATH}" 2>/dev/null || true
CONTAINER_CHECK=$(ssh -o ConnectTimeout=10 "$SERVER" "docker ps --filter name=uzproc-postgres --format '{{.Names}}' 2>/dev/null" 2>/dev/null || true)

if echo "$CONTAINER_CHECK" | grep -q "uzproc-postgres"; then
  echo "Database container is running, creating backup..."
  if command -v timeout >/dev/null 2>&1; then
    BACKUP_CMD="timeout 60 bash -c 'docker exec uzproc-postgres pg_dump -U uzproc_user -d uzproc -F p > ${REMOTE_BACKUP_PATH}/${BACKUP_FILENAME} 2>&1'"
  else
    BACKUP_CMD="docker exec uzproc-postgres pg_dump -U uzproc_user -d uzproc -F p > ${REMOTE_BACKUP_PATH}/${BACKUP_FILENAME} 2>&1"
  fi
  ssh -o ConnectTimeout=60 -o ServerAliveInterval=5 -o ServerAliveCountMax=2 "$SERVER" "$BACKUP_CMD" 2>/dev/null || true
  BACKUP_OK=$(ssh -o ConnectTimeout=10 "$SERVER" "test -f ${REMOTE_BACKUP_PATH}/${BACKUP_FILENAME} && test -s ${REMOTE_BACKUP_PATH}/${BACKUP_FILENAME} && echo OK" 2>/dev/null || true)

  if [ "$BACKUP_OK" = "OK" ]; then
    echo "Database backup created: ${BACKUP_FILENAME}"
    mkdir -p "$LOCAL_BACKUP_DIR" 2>/dev/null
    echo "Copying backup to local backup folder..."
    if rsync -avz --progress -e "ssh -o ConnectTimeout=60" "${SERVER}:${REMOTE_BACKUP_PATH}/${BACKUP_FILENAME}" "${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME}" 2>/dev/null; then
      if [ -f "${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME}" ]; then
        LOCAL_SIZE=$(du -h "${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME}" | cut -f1)
        echo "Backup copied to local backup folder ($LOCAL_SIZE)"
        echo "Cleaning old backups (keeping last 5)..."
        BACKUP_COUNT=$(ls -1 "${LOCAL_BACKUP_DIR}"/uzproc_backup_*.sql 2>/dev/null | wc -l)
        if [ "$BACKUP_COUNT" -gt 5 ]; then
          ls -t "${LOCAL_BACKUP_DIR}"/uzproc_backup_*.sql 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null
          REMAINING=$(ls -1 "${LOCAL_BACKUP_DIR}"/uzproc_backup_*.sql 2>/dev/null | wc -l)
          echo "Removed old backups, remaining: $REMAINING"
        else
          echo "Backup count is OK: $BACKUP_COUNT"
        fi
        echo "Removing backup from server..."
        ssh -o ConnectTimeout=10 "$SERVER" "rm -f ${REMOTE_BACKUP_PATH}/${BACKUP_FILENAME}" 2>/dev/null || true
        echo "Backup removed from server"
      else
        echo "Warning: Failed to copy backup locally, backup remains on server..."
      fi
    else
      echo "Warning: Failed to copy backup locally, continuing..."
    fi
  else
    echo "Warning: Failed to create database backup, continuing anyway..."
  fi
else
  echo "Warning: Database container is not running, skipping backup..."
  echo "  Continuing deployment without backup..."
fi

echo ""
echo "Step 4: Cleaning old Docker images on server..."
ssh -o ConnectTimeout=10 "$SERVER" "docker image prune -a -f --filter 'until=24h' 2>/dev/null; docker system prune -a -f --volumes 2>/dev/null; echo 'Old images cleaned'" 2>/dev/null || true
echo "Old Docker images cleaned on server"

echo ""
echo "Step 5: Copying files to server..."
ssh -o ConnectTimeout=10 "$SERVER" "mkdir -p ${REMOTE_PATH}/docker" 2>/dev/null || true

if [ -f ".env" ]; then
  echo "Copying .env file to server..."
  scp -o ConnectTimeout=10 .env "${SERVER}:${REMOTE_PATH}/" 2>/dev/null || echo "Warning: Failed to copy .env"
else
  echo "Warning: .env file not found locally, skipping..."
fi

echo "Copying docker-compose.yml and nginx.conf..."
scp -o ConnectTimeout=10 docker-compose.yml "${SERVER}:${REMOTE_PATH}/"
scp -o ConnectTimeout=10 docker/nginx.conf "${SERVER}:${REMOTE_PATH}/docker/"
echo "Configuration files copied successfully"

echo "Copying frontend image (this may take several minutes)..."
rsync -avz --progress -e "ssh -o ConnectTimeout=60" uzproc-frontend.tar "${SERVER}:${REMOTE_PATH}/"
echo "Frontend image copied successfully"

echo "Copying backend image (this may take several minutes)..."
rsync -avz --progress -e "ssh -o ConnectTimeout=60" uzproc-backend.tar "${SERVER}:${REMOTE_PATH}/"
echo "Backend image copied successfully"

echo "Files copied to server"

echo ""
echo "Step 6: Updating containers on server..."
ssh -o ConnectTimeout=10 "$SERVER" "cd $REMOTE_PATH && docker compose down && docker load -i uzproc-frontend.tar && docker load -i uzproc-backend.tar && rm -f uzproc-frontend.tar uzproc-backend.tar && docker compose up -d && docker compose ps"

echo ""
echo "Deployment completed successfully!"
echo "Services available at:"
echo "  Application: http://uzproc.uzum.io (or http://10.123.48.62)"
echo "  Frontend (direct): http://10.123.48.62:3000"
echo "  Backend (direct): http://10.123.48.62:8080"
