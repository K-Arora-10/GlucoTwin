#!/usr/bin/env bash
# ==============================================================================
# GlucoTwin — Live Application Demo Launcher (Unix / Linux / macOS)
# Happiest Health Digital Twin Challenge 2026
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=================================================================="
echo "  Launching GlucoTwin — Personalized Metabolic Digital Twin"
echo "  Happiest Health Digital Twin Challenge 2026"
echo "=================================================================="

source venv/bin/activate

# Start backend
echo "[1/3] Starting FastAPI Backend on http://127.0.0.1:8000..."
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

sleep 2

# Start frontend
echo "[2/3] Starting Vite Frontend on http://localhost:3000..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd "$DIR"

sleep 2

echo "[3/3] System Online!"
echo "Doctor Dashboard: http://localhost:3000"
echo "FastAPI Swagger:  http://127.0.0.1:8000/docs"
echo "Press Ctrl+C to stop both services."

cleanup() {
    echo ""
    echo "Stopping GlucoTwin background services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "Services stopped cleanly."
    exit 0
}

trap cleanup INT TERM

wait
