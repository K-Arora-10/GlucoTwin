# ==============================================================================
# GlucoTwin — Live Application Demo Launcher
# Happiest Health Digital Twin Challenge 2026
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  Launching GlucoTwin — Personalized Metabolic Digital Twin" -ForegroundColor Cyan
Write-Host "  Happiest Health Digital Twin Challenge 2026" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
Set-Location $ProjectRoot

$PythonExe = "$ProjectRoot\venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    $PythonExe = "python"
}

Write-Host "`n[1/3] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Yellow
$BackendProcess = Start-Process -FilePath $PythonExe -ArgumentList "-m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000" -PassThru -NoNewWindow

Start-Sleep -Seconds 2

Write-Host "`n[2/3] Starting Vite Frontend on http://localhost:3000..." -ForegroundColor Yellow
Set-Location "$ProjectRoot\frontend"
$FrontendProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -PassThru -NoNewWindow
Set-Location $ProjectRoot

Start-Sleep -Seconds 2

Write-Host "`n[3/3] Launching Web Browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host "  GlucoTwin is live!" -ForegroundColor Green
Write-Host "  Doctor Dashboard: http://localhost:3000" -ForegroundColor White
Write-Host "  FastAPI Swagger:  http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "  Press Ctrl+C or close this terminal to stop both services." -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan

try {
    # Keep script open and wait for process
    Wait-Process -Id $BackendProcess.Id, $FrontendProcess.Id
} finally {
    Write-Host "`nShutting down GlucoTwin background services..." -ForegroundColor Yellow
    Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $FrontendProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "Services stopped cleanly." -ForegroundColor Green
}
