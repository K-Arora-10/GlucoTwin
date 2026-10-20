from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from ..state_engine import StateEngine

router = APIRouter()

class SimulationRequest(BaseModel):
    interventions: Dict[str, Any]
    # Example keys: walk_minutes, carb_reduction_percent, sleep_extra_minutes

@router.post("/patients/{patient_id}/simulate")
async def simulate_intervention(patient_id: str, req: SimulationRequest):
    try:
        result = StateEngine.simulate_intervention(patient_id, req.interventions)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
