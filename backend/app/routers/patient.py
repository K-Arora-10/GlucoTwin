from fastapi import APIRouter, HTTPException
from ..state_engine import StateEngine

router = APIRouter()

@router.get("/patients", response_model=list[str])
async def list_patients():
    return StateEngine.get_patient_ids()

@router.get("/patients/{patient_id}")
async def get_patient(patient_id: str):
    data = StateEngine.get_static(patient_id)
    if not data:
        raise HTTPException(status_code=404, detail="Patient not found")
    return data
