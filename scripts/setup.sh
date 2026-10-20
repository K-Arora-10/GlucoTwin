#!/usr/bin/env bash
# ==============================================================================
# GlucoTwin — Automated Setup & Environment Preparation (Unix / Linux / macOS)
# Happiest Health Digital Twin Challenge 2026
# ==============================================================================
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=================================================================="
echo "  GlucoTwin — Personalized Metabolic Digital Twin (PoC Setup)"
echo "  Happiest Health Digital Twin Challenge 2026"
echo "=================================================================="

# 1. Python virtualenv
echo ""
echo "[1/5] Checking Python Virtual Environment..."
if [ ! -d "venv" ]; then
    echo "Creating virtual environment 'venv'..."
    python3 -m venv venv
fi
source venv/bin/activate

# 2. Python dependencies
echo ""
echo "[2/5] Installing Backend Dependencies..."
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
echo "Backend dependencies installed successfully."

# 3. Data & Models
echo ""
echo "[3/5] Checking Synthetic Cohort & ML Models..."
if [ ! -f "data/cohort_manifest.json" ]; then
    echo "Generating 100-patient synthetic cohort..."
    python data-generation/generate_synthetic_data.py
fi
if [ ! -f "models/gluco_twin_model.joblib" ]; then
    echo "Training multimodal gradient boosting digital twin..."
    python ml/train_models.py
fi
echo "Data and model artifacts verified."

# 4. Frontend
echo ""
echo "[4/5] Installing Frontend Dependencies & Building Bundle..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install --quiet
fi
npm run build
cd "$DIR"
echo "Frontend built successfully."

# 5. Tests
echo ""
echo "[5/5] Running Backend Verification Tests..."
pytest -q
echo ""
echo "=================================================================="
echo "  Setup complete! Launch with: ./scripts/run_demo.sh"
echo "=================================================================="
