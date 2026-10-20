from fastapi import APIRouter, HTTPException
from ..state_engine import StateEngine

router = APIRouter()

@router.get("/patients/{patient_id}/twin")
async def get_twin_state(patient_id: str):
    state = StateEngine.get_twin_state(patient_id)
    if not state:
        raise HTTPException(status_code=404, detail="Patient not found")
    return state
