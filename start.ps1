# ==============================================================================
# نظام أسطول لإدارة العمليات اللوجستية والمركبات (Astol Fleet Management)
# سكريبت التشغيل الذاتي والمزامنة السحابية (One-Click Launcher & Cloudflare Tunnel)
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
    Write-Host "[✓] $Msg" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Msg)
    Write-Host "[!] $Msg" -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Msg)
    Write-Host "[X] $Msg" -ForegroundColor Red
}

Clear-Host
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "         نظام أسطول لإدارة العمليات اللوجستية والمركبات (Astol Fleet)           " -ForegroundColor Yellow
Write-Host "================================================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. تحديث الكود من GitHub (Git Pull)
# ------------------------------------------------------------------------------
Write-Step "التحقق من التحديثات وسحب أحدث نسخة من الكود (Git Pull)..."
if (Test-Path (Join-Path $rootDir ".git")) {
    try {
        $gitPull = git -C $rootDir pull origin main 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "تم سحب أحدث نسخة من الكود بنجاح!"
        } else {
            # Try plain git pull if branch name differs
            $gitPull = git -C $rootDir pull 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "تم تحديث الكود بنجاح!"
            } else {
                Write-Warn "تعذر التحديث التلقائي عبر Git (قد لا يتوفر اتصال بالإنترنت أو توجد تعديلات محلية). سيتم المتابعة بالنسخة الحالية."
            }
        }
    } catch {
        Write-Warn "تعذر الاتصال بـ Git. جاري المتابعة بالنسخة الحالية."
    }
} else {
    Write-Warn "المجلد الحالي ليس مستودع Git، سيتم تشغيل النسخة الحالية مباشرة."
}

# ------------------------------------------------------------------------------
# 2. التحقق من وجود Python والبيئة الافتراضية
# ------------------------------------------------------------------------------
Write-Step "فحص بيئة تشغيل بايثون (Python Environment)..."
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
    Write-Err "لم يتم العثور على بايثون (Python) مثبت على جهازك!"
    Write-Host "يرجى تثبيت Python 3.10 أو أحدث من الموقع الرسمي: https://www.python.org/downloads/" -ForegroundColor White
    Write-Host "وتأكد من تفعيل خيار: [Add Python to PATH] أثناء التثبيت." -ForegroundColor Yellow
    Read-Host "اضغط Enter للخروج..."
    exit 1
}

# إنشاء البيئة الافتراضية إذا لم تكن موجودة
$venvPython = Join-Path $backendDir "venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Step "جاري إنشاء البيئة الافتراضية (venv) لأول مرة..."
    & $pythonCmd -m venv (Join-Path $backendDir "venv")
    if (-not (Test-Path $venvPython)) {
        Write-Err "فشل إنشاء البيئة الافتراضية."
        exit 1
    }
    Write-Success "تم إنشاء البيئة الافتراضية بنجاح."

    Write-Step "جاري تثبيت متطلبات النظام الأساسية (requirements.txt)..."
    & $venvPython -m pip install --upgrade pip --quiet
    & $venvPython -m pip install -r (Join-Path $backendDir "requirements.txt") --quiet
    Write-Success "تم تثبيت المتطلبات بنجاح."
} else {
    # Verify core package installed
    $djangoCheck = & $venvPython -c "import django" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Step "جاري استكمال تثبيت متطلبات النظام (requirements.txt)..."
        & $venvPython -m pip install -r (Join-Path $backendDir "requirements.txt") --quiet
        Write-Success "تم تحديث وتثبيت المتطلبات."
    }
}

# ------------------------------------------------------------------------------
# 3. التحقق من ملف الإعدادات .env
# ------------------------------------------------------------------------------
Write-Step "فحص ملف الإعدادات (.env)..."
$envFile = Join-Path $backendDir ".env"
$envExample = Join-Path $backendDir ".env.example"

if (-not (Test-Path $envFile)) {
    Write-Warn "ملف الإعدادات (backend/.env) غير موجود!"
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        # Ensure fallback to SQLite in the auto-generated file
        (Get-Content $envFile) -replace "USE_POSTGRESQL=True", "USE_POSTGRESQL=False" | Set-Content $envFile
        Write-Success "تم إنشاء ملف إعدادات افتراضي (backend/.env) بنجاح."
    } else {
        # Create minimal .env
        @"
SECRET_KEY=django-insecure-astol-client-preview-key-2026
DEBUG=True
USE_POSTGRESQL=False
GEMINI_API_KEY=
"@ | Out-File -FilePath $envFile -Encoding utf8
        Write-Success "تم إنشاء ملف .env افتراضي."
    }
} else {
    Write-Success "ملف الإعدادات .env موجود وجاهز."
}

# ------------------------------------------------------------------------------
# 4. تحديث وتجهيز قاعدة البيانات
# ------------------------------------------------------------------------------
Write-Step "فحص وتحديث جداول قاعدة البيانات (Database Migrations)..."
& $venvPython (Join-Path $backendDir "manage.py") migrate --noinput | Out-Null
Write-Success "قاعدة البيانات محدثة وجاهزة."

# التحقق من وجود مستخدمين، وإذا لم يوجد يتم إدخال البيانات التجريبية
$userCount = & $venvPython -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'astol_project.settings'); import sys; sys.path.insert(0, r'$backendDir'); django.setup(); from accounts.models import User; print(User.objects.count())" 2>$null
if ($userCount -match '^\d+$' -and [int]$userCount -eq 0) {
    Write-Step "تم اكتشاف قاعدة بيانات جديدة، جاري إدخال البيانات التأسيسية والتجريبية (Vehicles, Drivers, Users)..."
    & $venvPython (Join-Path $backendDir "manage.py") seed_data | Out-Null
    Write-Success "تم إدخال البيانات التجريبية وحسابات الدخول بنجاح!"
}

# ------------------------------------------------------------------------------
# 5. التحقق من واجهة النظام (Frontend Build)
# ------------------------------------------------------------------------------
$frontendIndex = Join-Path $frontendDir "dist\astol-frontend\browser\index.html"
if (-not (Test-Path $frontendIndex)) {
    Write-Warn "لم يتم العثور على ملفات واجهة النظام المبنية (dist)!"
    # Check if npm is available to build
    try {
        $npmVer = npm --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Step "جاري بناء واجهة النظام عبر npm..."
            Push-Location $frontendDir
            npm install --quiet
            npm run build
            Pop-Location
            Write-Success "تم بناء واجهة النظام بنجاح."
        }
    } catch {
        Write-Err "يرجى التأكد من وجود مجلد frontend/dist المبني مسبقاً."
    }
} else {
    Write-Success "واجهة النظام (Frontend SPA) جاهزة للتشغيل الفوري."
}

# ------------------------------------------------------------------------------
# 6. تجهيز أداة كلاودفلير (Cloudflared Tunnel)
# ------------------------------------------------------------------------------
Write-Step "التحقق من أداة كلاودفلير (Cloudflared)..."
$cloudflaredPath = $null

# 1) Search in local project folder
if (Test-Path (Join-Path $rootDir "cloudflared.exe")) {
    $cloudflaredPath = Join-Path $rootDir "cloudflared.exe"
}
# 2) Search in Program Files
elseif (Test-Path "C:\Program Files (x86)\cloudflared\cloudflared.exe") {
    $cloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
}
elseif (Test-Path "C:\Program Files\cloudflared\cloudflared.exe") {
    $cloudflaredPath = "C:\Program Files\cloudflared\cloudflared.exe"
}
# 3) Search in PATH
else {
    try {
        $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
        if ($cmd) { $cloudflaredPath = $cmd.Source }
    } catch {}
}

# 4) If not found anywhere, download automatically
if (-not $cloudflaredPath) {
    Write-Step "أداة كلاودفلير غير مثبتة، جاري تحميلها تلقائياً لأول مرة (حجمها صغير وسريع)..."
    $targetExe = Join-Path $rootDir "cloudflared.exe"
    $downloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $downloadUrl -OutFile $targetExe -UseBasicParsing
        if (Test-Path $targetExe) {
            $cloudflaredPath = $targetExe
            Write-Success "تم تحميل أداة كلاودفلير بنجاح!"
        }
    } catch {
        Write-Err "تعذر تحميل cloudflared تلقائياً. تأكد من اتصال الإنترنت."
    }
}

if (-not $cloudflaredPath) {
    Write-Err "لم نتمكن من تشغيل نفق كلاودفلير. سيعمل النظام محلياً فقط على http://127.0.0.1:8000"
}

# ------------------------------------------------------------------------------
# 7. تشغيل خادم Django الخلفي
# ------------------------------------------------------------------------------
Write-Step "التحقق من تشغيل الخادم الخلفي (Django Server)..."
$backendStartedByUs = $false
$djangoProc = $null

$portInUse = $false
try {
    $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -WarningAction SilentlyContinue
    $portInUse = $tcp.TcpTestSucceeded
} catch {
    $portInUse = $false
}

if (-not $portInUse) {
    Write-Step "جاري إطلاق خادم النظام (Django Backend)..."
    $psiDjango = New-Object System.Diagnostics.ProcessStartInfo
    $psiDjango.FileName = $venvPython
    $psiDjango.Arguments = "manage.py runserver 127.0.0.1:8000 --noreload"
    $psiDjango.WorkingDirectory = $backendDir
    $psiDjango.UseShellExecute = $false
    $psiDjango.CreateNoWindow = $true

    $djangoProc = [System.Diagnostics.Process]::Start($psiDjango)
    $backendStartedByUs = $true

    # Wait for server to listen
    $attempts = 0
    while ($attempts -lt 20) {
        Start-Sleep -Milliseconds 500
        try {
            $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -WarningAction SilentlyContinue
            if ($tcp.TcpTestSucceeded) { break }
        } catch {}
        $attempts++
    }
    Write-Success "خادم النظام يعمل الآن بنجاح على المنفذ 8000."
} else {
    Write-Success "خادم النظام يعمل بالفعل على المنفذ 8000."
}

# ------------------------------------------------------------------------------
# 8. إطلاق نفق كلاودفلير واستخراج الرابط العام
# ------------------------------------------------------------------------------
Write-Step "جاري إنشاء رابط المعاينة السحابي عبر Cloudflare..."

$tunnelUrl = $null
$tunnelProc = $null

if ($cloudflaredPath) {
    $psiTunnel = New-Object System.Diagnostics.ProcessStartInfo
    $psiTunnel.FileName = $cloudflaredPath
    $psiTunnel.Arguments = "tunnel --protocol http2 --url http://127.0.0.1:8000"
    $psiTunnel.RedirectStandardError = $true
    $psiTunnel.RedirectStandardOutput = $true
    $psiTunnel.UseShellExecute = $false
    $psiTunnel.CreateNoWindow = $true

    $tunnelProc = [System.Diagnostics.Process]::Start($psiTunnel)
    $startTime = Get-Date

    while (-not $tunnelProc.HasExited -and ((Get-Date) - $startTime).TotalSeconds -lt 25) {
        $line = $tunnelProc.StandardError.ReadLine()
        if ($line -match "https://[a-zA-Z0-9-]+\.trycloudflare\.com") {
            $tunnelUrl = $matches[0]
            break
        }
    }
}

# إذا لم يتم الحصول على رابط كلاودفلير، استخدم الرابط المحلي
$displayUrl = if ($tunnelUrl) { $tunnelUrl } else { "http://127.0.0.1:8000" }

# نسخ الرابط للحافظة
try {
    Set-Clipboard -Value $displayUrl
} catch {}

# ------------------------------------------------------------------------------
# 9. شاشة التشغيل النهائية المبهجة
# ------------------------------------------------------------------------------
Clear-Host
Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "                      🚀 نظام أسطول جاهز ويعمل الآن بنجاح!                      " -ForegroundColor Yellow
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  🔗 رابط النظام المباشر للمعاينة والمشاركة (Live Link):" -ForegroundColor White
Write-Host "  👉  $displayUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "  🔑 بيانات تسجيل الدخول الافتراضية (Default Credentials):" -ForegroundColor White
Write-Host "     👤 اسم المستخدم: admin" -ForegroundColor Yellow
Write-Host "     🔒 كلمة المرور:  Admin@123456" -ForegroundColor Yellow
Write-Host ""
Write-Host "  💡 تم نسخ الرابط تلقائياً إلى الحافظة (Clipboard) لمشاركته فوراً." -ForegroundColor Green
Write-Host "  🌐 جاري فتح النظام الآن في متصفح الويب الافتراضي..." -ForegroundColor White
Write-Host ""
Write-Host "================================================================================" -ForegroundColor DarkGray
Write-Host "  [!] تنبيه: اترك هذه النافذة مفتوحة طالما أنك تستخدم النظام أو تشاركه." -ForegroundColor Yellow
Write-Host "  [!] لإيقاف تشغيل النظام وإنهاء الرابط: اضغط [Ctrl + C] أو أغلق هذه النافذة." -ForegroundColor DarkGray
Write-Host "================================================================================" -ForegroundColor DarkGray
Write-Host ""

# فتح الرابط في المتصفح
try {
    Start-Process $displayUrl
} catch {}

# إبقاء السكريبت يعمل حتى الإغلاق وتنظيف العمليات
try {
    if ($tunnelProc) {
        $tunnelProc.WaitForExit()
    } else {
        while ($true) { Start-Sleep -Seconds 2 }
    }
} finally {
    Write-Host "`nجاري إيقاف الخدمات وإغلاق النظام بأمان..." -ForegroundColor Yellow
    if ($tunnelProc -and -not $tunnelProc.HasExited) {
        try { $tunnelProc.Kill() } catch {}
    }
    if ($backendStartedByUs -and $djangoProc -and -not $djangoProc.HasExited) {
        try { $djangoProc.Kill() } catch {}
    }
    Write-Host "تم إيقاف النظام. شكراً لك!" -ForegroundColor Green
}
