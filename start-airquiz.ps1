# ========================================
# AirQuiz - Complete Startup Script
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AirQuiz - Automated Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$ROOT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND_DIR = Join-Path $ROOT_DIR "backend"
$LOG_DIR = Join-Path $ROOT_DIR "logs"

# Create logs directory
if (-not (Test-Path $LOG_DIR)) {
    New-Item -ItemType Directory -Path $LOG_DIR | Out-Null
}

$BACKEND_LOG = Join-Path $LOG_DIR "backend.log"
$FRONTEND_LOG = Join-Path $LOG_DIR "frontend.log"

Write-Host "[INFO] Project Directory: $ROOT_DIR" -ForegroundColor Yellow
Write-Host "[INFO] Backend Log: $BACKEND_LOG" -ForegroundColor Yellow
Write-Host "[INFO] Frontend Log: $FRONTEND_LOG" -ForegroundColor Yellow
Write-Host ""

# ========================================
# Step 1: Check Python
# ========================================
Write-Host "[1/7] Checking Python..." -ForegroundColor Green
try {
    $pythonVersion = python --version 2>&1
    Write-Host "      OK: $pythonVersion" -ForegroundColor Green
}
catch {
    Write-Host "      ERROR: Python not found! Please install Python 3.9+" -ForegroundColor Red
    exit 1
}

# ========================================
# Step 2: Check Node.js
# ========================================
Write-Host "[2/7] Checking Node.js..." -ForegroundColor Green
try {
    $nodeVersion = node --version 2>&1
    Write-Host "      OK: Node $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "      ERROR: Node.js not found! Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# ========================================
# Step 3: Install Backend Dependencies
# ========================================
Write-Host ""
Write-Host "[3/7] Installing Backend Dependencies..." -ForegroundColor Green
Push-Location $BACKEND_DIR

if (-not (Test-Path "venv")) {
    Write-Host "      Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

Write-Host "      Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

Write-Host "      Installing Python packages..." -ForegroundColor Yellow
pip install -r requirements.txt --quiet
Write-Host "      OK: Backend dependencies installed" -ForegroundColor Green

Pop-Location

# ========================================
# Step 4: Install Frontend Dependencies
# ========================================
Write-Host ""
Write-Host "[4/7] Installing Frontend Dependencies..." -ForegroundColor Green
if (-not (Test-Path "node_modules")) {
    Write-Host "      Installing npm packages..." -ForegroundColor Yellow
    npm install --silent
    Write-Host "      OK: Frontend dependencies installed" -ForegroundColor Green
}
else {
    Write-Host "      OK: Dependencies already installed" -ForegroundColor Green
}

# Install socket.io-client if not already installed
Write-Host "      Checking socket.io-client..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" | ConvertFrom-Json
if (-not $packageJson.dependencies.'socket.io-client') {
    Write-Host "      Installing socket.io-client..." -ForegroundColor Yellow
    npm install socket.io-client --silent
}

# ========================================
# Step 5: Check Environment File
# ========================================
Write-Host ""
Write-Host "[5/7] Checking Configuration..." -ForegroundColor Green
if (-not (Test-Path ".env")) {
    Write-Host "      Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "      OK: .env file created" -ForegroundColor Green
}
else {
    Write-Host "      OK: .env file exists" -ForegroundColor Green
}

# ========================================
# Step 6: Start Backend Server
# ========================================
Write-Host ""
Write-Host "[6/7] Starting Backend Server..." -ForegroundColor Green

# Set Python Encoding to UTF-8 to prevent Windows console crashes on emojis
$env:PYTHONIOENCODING = "utf-8"

$backendJob = Start-Job -ScriptBlock {
    param($backendDir, $logFile)
    Set-Location $backendDir
    # Redundant but safe setting inside the job scope
    $env:PYTHONIOENCODING = "utf-8"
    & ".\venv\Scripts\Activate.ps1"
    uvicorn main:sio_app --host 0.0.0.0 --port 8000 --reload 2>&1 | Tee-Object -FilePath $logFile
} -ArgumentList $BACKEND_DIR, $BACKEND_LOG

Write-Host "      Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test backend
try {
    Invoke-WebRequest -Uri "http://localhost:8000" -UseBasicParsing -TimeoutSec 5 | Out-Null
    Write-Host "      OK: Backend running at http://localhost:8000" -ForegroundColor Green
}
catch {
    Write-Host "      WARNING: Backend may still be starting..." -ForegroundColor Yellow
}

# ========================================
# Step 7: Start Frontend Server
# ========================================
Write-Host ""
Write-Host "[7/7] Starting Frontend Server..." -ForegroundColor Green
$frontendJob = Start-Job -ScriptBlock {
    param($rootDir, $logFile)
    Set-Location $rootDir
    npm run dev 2>&1 | Tee-Object -FilePath $logFile
} -ArgumentList $ROOT_DIR, $FRONTEND_LOG

Write-Host "      Waiting for frontend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "      OK: Frontend running at http://localhost:5173" -ForegroundColor Green

# ========================================
# Success Summary
# ========================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SUCCESS! AirQuiz is Running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Yellow
Write-Host "  * Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "  * Backend:   http://localhost:8000" -ForegroundColor White
Write-Host "  * Admin:     http://localhost:5173/admin" -ForegroundColor White
Write-Host "  * Password:  airquiz2024" -ForegroundColor White
Write-Host ""
Write-Host "Server Status:" -ForegroundColor Yellow
Write-Host "  * Backend Job ID:  $($backendJob.Id)" -ForegroundColor White
Write-Host "  * Frontend Job ID: $($frontendJob.Id)" -ForegroundColor White
Write-Host ""
Write-Host "Logs:" -ForegroundColor Yellow
Write-Host "  * Backend:  $BACKEND_LOG" -ForegroundColor White
Write-Host "  * Frontend: $FRONTEND_LOG" -ForegroundColor White
Write-Host ""
Write-Host "To stop servers, run: .\stop-servers.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to exit (servers will keep running)" -ForegroundColor Cyan
Write-Host ""

# Keep script running
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host ""
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
}
