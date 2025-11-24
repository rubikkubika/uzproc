# deploy-simple.ps1 - Deployment script
$SERVER = "devops@10.123.48.62"
$REMOTE_PATH = "/home/devops/uzproc"

Write-Host "Starting deployment..." -ForegroundColor Cyan

Write-Host "`nStep 1: Building Docker image..." -ForegroundColor Yellow
docker compose build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error building image!" -ForegroundColor Red
    exit 1
}
Write-Host "Image built successfully" -ForegroundColor Green

Write-Host "`nStep 2: Saving image to tar file..." -ForegroundColor Yellow
docker save uzproc-frontend:latest -o uzproc-frontend.tar
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error saving image!" -ForegroundColor Red
    exit 1
}
$fileSize = (Get-Item uzproc-frontend.tar).Length / 1MB
Write-Host "Image saved: uzproc-frontend.tar ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green

Write-Host "`nStep 3: Copying files to server..." -ForegroundColor Yellow
scp uzproc-frontend.tar docker-compose.yml "${SERVER}:${REMOTE_PATH}/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error copying to server!" -ForegroundColor Red
    exit 1
}
Write-Host "Files copied to server" -ForegroundColor Green

Write-Host "`nStep 4: Updating container on server..." -ForegroundColor Yellow
$remoteCommands = "cd $REMOTE_PATH; docker compose down; docker load -i uzproc-frontend.tar; docker compose up -d; docker compose ps"
ssh $SERVER $remoteCommands

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error executing commands on server!" -ForegroundColor Red
    exit 1
}

Write-Host "`nDeployment completed successfully!" -ForegroundColor Green
Write-Host "Service available at: http://10.123.48.62:3000" -ForegroundColor Cyan
