"""
GlucoTwin — FastAPI Main Application Entrypoint
Happiest Health Digital Twin Challenge 2026
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .state_engine import StateEngine
from .api import router as api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database and hydrates the Digital Twin State Engine on startup."""
    StateEngine.initialize()
    yield

app = FastAPI(
    title="GlucoTwin — Personalized Metabolic Digital Twin",
    description="Clinical Decision Support System predicting adverse postprandial glucose excursions 60–120 minutes ahead via multimodal EHR & wearable IoT stream fusion.",
    version="2.6.0",
    lifespan=lifespan
)

# Enable CORS for local React/Vite development & production frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes under both /api and /api/v1 for maximum compatibility
app.include_router(api_router, prefix="/api", tags=["GlucoTwin API"])
app.include_router(api_router, prefix="/api/v1", tags=["GlucoTwin v1"])

@app.get("/")
async def root():
    return {
        "product": "GlucoTwin — Personalized Metabolic Digital Twin",
        "tagline": "Anticipate metabolic risk. Understand the patient. Explore safer possibilities.",
        "docs_url": "/docs",
        "health_check": "/api/health",
        "challenge": "Happiest Health Digital Twin Challenge 2026"
    }
