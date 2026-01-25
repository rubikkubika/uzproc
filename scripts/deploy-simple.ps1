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
ssh -o ConnectTimeout=10 $SERVER "mkdir -p ${backupPath}" 2>&1 | Out-Null

# Проверяем, запущен ли контейнер БД
$containerCheck = ssh -o ConnectTimeout=10 $SERVER "docker ps --filter name=uzproc-postgres --format '{{.Names}}' 2>/dev/null" 2>&1
if ($containerCheck -match "uzproc-postgres") {
    Write-Host "Database container is running, creating backup..." -ForegroundColor Cyan
    
    # Создаем бэкап БД через pg_dump внутри контейнера с таймаутом
    # Используем timeout для предотвращения зависания
    $backupCommand = "timeout 60 bash -c 'docker exec uzproc-postgres pg_dump -U uzproc_user -d uzproc -F p 2>&1 > ${backupPath}/${backupFileName}' && test -f ${backupPath}/${backupFileName} && test -s ${backupPath}/${backupFileName} && echo 'Backup created successfully' || echo 'Warning: Database backup failed'"
    
    try {
        $backupResult = ssh -o ConnectTimeout=10 -o ServerAliveInterval=5 -o ServerAliveCountMax=2 $SERVER $backupCommand 2>&1
        
        if ($backupResult -match "Backup created successfully") {
            Write-Host "Database backup created: ${backupFileName}" -ForegroundColor Green
            
            # Копируем бэкап локально в папку backup
            Write-Host "Copying backup to local backup folder..." -ForegroundColor Yellow
            mkdir -p backup -Force | Out-Null
            scp -o ConnectTimeout=10 "${SERVER}:${backupPath}/${backupFileName}" "backup/${backupFileName}" 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0 -and (Test-Path "backup/${backupFileName}")) {
                $localBackupSize = (Get-Item "backup/${backupFileName}").Length / 1MB
                Write-Host "Backup copied to local backup folder ($([math]::Round($localBackupSize, 2)) MB)" -ForegroundColor Green
                
                # Удаляем старые бэкапы, оставляя только последние 5
                Write-Host "Cleaning old backups (keeping last 5)..." -ForegroundColor Yellow
                $backupFiles = Get-ChildItem -Path "backup" -Filter "uzproc_backup_*.sql" | Sort-Object LastWriteTime -Descending
                if ($backupFiles.Count -gt 5) {
                    $oldBackups = $backupFiles | Select-Object -Skip 5
                    foreach ($oldBackup in $oldBackups) {
                        Remove-Item -Path $oldBackup.FullName -Force
                    }
                    Write-Host "Removed old backups, remaining: $($backupFiles.Count - $oldBackups.Count)" -ForegroundColor Green
                } else {
                    Write-Host "Backup count is OK: $($backupFiles.Count)" -ForegroundColor Green
                }
                
                # Удаляем бэкап с сервера после успешного копирования
                Write-Host "Removing backup from server..." -ForegroundColor Yellow
                ssh -o ConnectTimeout=10 $SERVER "rm -f ${backupPath}/${backupFileName}" 2>&1 | Out-Null
                Write-Host "Backup removed from server" -ForegroundColor Green
            } else {
                Write-Host "Warning: Failed to copy backup locally, backup remains on server..." -ForegroundColor Yellow
            }
        } else {
            Write-Host "Warning: Failed to create database backup, continuing anyway..." -ForegroundColor Yellow
            Write-Host "  Backup result: $backupResult" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Warning: Error creating database backup: $_" -ForegroundColor Yellow
        Write-Host "  Continuing deployment without backup..." -ForegroundColor Yellow
    }
} else {
    Write-Host "Warning: Database container is not running, skipping backup..." -ForegroundColor Yellow
    Write-Host "  Continuing deployment without backup..." -ForegroundColor Yellow
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

# Копируем .env файл, если он существует
if (Test-Path ".env") {
    Write-Host "Copying .env file to server..." -ForegroundColor Cyan
    scp .env "${SERVER}:${REMOTE_PATH}/"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Failed to copy .env file!" -ForegroundColor Yellow
    } else {
        Write-Host ".env file copied successfully" -ForegroundColor Green
    }
} else {
    Write-Host "Warning: .env file not found locally, skipping..." -ForegroundColor Yellow
}

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






