param (
    [int]$Port = 8000
)

$cloudflared = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
if (-not (Test-Path $cloudflared)) {
    $cloudflaredCmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cloudflaredCmd) {
        $cloudflared = $cloudflaredCmd.Source
    } else {
        Write-Host "Error: cloudflared was not found. Please ensure Cloudflare Tunnel is installed." -ForegroundColor Red
        exit 1
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       Astol Fleet System - Cloudflare Live Share         " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Checking local server status..." -ForegroundColor Gray

$portCheck = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $portCheck) {
    $port4200 = Get-NetTCPConnection -LocalPort 4200 -State Listen -ErrorAction SilentlyContinue
    if ($port4200) {
        Write-Host "[OK] Detected Angular dev server listening on port 4200!" -ForegroundColor Green
        Write-Host "Routing tunnel traffic to http://localhost:4200" -ForegroundColor Cyan
        $Port = 4200
    } else {
        Write-Host "[INFO] Server on port $Port is not detected yet." -ForegroundColor Yellow
        Write-Host "Tunnel will start now and connect once you run your backend/frontend." -ForegroundColor Gray
    }
} else {
    Write-Host "[OK] Detected local server listening on port $Port!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Initiating Cloudflare Tunnel..." -ForegroundColor Cyan
Write-Host "Your public HTTPS link will appear below (look for *.trycloudflare.com):" -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor DarkGray

& $cloudflared tunnel --url "http://localhost:$Port"

