from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from ..state_engine import StateEngine

router = APIRouter()

class Observation(BaseModel):
    timestamp: str  # ISO 8601 string
    glucose: float | None = None
    hr: float | None = None
    hrv: float | None = None
    steps: int | None = None
    activity_intensity: float | None = None
    sleep_quality: float | None = None
    # Additional fields can be added as needed.

class SensorDataRequest(BaseModel):
    observations: List[Observation]

@router.post("/patients/{patient_id}/sensor-data")
async def ingest_sensor_data(patient_id: str, payload: SensorDataRequest):
    try:
        # Convert Pydantic models to plain dicts before passing.
        obs_dicts = [obs.model_dump() for obs in payload.observations]
        StateEngine.ingest_sensor_data(patient_id, obs_dicts)
        return {"status": "ok", "ingested": len(obs_dicts)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
