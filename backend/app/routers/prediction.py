from fastapi import APIRouter, HTTPException
from ..state_engine import StateEngine

router = APIRouter()

@router.get("/patients/{patient_id}/prediction")
async def get_prediction(patient_id: str):
    try:
        result = StateEngine.predict_risk(patient_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/patients/{patient_id}/explanation")
async def get_explanation(patient_id: str):
    try:
        explanation = StateEngine.get_explanation(patient_id)
        return explanation
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
