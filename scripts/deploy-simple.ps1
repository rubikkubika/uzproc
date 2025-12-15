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

Write-Host "`nStep 3: Copying files to server..." -ForegroundColor Yellow
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

Write-Host "`nStep 4: Updating containers on server..." -ForegroundColor Yellow
$remoteCommands = "cd $REMOTE_PATH; docker compose down; docker load -i uzproc-frontend.tar; docker load -i uzproc-backend.tar; docker compose up -d; docker compose ps"
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






