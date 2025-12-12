# ========================================
# AirQuiz - Stop All Servers (PowerShell)
# ========================================

Write-Host "🛑 Stopping AirQuiz servers..." -ForegroundColor Yellow

# Stop all uvicorn processes (backend)
Get-Process -Name "uvicorn" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "   ✓ Backend stopped" -ForegroundColor Green

# Stop all node processes running vite (frontend)
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*vite*"
} | Stop-Process -Force
Write-Host "   ✓ Frontend stopped" -ForegroundColor Green

Write-Host ""
Write-Host "✅ All servers stopped!" -ForegroundColor Green
