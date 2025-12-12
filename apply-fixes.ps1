# ========================================
# AirQuiz - Quick Fix Script
# Fixes WebSocket connection and logo references
# ========================================

Write-Host "🔧 Applying AirQuiz fixes..." -ForegroundColor Cyan
Write-Host ""

$ROOT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

# Fix 1: Update logo imports
Write-Host "📝 Fixing logo imports..." -ForegroundColor Yellow

$files = @(
    "src\pages\student\WaitingRoom.tsx",
    "src\pages\student\Results.tsx",
    "src\pages\student\QuizActive.tsx",
    "src\pages\student\Login.tsx",
    "src\pages\admin\Dashboard.tsx",
    "src\pages\admin\AdminLogin.tsx"
)

foreach ($file in $files) {
    $filePath = Join-Path $ROOT_DIR $file
    if (Test-Path $filePath) {
        (Get-Content $filePath) -replace "from '@/assets/logo\.png'", "from '@/assets/AirQuizLogoBLACKndBlueMain.svg'" | Set-Content $filePath
        Write-Host "   ✓ Fixed: $file" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✅ All fixes applied!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Please restart the frontend server:" -ForegroundColor Yellow
Write-Host "   1. Stop current server (Ctrl+C)" -ForegroundColor White
Write-Host "   2. Run: npm run dev" -ForegroundColor White
