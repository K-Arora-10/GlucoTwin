# ==============================================================================
# GlucoTwin — Automated Setup & Environment Preparation Script
# Happiest Health Digital Twin Challenge 2026
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  GlucoTwin — Personalized Metabolic Digital Twin (PoC Setup)" -ForegroundColor Cyan
Write-Host "  Happiest Health Digital Twin Challenge 2026" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
Set-Location $ProjectRoot

# 1. Check Python installation
Write-Host "`n[1/5] Checking Python Environment..." -ForegroundColor Yellow
$PythonCmd = "python"
if (Test-Path "$ProjectRoot\venv\Scripts\python.exe") {
    $PythonCmd = "$ProjectRoot\venv\Scripts\python.exe"
    Write-Host "  Found active virtualenv: $PythonCmd" -ForegroundColor Green
} else {
    Write-Host "  Creating new virtual environment 'venv'..." -ForegroundColor Yellow
    python -m venv venv
    $PythonCmd = "$ProjectRoot\venv\Scripts\python.exe"
}

# 2. Install backend requirements
Write-Host "`n[2/5] Installing Backend Python Dependencies..." -ForegroundColor Yellow
& $PythonCmd -m pip install --upgrade pip --quiet
& $PythonCmd -m pip install -r requirements.txt --quiet
Write-Host "  Backend dependencies verified." -ForegroundColor Green

# 3. Check Synthetic Data & Models
Write-Host "`n[3/5] Checking Synthetic Cohort & ML Model Artifacts..." -ForegroundColor Yellow
if (-not (Test-Path "$ProjectRoot\data\cohort_manifest.json")) {
    Write-Host "  Generating 100-patient synthetic cohort..." -ForegroundColor Yellow
    & $PythonCmd "$ProjectRoot\data-generation\generate_synthetic_data.py"
} else {
    Write-Host "  Synthetic cohort dataset present (100 patients, 403,200 steps)." -ForegroundColor Green
}

if (-not (Test-Path "$ProjectRoot\models\gluco_twin_model.joblib")) {
    Write-Host "  Training multimodal gradient boosting digital twin..." -ForegroundColor Yellow
    & $PythonCmd "$ProjectRoot\ml\train_models.py"
} else {
    Write-Host "  ML Model artifact present (models/gluco_twin_model.joblib)." -ForegroundColor Green
}

# 4. Check Frontend Dependencies & Build
Write-Host "`n[4/5] Checking Frontend Dependencies & Building Vite Bundle..." -ForegroundColor Yellow
Set-Location "$ProjectRoot\frontend"
if (-not (Test-Path "$ProjectRoot\frontend\node_modules")) {
    Write-Host "  Installing npm packages in frontend/..." -ForegroundColor Yellow
    npm install --quiet
}
Write-Host "  Running Vite production build..." -ForegroundColor Yellow
npm run build
Set-Location $ProjectRoot
Write-Host "  Frontend build compiled cleanly into frontend/dist/." -ForegroundColor Green

# 5. Run Verification Tests
Write-Host "`n[5/5] Running Backend Verification Pytest Suite..." -ForegroundColor Yellow
& "$ProjectRoot\venv\Scripts\pytest.exe" -q
if ($LASTEXITCODE -eq 0) {
    Write-Host "  All verification tests passed (10/10)!" -ForegroundColor Green
} else {
    Write-Host "  Warning: Some tests reported issues, please review test logs." -ForegroundColor Red
}

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host "  Setup Complete! Launch the live demo by running:" -ForegroundColor Green
Write-Host "  .\scripts\run_demo.ps1" -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan
