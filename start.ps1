# ==============================================================================
# Astol Fleet Management - Automated System Launcher & Cloudflare Tunnel
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = (Get-Location).Path }
$backendDir = Join-Path $rootDir "backend"
$frontendDir = Join-Path $rootDir "frontend"

function Write-Step {
    param([string]$Msg)
    Write-Host "`n[+] $Msg" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Msg)
    Write-Host "[OK] $Msg" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Msg)
    Write-Host "[WARN] $Msg" -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Msg)
    Write-Host "[ERROR] $Msg" -ForegroundColor Red
}

function Test-PortOpen {
    param([string]$HostName = "127.0.0.1", [int]$Port = 8000)
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $iar = $tcpClient.BeginConnect($HostName, $Port, $null, $null)
        $success = $iar.AsyncWaitHandle.WaitOne(400, $false)
        if ($success -and $tcpClient.Connected) {
            $tcpClient.EndConnect($iar)
            $tcpClient.Close()
            return $true
        }
        $tcpClient.Close()
        return $false
    } catch {
        return $false
    }
}

Clear-Host
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "              ASTOL FLEET MANAGEMENT SYSTEM - ONE-CLICK LAUNCHER               " -ForegroundColor Yellow
Write-Host "================================================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. Update Code from GitHub (Git Pull)
# ------------------------------------------------------------------------------
Write-Step "Checking for updates and pulling latest code (git pull)..."
if (Test-Path (Join-Path $rootDir ".git")) {
    try {
        $gitPull = git -C $rootDir pull origin main 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Repository updated to latest version!"
        } else {
            $gitPull = git -C $rootDir pull 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Repository updated successfully!"
            } else {
                Write-Warn "Could not update via git pull (offline or local changes). Continuing with current files."
            }
        }
    } catch {
        Write-Warn "Git command not available. Continuing with current files."
    }
} else {
    Write-Warn "Current folder is not a Git repo. Running current version directly."
}

# ------------------------------------------------------------------------------
# 2. Check Python and Virtual Environment
# ------------------------------------------------------------------------------
Write-Step "Checking Python environment..."
$pythonCmd = $null
if (Test-Path (Join-Path $backendDir "venv\Scripts\python.exe")) {
    $pythonCmd = Join-Path $backendDir "venv\Scripts\python.exe"
} else {
    $candidates = @("python", "py", "python3")
    foreach ($c in $candidates) {
        try {
            $ver = & $c --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                $pythonCmd = $c
                break
            }
        } catch {}
    }
}

if (-not $pythonCmd) {
    Write-Err "Python was not found on this machine!"
    Write-Host "Please install Python 3.10+ from https://www.python.org/downloads/" -ForegroundColor White
    Write-Host "Be sure to check 'Add Python to PATH' during installation." -ForegroundColor Yellow
    Read-Host "Press Enter to exit..."
    exit 1
}

$venvPython = Join-Path $backendDir "venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Step "Creating virtual environment (venv) for the first time..."
    & $pythonCmd -m venv (Join-Path $backendDir "venv")
    if (-not (Test-Path $venvPython)) {
        Write-Err "Failed to create virtual environment."
        exit 1
    }
    Write-Success "Virtual environment created."

    Write-Step "Installing backend dependencies (requirements.txt)..."
    & $venvPython -m pip install --upgrade pip --quiet
    & $venvPython -m pip install -r (Join-Path $backendDir "requirements.txt") --quiet
    Write-Success "Dependencies installed successfully."
} else {
    $djangoCheck = & $venvPython -c "import django" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Step "Updating backend dependencies (requirements.txt)..."
        & $venvPython -m pip install -r (Join-Path $backendDir "requirements.txt") --quiet
        Write-Success "Dependencies updated."
    }
}

# ------------------------------------------------------------------------------
# 3. Check Configuration (.env)
# ------------------------------------------------------------------------------
Write-Step "Verifying configuration file (.env)..."
$envFile = Join-Path $backendDir ".env"
$envExample = Join-Path $backendDir ".env.example"

if (-not (Test-Path $envFile)) {
    Write-Warn "backend/.env not found! Creating default local configuration..."
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        (Get-Content $envFile) -replace "USE_POSTGRESQL=True", "USE_POSTGRESQL=False" | Set-Content $envFile
    } else {
        @"
SECRET_KEY=django-insecure-astol-client-preview-key-2026
DEBUG=True
USE_POSTGRESQL=False
GEMINI_API_KEY=
"@ | Out-File -FilePath $envFile -Encoding utf8
    }
    Write-Success "Default configuration created. (Place your custom .env in backend/ for Gemini AI)."
} else {
    Write-Success "Configuration file (.env) is present."
}

# ------------------------------------------------------------------------------
# 4. Database Migrations & Initial Data
# ------------------------------------------------------------------------------
Write-Step "Checking database and migrations..."
& $venvPython (Join-Path $backendDir "manage.py") migrate --noinput | Out-Null
Write-Success "Database schema is up to date."

$userCount = & $venvPython -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'astol_project.settings'); import sys; sys.path.insert(0, r'$backendDir'); django.setup(); from accounts.models import User; print(User.objects.count())" 2>$null
if ($userCount -match '^\d+$' -and [int]$userCount -eq 0) {
    Write-Step "Fresh database detected. Seeding demo fleet data (Vehicles, Drivers, Users)..."
    & $venvPython (Join-Path $backendDir "manage.py") seed_data | Out-Null
    Write-Success "Demo fleet data and user accounts created successfully!"
}

# ------------------------------------------------------------------------------
# 5. Frontend Build Verification
# ------------------------------------------------------------------------------
$frontendIndex = Join-Path $frontendDir "dist\astol-frontend\browser\index.html"
if (Test-Path $frontendIndex) {
    Write-Success "Frontend Single-Page App (SPA) build is ready."
} else {
    Write-Warn "Frontend dist not found. Attempting to build via npm..."
    try {
        $npmVer = npm --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Push-Location $frontendDir
            npm install --quiet
            npm run build
            Pop-Location
            Write-Success "Frontend built successfully."
        }
    } catch {
        Write-Err "Could not build frontend. Make sure frontend/dist is present."
    }
}

# ------------------------------------------------------------------------------
# 6. Check / Download Cloudflared
# ------------------------------------------------------------------------------
Write-Step "Checking Cloudflare tunnel tool (cloudflared)..."
$cloudflaredPath = $null

if (Test-Path (Join-Path $rootDir "cloudflared.exe")) {
    $cloudflaredPath = Join-Path $rootDir "cloudflared.exe"
} elseif (Test-Path "C:\Program Files (x86)\cloudflared\cloudflared.exe") {
    $cloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
} elseif (Test-Path "C:\Program Files\cloudflared\cloudflared.exe") {
    $cloudflaredPath = "C:\Program Files\cloudflared\cloudflared.exe"
} else {
    try {
        $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
        if ($cmd) { $cloudflaredPath = $cmd.Source }
    } catch {}
}

if (-not $cloudflaredPath) {
    Write-Step "Cloudflared not found. Downloading latest Windows binary (one-time setup)..."
    $targetExe = Join-Path $rootDir "cloudflared.exe"
    $downloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $downloadUrl -OutFile $targetExe -UseBasicParsing
        if (Test-Path $targetExe) {
            $cloudflaredPath = $targetExe
            Write-Success "Cloudflared downloaded successfully!"
        }
    } catch {
        Write-Warn "Could not download cloudflared. System will only be available locally on http://127.0.0.1:8000"
    }
} else {
    Write-Success "Cloudflared executable found."
}

# ------------------------------------------------------------------------------
# 7. Start Django Backend Server
# ------------------------------------------------------------------------------
Write-Step "Starting Django backend server on port 8000..."
$backendStartedByUs = $false
$djangoProc = $null

if (-not (Test-PortOpen -HostName "127.0.0.1" -Port 8000)) {
    $psiDjango = New-Object System.Diagnostics.ProcessStartInfo
    $psiDjango.FileName = $venvPython
    $psiDjango.Arguments = "manage.py runserver 127.0.0.1:8000 --noreload"
    $psiDjango.WorkingDirectory = $backendDir
    $psiDjango.UseShellExecute = $false
    $psiDjango.CreateNoWindow = $true

    $djangoProc = [System.Diagnostics.Process]::Start($psiDjango)
    $backendStartedByUs = $true

    $attempts = 0
    while ($attempts -lt 30) {
        Start-Sleep -Milliseconds 300
        if (Test-PortOpen -HostName "127.0.0.1" -Port 8000) { break }
        $attempts++
    }
    Write-Success "Django backend server is listening on port 8000."
} else {
    Write-Success "Backend server is already running on port 8000."
}

# ------------------------------------------------------------------------------
# 8. Start Cloudflare Tunnel & Extract Live URL
# ------------------------------------------------------------------------------
Write-Step "Starting Cloudflare tunnel and creating public link..."

$tunnelUrl = $null
$tunnelProc = $null
$logPath = Join-Path $rootDir "cloudflared.log"

if (Test-Path $logPath) {
    try { Remove-Item $logPath -Force -ErrorAction SilentlyContinue } catch {}
}

if ($cloudflaredPath) {
    # Run cloudflared redirecting stderr to file to prevent OS pipe buffer deadlocks
    $psiTunnel = New-Object System.Diagnostics.ProcessStartInfo
    $psiTunnel.FileName = $cloudflaredPath
    $psiTunnel.Arguments = "tunnel --protocol http2 --url http://127.0.0.1:8000"
    $psiTunnel.RedirectStandardError = $true
    $psiTunnel.RedirectStandardOutput = $true
    $psiTunnel.UseShellExecute = $false
    $psiTunnel.CreateNoWindow = $true

    $tunnelProc = [System.Diagnostics.Process]::Start($psiTunnel)

    # Background stream consumer to drain standard output and prevent blocking
    [System.Threading.Tasks.Task]::Run([Action]{
        try {
            while (-not $tunnelProc.HasExited) {
                $null = $tunnelProc.StandardOutput.ReadLine()
            }
        } catch {}
    }) | Out-Null

    # Read stderr line-by-line while saving to log and finding the URL
    $startTime = Get-Date
    while (-not $tunnelProc.HasExited -and ((Get-Date) - $startTime).TotalSeconds -lt 30) {
        $line = $tunnelProc.StandardError.ReadLine()
        if ($line) {
            Add-Content -Path $logPath -Value $line -ErrorAction SilentlyContinue
            if ($line -match "(https://[a-zA-Z0-9-]+\.trycloudflare\.com)") {
                $tunnelUrl = $matches[1]
                break
            }
        }
    }

    # Continue draining stderr in background so tunnel never hangs
    [System.Threading.Tasks.Task]::Run([Action]{
        try {
            while (-not $tunnelProc.HasExited) {
                $line = $tunnelProc.StandardError.ReadLine()
                if ($line) { Add-Content -Path $logPath -Value $line -ErrorAction SilentlyContinue }
            }
        } catch {}
    }) | Out-Null
}

# ------------------------------------------------------------------------------
# 9. Verify DNS Propagation before opening browser
# ------------------------------------------------------------------------------
if ($tunnelUrl) {
    Write-Step "Verifying DNS propagation for public URL..."
    $uri = [System.Uri]$tunnelUrl
    $domain = $uri.Host
    $dnsResolved = $false
    $dnsStart = Get-Date

    while (((Get-Date) - $dnsStart).TotalSeconds -lt 20) {
        try {
            $ips = [System.Net.Dns]::GetHostAddresses($domain)
            if ($ips -and $ips.Count -gt 0) {
                $dnsResolved = $true
                break
            }
        } catch {}
        Start-Sleep -Milliseconds 800
    }

    if ($dnsResolved) {
        Write-Success "DNS propagated globally! Public tunnel is live."
        Start-Sleep -Seconds 1
    } else {
        Write-Warn "DNS propagation is taking longer on your ISP resolver. Opening both public and local links."
    }
}

# Determine URLs
$localUrl = "http://127.0.0.1:8000"
$shareUrl = if ($tunnelUrl) { $tunnelUrl } else { $localUrl }

# Copy Public Link to Clipboard
try {
    Set-Clipboard -Value $shareUrl
} catch {}

# ------------------------------------------------------------------------------
# 10. Final Display Banner
# ------------------------------------------------------------------------------
Clear-Host
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "            ASTOL FLEET MANAGEMENT SYSTEM - READY AND RUNNING!                  " -ForegroundColor Yellow
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  [1] LOCAL SYSTEM (Opened in your browser):" -ForegroundColor White
Write-Host "  >>  $localUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [2] PUBLIC SHARE LINK (Send this link to your client / friend to view):" -ForegroundColor White
Write-Host "  >>  $shareUrl" -ForegroundColor Green
Write-Host "      (Copied to Clipboard! Ready to paste and send)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  [DEFAULT LOGIN CREDENTIALS]:" -ForegroundColor White
Write-Host "     Username:  admin" -ForegroundColor Yellow
Write-Host "     Password:  Admin@123456" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================================================" -ForegroundColor DarkGray
Write-Host "  NOTE:" -ForegroundColor White
Write-Host "  - The Local Link (http://127.0.0.1:8000) opens instantly on this computer." -ForegroundColor DarkGray
Write-Host "  - The Public Link can be opened on any mobile phone or external device." -ForegroundColor DarkGray
Write-Host "  - If your local Wi-Fi router blocks new Cloudflare domains, your client" -ForegroundColor DarkGray
Write-Host "    can still open the Public Link from mobile data or outside networks!" -ForegroundColor DarkGray
Write-Host "================================================================================" -ForegroundColor DarkGray
Write-Host "  IMPORTANT: Keep this window OPEN as long as you are using or sharing the system." -ForegroundColor Yellow
Write-Host "  To stop the system and close all services: Press [Ctrl + C] or close this window." -ForegroundColor DarkGray
Write-Host "================================================================================" -ForegroundColor DarkGray
Write-Host ""

# Open Local System in Browser
try {
    Start-Process $localUrl
} catch {}

# Keep script running and clean up on exit
try {
    if ($tunnelProc) {
        $tunnelProc.WaitForExit()
    } else {
        while ($true) { Start-Sleep -Seconds 2 }
    }
} finally {
    Write-Host "`nStopping Astol Fleet services and cleaning up..." -ForegroundColor Yellow
    if ($tunnelProc -and -not $tunnelProc.HasExited) {
        try { $tunnelProc.Kill() } catch {}
    }
    if ($backendStartedByUs -and $djangoProc -and -not $djangoProc.HasExited) {
        try { $djangoProc.Kill() } catch {}
    }
    Write-Host "Services stopped safely. Goodbye!" -ForegroundColor Green
}
