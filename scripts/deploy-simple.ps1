# deploy-simple.ps1 - Deployment script
# Переход в корень проекта (на уровень выше от scripts/)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

$SERVER = "devops@10.123.48.62"
$REMOTE_PATH = "/home/devops/uzproc"

Write-Host "Starting deployment from: $projectRoot" -ForegroundColor Cyan

Write-Host "`nStep 1: Building Docker images..." -ForegroundColor Yellow
docker compose build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error building images!" -ForegroundColor Red
    exit 1
}
Write-Host "Images built successfully" -ForegroundColor Green

Write-Host "`nStep 2: Saving images to tar files..." -ForegroundColor Yellow
docker save uzproc-frontend:latest -o uzproc-frontend.tar
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error saving frontend image!" -ForegroundColor Red
    exit 1
}

docker save uzproc-backend:latest -o uzproc-backend.tar
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error saving backend image!" -ForegroundColor Red
    exit 1
}

$frontendSize = (Get-Item uzproc-frontend.tar).Length / 1MB
$backendSize = (Get-Item uzproc-backend.tar).Length / 1MB
Write-Host "Frontend image saved: uzproc-frontend.tar ($([math]::Round($frontendSize, 2)) MB)" -ForegroundColor Green
Write-Host "Backend image saved: uzproc-backend.tar ($([math]::Round($backendSize, 2)) MB)" -ForegroundColor Green

Write-Host "`nStep 3: Creating database backup on server..." -ForegroundColor Yellow
# Создаем бэкап БД на сервере перед обновлением
$backupDate = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFileName = "uzproc_backup_${backupDate}.sql"
$backupPath = "${REMOTE_PATH}/backup"

# Создаем папку backup на сервере, если её нет
ssh $SERVER "mkdir -p ${backupPath}"

# Создаем бэкап БД через pg_dump внутри контейнера
# Используем bash -c для правильного перенаправления вывода
$backupCommand = "bash -c 'docker exec uzproc-postgres pg_dump -U uzproc_user -d uzproc > ${backupPath}/${backupFileName} 2>&1' && test -f ${backupPath}/${backupFileName} && echo 'Backup created successfully' || echo 'Warning: Database backup failed or container not running'"
$backupResult = ssh $SERVER $backupCommand

if ($backupResult -match "Backup created successfully") {
    Write-Host "Database backup created: ${backupFileName}" -ForegroundColor Green
    
    # Копируем бэкап локально в папку backup
    Write-Host "Copying backup to local backup folder..." -ForegroundColor Yellow
    mkdir -p backup -Force | Out-Null
    scp "${SERVER}:${backupPath}/${backupFileName}" "backup/${backupFileName}"
    if ($LASTEXITCODE -eq 0) {
        $localBackupSize = (Get-Item "backup/${backupFileName}").Length / 1MB
        Write-Host "Backup copied to local backup folder ($([math]::Round($localBackupSize, 2)) MB)" -ForegroundColor Green
        
        # Удаляем бэкап с сервера после успешного копирования
        Write-Host "Removing backup from server..." -ForegroundColor Yellow
        ssh $SERVER "rm -f ${backupPath}/${backupFileName}"
        Write-Host "Backup removed from server" -ForegroundColor Green
    } else {
        Write-Host "Warning: Failed to copy backup locally, backup remains on server..." -ForegroundColor Yellow
    }
} else {
    Write-Host "Warning: Failed to create database backup, continuing anyway..." -ForegroundColor Yellow
    Write-Host "  (This might happen if the database container is not running)" -ForegroundColor Yellow
}

Write-Host "`nStep 4: Cleaning old Docker images on server..." -ForegroundColor Yellow
# Очищаем старые неиспользуемые Docker образы на сервере перед копированием новых
# Это помогает избежать ошибок "No space left on device"
ssh $SERVER "docker image prune -a -f --filter 'until=24h' 2>&1 > /dev/null; docker system prune -a -f --volumes 2>&1 > /dev/null; echo 'Old images cleaned'"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Failed to clean old images, continuing anyway..." -ForegroundColor Yellow
}
Write-Host "Old Docker images cleaned on server" -ForegroundColor Green

Write-Host "`nStep 5: Copying files to server..." -ForegroundColor Yellow
# Создаем директорию docker на сервере, если её нет
ssh $SERVER "mkdir -p ${REMOTE_PATH}/docker"
scp uzproc-frontend.tar uzproc-backend.tar docker-compose.yml "${SERVER}:${REMOTE_PATH}/"
scp docker/nginx.conf "${SERVER}:${REMOTE_PATH}/docker/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error copying files to server!" -ForegroundColor Red
    exit 1
}

# Excel файлы исключены из деплоя (слишком большие, копируются вручную при необходимости)
# Если нужно скопировать Excel файлы, используйте команду:
# scp frontend\upload\alldocuments\*.xlsx devops@10.123.48.62:/home/devops/uzproc/frontend/upload/alldocuments/

Write-Host "Files copied to server" -ForegroundColor Green

Write-Host "`nStep 6: Updating containers on server..." -ForegroundColor Yellow
# Удаляем старые tar файлы на сервере после загрузки образов, чтобы освободить место
$remoteCommands = "cd $REMOTE_PATH; docker compose down; docker load -i uzproc-frontend.tar; docker load -i uzproc-backend.tar; rm -f uzproc-frontend.tar uzproc-backend.tar; docker compose up -d; docker compose ps"
ssh $SERVER $remoteCommands

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error executing commands on server!" -ForegroundColor Red
    exit 1
}

Write-Host "`nDeployment completed successfully!" -ForegroundColor Green
Write-Host "Services available at:" -ForegroundColor Cyan
Write-Host "  Application: http://uzproc.uzum.io (or http://10.123.48.62)" -ForegroundColor Cyan
Write-Host "  Frontend (direct): http://10.123.48.62:3000" -ForegroundColor Cyan
Write-Host "  Backend (direct): http://10.123.48.62:8080" -ForegroundColor Cyan






