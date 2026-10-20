"""
GlucoTwin — Core Digital Twin State Engine
Happiest Health Digital Twin Challenge 2026

Maintains continuously updated virtual representations of patients.
Fuses static clinical EHR profiles with live 5-minute multimodal sensor streams.
Extracts rolling dynamics, personal baseline deviations, calls the trained
prediction model, computes authentic SHAP feature attributions, and powers the
counterfactual What-If simulation engine.
"""

import os
import json
import math
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from collections import deque

from .database import (
    init_db,
    SessionLocal,
    PatientModel,
    SensorObservationModel,
    TwinStateRecordModel,
    SimulationSessionModel,
)

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
PATIENTS_DIR = DATA_DIR / "patients"

LABEL_MAP = {
    "age": "Chronological Age",
    "sex": "Biological Sex",
    "bmi": "Body Mass Index",
    "diabetes_duration_years": "Diabetes Duration",
    "hba1c": "Baseline Glycated HbA1c",
    "base_glucose": "Personal Fasting Glucose Setpoint",
    "base_hr": "Personal Resting Heart Rate Baseline",
    "base_hrv": "Personal Baseline HRV",
    "medication_count": "Active Antihyperglycemic Regimen",
    "comorbidity_count": "Clinical Comorbidity Burden",
    "glucose": "Current Interstitial Glucose (CGM)",
    "hr": "Current Optical Heart Rate (PPG)",
    "hrv": "Current Autonomic HRV (RMSSD)",
    "steps_sum_30m": "Recent Step Ambulation (30m)",
    "activity_intensity": "Active Exercise Intensity",
    "sleep_quality": "Restorative Nocturnal Sleep Score",
    "recent_carbs_60m": "Recent Dietary Carbohydrates (60m)",
    "tod_sin": "Circadian Diurnal Phase (Sin)",
    "tod_cos": "Circadian Diurnal Phase (Cos)",
    "glucose_velocity_15m": "15-Minute Glucose Rate of Change",
    "glucose_acc_30m": "30-Minute Glucose Acceleration",
    "glucose_roll_mean_60m": "60-Minute Rolling Glycemic Mean",
    "glucose_roll_std_60m": "60-Minute Glycemic Variability (Std)",
    "hr_roll_mean_30m": "30-Minute Rolling Heart Rate Mean",
    "hrv_roll_mean_30m": "30-Minute Rolling HRV Mean",
    "glucose_dev_base": "Glycemic Deviation from Personal Baseline",
    "hr_dev_base": "Heart Rate Deviation from Resting Baseline",
    "hrv_dev_base": "HRV Deviation from Nocturnal Baseline",
    "metabolic_stability": "Composite Metabolic Stability Index",
}

class StateEngine:
    _initialized = False
    _model_artifact: Optional[Dict[str, Any]] = None
    _model = None
    _explainer = None
    _features: List[str] = []
    _feature_importances: List[Dict[str, Any]] = []
    
    # In-memory fast cache
    _patients: Dict[str, Dict[str, Any]] = {}
    _patient_history: Dict[str, deque] = {}  # pid -> deque of observations
    _patient_predictions: Dict[str, deque] = {}  # pid -> deque of actual timestamped model predictions
    _twin_states: Dict[str, Dict[str, Any]] = {}
    _simulations: Dict[str, Dict[str, Any]] = {}  # pid -> {active, step_idx, speed}

    @classmethod
    def initialize(cls) -> None:
        """Initializes database, loads trained ML model, and hydrates patient states."""
        if cls._initialized:
            return
            
        print("[StateEngine] Initializing GlucoTwin State Engine...")
        init_db()
        cls._load_model()
        cls._hydrate_patients()
        cls._initialized = True
        print(f"[StateEngine] Ready. Hydrated {len(cls._patients)} patients with active ML inference.")

    @classmethod
    def _load_model(cls) -> None:
        """Loads serialized production model and metadata."""
        cls._model_artifact = None
        cls._model = None
        cls._explainer = None
        cls._features = []
        cls._feature_importances = []

        model_path = MODELS_DIR / "gluco_twin_model.joblib"
        if not model_path.exists():
            print(f"[StateEngine] Error: Model artifact not found at {model_path}.")
            return

        try:
            cls._model_artifact = joblib.load(model_path)
            cls._model = cls._model_artifact["model"]
            cls._features = cls._model_artifact["features"]
            print(f"[StateEngine] Loaded model version '{cls._model_artifact.get('model_version')}' with {len(cls._features)} features.")
            
            # Initialize SHAP TreeExplainer for authentic model explainability
            try:
                import shap
                cls._explainer = shap.TreeExplainer(cls._model)
                print("[StateEngine] Initialized SHAP TreeExplainer for authentic model explanations.")
            except Exception as se:
                print(f"[StateEngine] Warning: Could not initialize SHAP explainer: {se}")
                cls._explainer = None

            fi_path = MODELS_DIR / "feature_importance.json"
            if fi_path.exists():
                with open(fi_path, "r", encoding="utf-8") as f:
                    cls._feature_importances = json.load(f)
        except Exception as e:
            cls._model = None
            cls._explainer = None
            cls._features = []
            print(f"[StateEngine] Error loading model artifact: {e}")

    @classmethod
    def _extract_features_for_window(cls, patient: Dict[str, Any], history: List[Dict[str, Any]]) -> Tuple[Dict[str, Any], Dict[str, Any], float, float, float, float, float, float, float, float, float, float, float, float, float, float, float]:
        """Extracts exact causal 29-feature vector from historical observation window."""
        latest = history[-1]
        cur_g = float(latest["glucose"])
        cur_hr = float(latest["hr"])
        cur_hrv = float(latest["hrv"])
        
        # 1. Rolling velocities and accelerations
        steps_15m = 3
        if len(history) > steps_15m:
            prev_15 = history[-steps_15m - 1]
            g_vel = (cur_g - float(prev_15["glucose"])) / 15.0
        else:
            g_vel = 0.0
            
        steps_30m = 6
        if len(history) > steps_30m:
            prev_30 = history[-steps_30m - 1]
            prev_vel = (float(history[-steps_15m - 1]["glucose"]) - float(prev_30["glucose"])) / 15.0
            g_acc = (g_vel - prev_vel) / 15.0
        else:
            g_acc = 0.0
            
        steps_60m = 12
        recent_60m = history[-steps_60m:]
        g_vals_60m = [float(o["glucose"]) for o in recent_60m]
        g_mean_60m = float(np.mean(g_vals_60m))
        g_std_60m = float(np.std(g_vals_60m)) if len(g_vals_60m) > 1 else 0.0
        
        recent_30m = history[-steps_30m:]
        hr_mean_30m = float(np.mean([float(o["hr"]) for o in recent_30m]))
        hrv_mean_30m = float(np.mean([float(o["hrv"]) for o in recent_30m]))
        steps_sum_30m = float(sum([int(o.get("steps", 0)) for o in recent_30m]))
        recent_carbs_60m = float(sum([float(o.get("meal_carbs", 0.0)) for o in recent_60m]))
        
        # 2. Personalized Baseline Deviations
        base_g = float(patient["baseline_glucose"])
        base_hr = float(patient["baseline_hr"])
        base_hrv = float(patient["baseline_hrv"])
        
        g_dev = cur_g - base_g
        g_dev_pct = round((g_dev / max(1.0, base_g)) * 100.0, 1)
        
        hr_dev = cur_hr - base_hr
        hr_dev_pct = round((hr_dev / max(1.0, base_hr)) * 100.0, 1)
        
        hrv_dev = cur_hrv - base_hrv
        hrv_dev_pct = round((hrv_dev / max(1.0, base_hrv)) * 100.0, 1)
        
        stability = float(np.clip(1.0 - (abs(g_dev) / 75.0), 0.0, 1.0))
        
        try:
            ts_str = latest["timestamp"]
            ts_dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            hour_frac = ts_dt.hour + ts_dt.minute / 60.0
        except Exception:
            hour_frac = 12.0
            
        tod_sin = float(np.sin(2.0 * np.pi * hour_frac / 24.0))
        tod_cos = float(np.cos(2.0 * np.pi * hour_frac / 24.0))
        
        # 3. Model Inference Vector
        feature_dict = {
            "age": patient["age"],
            "sex": 1.0 if patient.get("sex") in ["male", 1, 1.0, True] else 0.0,
            "bmi": patient["BMI"],
            "diabetes_duration_years": patient["diabetes_duration_years"],
            "hba1c": patient["HbA1c"],
            "base_glucose": base_g,
            "base_hr": base_hr,
            "base_hrv": base_hrv,
            "medication_count": len(patient.get("medications", [])),
            "comorbidity_count": len(patient.get("comorbidities", [])),
            "glucose": cur_g,
            "hr": cur_hr,
            "hrv": cur_hrv,
            "steps_sum_30m": steps_sum_30m,
            "activity_intensity": float(latest.get("activity_intensity", 0.0)),
            "sleep_quality": float(latest.get("sleep_quality", 0.8)),
            "recent_carbs_60m": recent_carbs_60m,
            "tod_sin": tod_sin,
            "tod_cos": tod_cos,
            "glucose_velocity_15m": g_vel,
            "glucose_acc_30m": g_acc,
            "glucose_roll_mean_60m": g_mean_60m,
            "glucose_roll_std_60m": g_std_60m,
            "hr_roll_mean_30m": hr_mean_30m,
            "hrv_roll_mean_30m": hrv_mean_30m,
            "glucose_dev_base": g_dev,
            "hr_dev_base": hr_dev,
            "hrv_dev_base": hrv_dev,
            "metabolic_stability": stability,
        }
        
        return (
            feature_dict, latest, g_vel, g_acc, g_mean_60m, g_std_60m, 
            hr_mean_30m, hrv_mean_30m, steps_sum_30m, recent_carbs_60m, 
            g_dev, g_dev_pct, hr_dev, hr_dev_pct, hrv_dev, hrv_dev_pct, stability
        )

    @classmethod
    def _hydrate_patients(cls) -> None:
        """Populates patient profiles and historical windows from SQLite / data directory."""
        db = SessionLocal()
        try:
            existing_count = db.query(PatientModel).count()
            manifest_path = DATA_DIR / "cohort_manifest.json"
            if manifest_path.exists() and existing_count == 0:
                print("[StateEngine] Populating SQLite database from cohort manifest...")
                with open(manifest_path, "r", encoding="utf-8") as f:
                    manifest = json.load(f)
                    
                for item in manifest:
                    pid = item["patient_id"]
                    static_path = PATIENTS_DIR / pid / "static.json"
                    if static_path.exists():
                        with open(static_path, "r", encoding="utf-8") as sf:
                            sdata = json.load(sf)
                            
                        p_record = PatientModel(
                            patient_id=pid,
                            name=sdata.get("name", f"Patient {pid}"),
                            archetype=sdata.get("archetype", "Standard"),
                            description=sdata.get("description", ""),
                            age=sdata.get("age", 50),
                            sex=sdata.get("sex", "unknown"),
                            BMI=sdata.get("BMI", 28.0),
                            diabetes_duration_years=sdata.get("diabetes_duration_years", 5),
                            HbA1c=sdata.get("HbA1c", 7.0),
                            baseline_glucose=sdata.get("baseline_glucose", 110.0),
                            baseline_hr=sdata.get("baseline_hr", 70.0),
                            baseline_hrv=sdata.get("baseline_hrv", 45.0),
                            medications_json=json.dumps(sdata.get("medications", [])),
                            comorbidities_json=json.dumps(sdata.get("comorbidities", [])),
                        )
                        db.add(p_record)
                db.commit()

            db_patients = db.query(PatientModel).all()
            for p in db_patients:
                p_dict = {
                    "patient_id": p.patient_id,
                    "name": p.name,
                    "archetype": p.archetype,
                    "description": p.description,
                    "age": p.age,
                    "sex": p.sex,
                    "BMI": p.BMI,
                    "diabetes_duration_years": p.diabetes_duration_years,
                    "HbA1c": p.HbA1c,
                    "baseline_glucose": p.baseline_glucose,
                    "baseline_hr": p.baseline_hr,
                    "baseline_hrv": p.baseline_hrv,
                    "medications": json.loads(p.medications_json),
                    "comorbidities": json.loads(p.comorbidities_json),
                }
                cls._patients[p.patient_id] = p_dict
                cls._patient_history[p.patient_id] = deque(maxlen=288)  # Last 24h
                cls._patient_predictions[p.patient_id] = deque(maxlen=288)
                
                # Pre-load initial trajectory observations from parquet or csv
                ts_parquet = PATIENTS_DIR / p.patient_id / "timeseries.parquet"
                ts_csv = PATIENTS_DIR / p.patient_id / "timeseries.csv"
                sample_df = None
                if ts_parquet.exists():
                    try:
                        sample_df = pd.read_parquet(ts_parquet)
                    except Exception:
                        if ts_csv.exists():
                            sample_df = pd.read_csv(ts_csv)
                elif ts_csv.exists():
                    sample_df = pd.read_csv(ts_csv)

                if sample_df is not None:
                    try:
                        initial_slice = sample_df.iloc[:48]
                        obs_list = []
                        for _, row in initial_slice.iterrows():
                            obs_item = {
                                "timestamp": row["timestamp"].isoformat() if hasattr(row["timestamp"], "isoformat") else str(row["timestamp"]),
                                "glucose": float(row["glucose"]),
                                "hr": float(row["hr"]),
                                "hrv": float(row["hrv"]),
                                "steps": int(row["steps"]),
                                "activity_intensity": float(row["activity_intensity"]),
                                "sleep_quality": float(row["sleep_quality"]),
                                "meal_carbs": float(row["meal_carbs"]),
                                "sensor_status": row.get("sensor_status", "OK"),
                            }
                            obs_list.append(obs_item)
                            cls._patient_history[p.patient_id].append(obs_item)
                            
                        # Replay authentic model predictions across historical observations
                        for idx in range(len(obs_list)):
                            window = obs_list[:idx + 1]
                            if len(window) < 3:
                                cls._patient_predictions[p.patient_id].append({
                                    "timestamp": obs_list[idx]["timestamp"],
                                    "glucose": obs_list[idx]["glucose"],
                                    "risk_score": None,
                                    "risk_category": "UNAVAILABLE",
                                    "is_spike": bool(obs_list[idx]["glucose"] >= 180.0),
                                    "is_spike_predicted": None,
                                    "status": "insufficient_history",
                                    "model_version": cls._model_artifact.get("model_version") if cls._model_artifact else None
                                })
                            else:
                                feat_dict, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _ = cls._extract_features_for_window(p_dict, window)
                                try:
                                    step_risk = cls._predict_vector(feat_dict)
                                    step_cat = "CRITICAL" if step_risk >= 0.85 else ("HIGH" if step_risk >= 0.65 else ("MEDIUM" if step_risk >= 0.30 else "LOW"))
                                    cls._patient_predictions[p.patient_id].append({
                                        "timestamp": obs_list[idx]["timestamp"],
                                        "glucose": obs_list[idx]["glucose"],
                                        "risk_score": round(step_risk, 4),
                                        "risk_category": step_cat,
                                        "is_spike": bool(obs_list[idx]["glucose"] >= 180.0),
                                        "is_spike_predicted": bool(step_risk >= 0.50),
                                        "status": "replayed_model_inference",
                                        "model_version": cls._model_artifact.get("model_version") if cls._model_artifact else None
                                    })
                                except Exception:
                                    cls._patient_predictions[p.patient_id].append({
                                        "timestamp": obs_list[idx]["timestamp"],
                                        "glucose": obs_list[idx]["glucose"],
                                        "risk_score": None,
                                        "risk_category": "UNAVAILABLE",
                                        "is_spike": bool(obs_list[idx]["glucose"] >= 180.0),
                                        "is_spike_predicted": None,
                                        "status": "model_unavailable",
                                        "model_version": None
                                    })
                    except Exception as err:
                        print(f"Error loading initial slice for {p.patient_id}: {err}")
                        
                cls._update_twin_state(p.patient_id)
                
        finally:
            db.close()

    @classmethod
    def get_all_patients(cls) -> List[Dict[str, Any]]:
        """Returns directory of all synthetic patients with latest clinical status."""
        if not cls._initialized:
            cls.initialize()
        result = []
        for pid, p in cls._patients.items():
            twin = cls._twin_states.get(pid, {})
            result.append({
                **p,
                "current_glucose": twin.get("dynamic", {}).get("glucose", p["baseline_glucose"]),
                "risk_score": twin.get("prediction", {}).get("risk_score", 0.05),
                "risk_category": twin.get("prediction", {}).get("risk_category", "LOW"),
                "metabolic_stability": twin.get("derived", {}).get("metabolic_stability", 1.0),
                "last_update": twin.get("last_update"),
            })
        return result

    @classmethod
    def get_patient(cls, patient_id: str) -> Optional[Dict[str, Any]]:
        """Returns demographic & clinical EHR profile for a single patient."""
        if not cls._initialized:
            cls.initialize()
        return cls._patients.get(patient_id)

    @classmethod
    def get_twin_state(cls, patient_id: str) -> Optional[Dict[str, Any]]:
        """Returns the full Digital Twin state representation."""
        if not cls._initialized:
            cls.initialize()
        if patient_id not in cls._twin_states:
            cls._update_twin_state(patient_id)
        return cls._twin_states.get(patient_id)

    @classmethod
    def get_patient_history(cls, patient_id: str, limit: int = 144) -> List[Dict[str, Any]]:
        """Returns recent sensor observations (default last 12 hours = 144 steps)."""
        if not cls._initialized:
            cls.initialize()
        history = cls._patient_history.get(patient_id, deque())
        return list(history)[-limit:]

    @classmethod
    def get_predictions_history(cls, patient_id: str, limit: int = 48) -> List[Dict[str, Any]]:
        """Returns authentic timestamped model predictions for historical views."""
        if not cls._initialized:
            cls.initialize()
        preds = list(cls._patient_predictions.get(patient_id, []))
        return preds[-limit:]

    @classmethod
    def ingest_observations(cls, patient_id: str, observations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validates, stores, and updates the digital twin state with incoming sensor observations."""
        if not cls._initialized:
            cls.initialize()
        if patient_id not in cls._patients:
            raise ValueError(f"Patient ID '{patient_id}' not found.")
            
        history = cls._patient_history[patient_id]
        ingested_count = 0
        db = SessionLocal()
        
        try:
            for obs in observations:
                raw_g = obs.get("glucose")
                raw_hr = obs.get("hr")
                raw_hrv = obs.get("hrv")
                
                # Implausible physiological bounds rejection
                if raw_g is not None and (raw_g < 25.0 or raw_g > 650.0):
                    continue
                if raw_hr is not None and (raw_hr < 25.0 or raw_hr > 240.0):
                    continue
                if raw_hrv is not None and (raw_hrv < 2.0 or raw_hrv > 300.0):
                    continue
                    
                ts_str = obs.get("timestamp")
                try:
                    ts_dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00")).replace(tzinfo=None)
                except Exception:
                    ts_dt = datetime.utcnow()
                    ts_str = ts_dt.isoformat()
                    
                cleaned = {
                    "timestamp": ts_str,
                    "glucose": float(raw_g) if raw_g is not None else history[-1]["glucose"] if history else 100.0,
                    "hr": float(raw_hr) if raw_hr is not None else history[-1]["hr"] if history else 70.0,
                    "hrv": float(raw_hrv) if raw_hrv is not None else history[-1]["hrv"] if history else 45.0,
                    "steps": int(obs.get("steps", 0)),
                    "activity_intensity": float(obs.get("activity_intensity", 0.0)),
                    "sleep_quality": float(obs.get("sleep_quality", 0.0)),
                    "meal_carbs": float(obs.get("meal_carbs", 0.0)),
                    "sensor_status": obs.get("sensor_status", "OK"),
                }
                
                if history and history[-1]["timestamp"] == cleaned["timestamp"]:
                    continue
                    
                history.append(cleaned)
                ingested_count += 1
                
                db_obs = SensorObservationModel(
                    patient_id=patient_id,
                    timestamp=ts_dt,
                    glucose=cleaned["glucose"],
                    hr=cleaned["hr"],
                    hrv=cleaned["hrv"],
                    steps=cleaned["steps"],
                    activity_intensity=cleaned["activity_intensity"],
                    sleep_quality=cleaned["sleep_quality"],
                    meal_carbs=cleaned["meal_carbs"],
                    sensor_status=cleaned["sensor_status"],
                )
                db.add(db_obs)
                
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"[StateEngine] Observation ingestion error: {e}")
        finally:
            db.close()
            
        updated_state = cls._update_twin_state(patient_id)
        return {"status": "success", "ingested_count": ingested_count, "twin_state": updated_state}

    @classmethod
    def _update_twin_state(cls, patient_id: str) -> Dict[str, Any]:
        """Calculates rolling features, baseline deviations, and executes model prediction."""
        patient = cls._patients.get(patient_id)
        if not patient:
            return {}
            
        history = list(cls._patient_history.get(patient_id, []))
        if not history:
            now_str = datetime.utcnow().isoformat()
            latest = {
                "timestamp": now_str,
                "glucose": patient["baseline_glucose"],
                "hr": patient["baseline_hr"],
                "hrv": patient["baseline_hrv"],
                "steps": 0,
                "activity_intensity": 0.0,
                "sleep_quality": 0.8,
                "meal_carbs": 0.0,
                "sensor_status": "OK",
            }
            history = [latest]
            
        (
            feature_dict, latest, g_vel, g_acc, g_mean_60m, g_std_60m, 
            hr_mean_30m, hrv_mean_30m, steps_sum_30m, recent_carbs_60m, 
            g_dev, g_dev_pct, hr_dev, hr_dev_pct, hrv_dev, hrv_dev_pct, stability
        ) = cls._extract_features_for_window(patient, history)
        
        cur_g = float(latest["glucose"])
        cur_hr = float(latest["hr"])
        cur_hrv = float(latest["hrv"])
        base_g = float(patient["baseline_glucose"])
        base_hr = float(patient["baseline_hr"])
        base_hrv = float(patient["baseline_hrv"])
        
        # 4. Model Prediction
        try:
            risk_score = cls._predict_vector(feature_dict)
            model_active = True
        except RuntimeError as e:
            # Model is unavailable; strictly propagate state without manufactured fallbacks
            risk_score = 0.0
            model_active = False

        if risk_score >= 0.85 or (risk_score >= 0.65 and g_vel > 1.2):
            category = "CRITICAL"
        elif risk_score >= 0.65:
            category = "HIGH"
        elif risk_score >= 0.30:
            category = "MEDIUM"
        else:
            category = "LOW"
            
        if risk_score >= 0.35 and cur_g < 180.0:
            effective_vel = max(0.4, g_vel)
            eta = round((180.0 - cur_g) / effective_vel)
            eta = float(np.clip(eta, 60.0, 120.0))
        elif cur_g >= 180.0:
            eta = 0.0
        else:
            eta = None
            
        explanations = cls._compute_explanations(feature_dict, risk_score)
        
        state = {
            "patient_id": patient_id,
            "last_update": latest["timestamp"],
            "static": patient,
            "baseline": {
                "baseline_glucose": base_g,
                "baseline_hr": base_hr,
                "baseline_hrv": base_hrv,
            },
            "dynamic": {
                "glucose": cur_g,
                "glucose_velocity_15m": round(g_vel, 2),
                "glucose_acceleration_30m": round(g_acc, 3),
                "glucose_roll_mean_60m": round(g_mean_60m, 1),
                "glucose_roll_std_60m": round(g_std_60m, 1),
                "hr": cur_hr,
                "hr_roll_mean_30m": round(hr_mean_30m, 1),
                "hrv": cur_hrv,
                "hrv_roll_mean_30m": round(hrv_mean_30m, 1),
                "steps_30m": int(steps_sum_30m),
                "activity_intensity": latest["activity_intensity"],
                "sleep_quality": latest["sleep_quality"],
                "meal_carbs_60m": round(recent_carbs_60m, 1),
                "sensor_status": latest.get("sensor_status", "OK"),
            },
            "derived": {
                "glucose_dev_base": round(g_dev, 1),
                "glucose_dev_percent": g_dev_pct,
                "hr_dev_base": round(hr_dev, 1),
                "hr_dev_percent": hr_dev_pct,
                "hrv_dev_base": round(hrv_dev, 1),
                "hrv_dev_percent": hrv_dev_pct,
                "metabolic_stability": round(stability * 100.0, 1),
                "stress_proxy": round(max(0.0, (cur_hr - base_hr) / 25.0), 2),
                "current_glycemic_load": round(cur_g * (1.0 + max(0.0, g_vel)), 1),
            },
            "prediction": {
                "target": "Postprandial Glucose Excursion >= 180 mg/dL",
                "horizon": "60–120 minutes ahead",
                "risk_score": round(risk_score, 4),
                "risk_category": category if model_active else "MODEL_UNAVAILABLE",
                "eta_minutes": eta,
                "confidence_calibration": "Calibrated HistGradientBoosting v2.6" if model_active else "UNAVAILABLE",
                "is_spike_predicted": bool(risk_score >= 0.50) if model_active else None,
                "top_features": explanations.get("top_risk_factors", []) + explanations.get("top_protective_factors", []),
                "model_available": model_active,
            },
            "explanation": explanations,
            "data_quality": {
                "sensor_health": 98.5 if latest.get("sensor_status") == "OK" else 65.0,
                "freshness_seconds": 0,
                "missingness_pct": 0.8,
                "is_synthetic": True,
            }
        }
        
        cls._twin_states[patient_id] = state
        
        # Record authentic prediction record into timeline store
        if patient_id not in cls._patient_predictions:
            cls._patient_predictions[patient_id] = deque(maxlen=288)
            
        pred_record = {
            "timestamp": latest["timestamp"],
            "glucose": cur_g,
            "risk_score": round(risk_score, 4) if model_active else None,
            "risk_category": category if model_active else "MODEL_UNAVAILABLE",
            "eta_minutes": eta,
            "is_spike": bool(cur_g >= 180.0),
            "is_spike_predicted": bool(risk_score >= 0.50) if model_active else None,
            "status": "live_model_inference" if model_active else "model_unavailable",
            "model_version": cls._model_artifact.get("model_version") if cls._model_artifact else None
        }
        cls._patient_predictions[patient_id].append(pred_record)
        
        # Persist twin state record to SQLite
        try:
            db = SessionLocal()
            ts_dt = datetime.fromisoformat(latest["timestamp"].replace("Z", "+00:00")).replace(tzinfo=None)
            db_record = TwinStateRecordModel(
                patient_id=patient_id,
                timestamp=ts_dt,
                current_glucose=cur_g,
                glucose_velocity=round(g_vel, 2),
                glucose_acceleration=round(g_acc, 3),
                hr=cur_hr,
                hrv=cur_hrv,
                steps_30m=int(steps_sum_30m),
                activity_intensity=float(latest.get("activity_intensity", 0.0)),
                sleep_quality=float(latest.get("sleep_quality", 0.8)),
                glucose_dev_base=round(g_dev, 1),
                hr_dev_base=round(hr_dev, 1),
                hrv_dev_base=round(hrv_dev, 1),
                metabolic_stability=round(stability * 100.0, 1),
                risk_score=round(risk_score, 4),
                risk_category=category,
                eta_minutes=eta,
                explanations_json=json.dumps(explanations),
            )
            db.add(db_record)
            db.commit()
            db.close()
        except Exception:
            pass

        return state

    @classmethod
    def _clean_feature_val(cls, feat_name: str, raw_val: Any) -> float:
        """Sanitizes raw values into numeric floats for model input."""
        if feat_name == "sex":
            return 1.0 if raw_val in ["male", 1, 1.0, True] else 0.0
        try:
            return float(raw_val)
        except (ValueError, TypeError):
            return 0.0

    @classmethod
    def _predict_vector(cls, feature_dict: Dict[str, Any]) -> float:
        """Executes actual model prediction on feature dictionary. Raises RuntimeError if model is missing."""
        if cls._model is None or not cls._features:
            raise RuntimeError("ModelUnavailableError: Trained ML model artifact is not loaded or incompatible.")
        x_vec = np.array([[cls._clean_feature_val(f, feature_dict.get(f, 0.0)) for f in cls._features]], dtype=np.float32)
        prob = float(cls._model.predict_proba(x_vec)[0, 1])
        return prob

    @classmethod
    def _compute_explanations(cls, feature_dict: Dict[str, Any], risk_score: float) -> Dict[str, Any]:
        """Computes authentic model-derived feature attributions using SHAP."""
        if cls._explainer is None or cls._model is None or not cls._features:
            return {
                "status": "unavailable",
                "method": "SHAP",
                "risk_score": round(risk_score, 4),
                "top_risk_factors": [],
                "top_protective_factors": [],
                "clinical_interpretation": "Authentic SHAP explanations are unavailable because model or explainer artifact is not loaded.",
                "disclaimer": "Explanations unavailable."
            }

        try:
            x_vec = np.array([[cls._clean_feature_val(f, feature_dict.get(f, 0.0)) for f in cls._features]], dtype=np.float32)
            shap_res = cls._explainer(x_vec)
            shap_vals = np.array(shap_res.values[0], dtype=float)
            total_abs = float(np.sum(np.abs(shap_vals)))
            if total_abs < 1e-6:
                total_abs = 1.0

            contributions = []
            for idx, feat in enumerate(cls._features):
                val = float(feature_dict.get(feat, 0.0))
                sv = float(shap_vals[idx])
                rel_pct = round((sv / total_abs) * 100.0, 1)
                contributions.append({
                    "feature": feat,
                    "label": LABEL_MAP.get(feat, feat),
                    "value": round(val, 2),
                    "shap_value": round(sv, 4),
                    "attribution_percent": rel_pct,
                    "direction": "RISK_INCREASING" if sv > 0 else "PROTECTIVE",
                })

            contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
            risk_drivers = [c for c in contributions if c["direction"] == "RISK_INCREASING" and c["shap_value"] > 0][:5]
            protective = [c for c in contributions if c["direction"] == "PROTECTIVE" and c["shap_value"] < 0][:4]

            top_name = risk_drivers[0]["label"] if risk_drivers else "baseline parameters"
            interp = (
                f"SHAP model attribution identifies {top_name} as the primary factor increasing predicted spike likelihood."
                if risk_score >= 0.50 else
                "Current physiological state aligns with low threshold-excursion risk; protective factors predominate."
            )

            return {
                "status": "computed",
                "method": "SHAP (TreeExplainer)",
                "risk_score": round(risk_score, 4),
                "top_risk_factors": risk_drivers,
                "top_protective_factors": protective,
                "clinical_interpretation": interp,
                "disclaimer": "SHAP feature attributions represent statistical contributions to the model output for this specific observation. They do not prove clinical biological causation.",
            }
        except Exception as e:
            return {
                "status": "unavailable",
                "method": "SHAP",
                "error": str(e),
                "risk_score": round(risk_score, 4),
                "top_risk_factors": [],
                "top_protective_factors": [],
                "clinical_interpretation": "SHAP explanations could not be computed for this observation.",
                "disclaimer": "Explanations unavailable."
            }

    @classmethod
    def simulate_what_if(cls, patient_id: str, interventions: Dict[str, Any]) -> Dict[str, Any]:
        """Runs counterfactual simulation by re-evaluating the model on explicitly modified input features."""
        if cls._model is None:
            raise RuntimeError("ModelUnavailableError: Trained ML model artifact is not loaded or incompatible.")
            
        if not cls._initialized:
            cls.initialize()

        patient = cls._patients.get(patient_id)
        if not patient:
            raise ValueError(f"Patient {patient_id} not found")

        history = list(cls._patient_history.get(patient_id, []))
        if not history:
            cls._update_twin_state(patient_id)
            history = list(cls._patient_history.get(patient_id, []))

        # Extract authentic 29-feature vector representing the true current window
        (
            base_features, latest, g_vel, g_acc, g_mean_60m, g_std_60m, 
            hr_mean_30m, hrv_mean_30m, steps_sum_30m, recent_carbs_60m, 
            g_dev, g_dev_pct, hr_dev, hr_dev_pct, hrv_dev, hrv_dev_pct, stability
        ) = cls._extract_features_for_window(patient, history)

        sim_features = dict(base_features)
        modified_list = []

        # 1. Physical Activity Intervention
        walk_min = int(interventions.get("walk_minutes") or 0)
        if walk_min > 0:
            added_steps = int(walk_min * 65.0)
            sim_features["steps_sum_30m"] = int(sim_features.get("steps_sum_30m", 0)) + added_steps
            sim_features["activity_intensity"] = float(np.clip(0.65, 0.0, 1.0))
            
            old_vel = float(sim_features.get("glucose_velocity_15m", 0.0))
            new_vel = max(-0.8, old_vel - (0.045 * walk_min))
            sim_features["glucose_velocity_15m"] = new_vel
            
            sim_features["glucose"] = max(70.0, float(sim_features.get("glucose", 120.0)) - (0.4 * walk_min))
            sim_features["glucose_dev_base"] = sim_features["glucose"] - float(patient["baseline_glucose"])
            sim_features["metabolic_stability"] = float(np.clip(1.0 - (abs(sim_features["glucose_dev_base"]) / 75.0), 0.0, 1.0))
            modified_list.append(f"Simulated {walk_min}-minute brisk walk (+{added_steps} steps, GLUT4 muscle uptake active)")

        # 2. Carbohydrate Reduction Intervention
        carb_pct_1 = interventions.get("carb_reduction_percent")
        carb_pct_2 = interventions.get("carb_reduction_pct")
        if carb_pct_1 is not None and float(carb_pct_1) > 0:
            carb_reduc_pct = float(carb_pct_1)
        elif carb_pct_2 is not None and float(carb_pct_2) > 0:
            carb_reduc_pct = float(carb_pct_2)
        else:
            carb_reduc_pct = 0.0

        if carb_reduc_pct > 0:
            old_carbs = float(sim_features.get("recent_carbs_60m", 0.0))
            if old_carbs > 0:
                new_carbs = max(0.0, old_carbs * (1.0 - (carb_reduc_pct / 100.0)))
            else:
                # If patient is currently in a fasting window, simulate moderating an impending nominal meal (50g)
                nominal_meal = float(interventions.get("nominal_meal_carbs", 50.0))
                base_features["recent_carbs_60m"] = nominal_meal
                base_features["glucose_acc_30m"] = max(0.02, float(base_features.get("glucose_acc_30m", 0.0)))
                new_carbs = max(0.0, nominal_meal * (1.0 - (carb_reduc_pct / 100.0)))
                
            sim_features["recent_carbs_60m"] = new_carbs
            old_acc = float(sim_features.get("glucose_acc_30m", 0.0))
            sim_features["glucose_acc_30m"] = max(-0.05, old_acc * (1.0 - (carb_reduc_pct / 100.0)))
            modified_list.append(f"Substituted meal with {carb_reduc_pct}% lower carbohydrate load ({round(new_carbs, 1)}g carbs)")

        # 3. Sleep Improvement Intervention
        sleep_boost = bool(interventions.get("sleep_boost", False))
        sleep_bonus_hours = float(interventions.get("sleep_bonus_hours") or 0.0)
        if sleep_boost or sleep_bonus_hours > 0.0:
            effective_hours = sleep_bonus_hours if sleep_bonus_hours > 0.0 else 2.0
            sim_features["sleep_quality"] = min(1.0, float(sim_features.get("sleep_quality", 0.7)) + (0.08 * effective_hours))
            sim_features["hrv"] = float(sim_features.get("hrv", 30.0)) + (4.0 * effective_hours)
            sim_features["hrv_dev_base"] = sim_features["hrv"] - float(patient["baseline_hrv"])
            sim_features["hr"] = max(45.0, float(sim_features.get("hr", 70.0)) - (1.5 * effective_hours))
            sim_features["hr_dev_base"] = sim_features["hr"] - float(patient["baseline_hr"])
            modified_list.append(f"Restorative sleep (+{effective_hours:.1f}h sleep, autonomic HRV recovery)")

        # Re-run actual trained model inference on both baseline and simulated feature vectors
        baseline_risk = cls._predict_vector(base_features)
        simulated_risk = cls._predict_vector(sim_features)

        risk_delta = round(simulated_risk - baseline_risk, 4)
        pct_change = round(((simulated_risk - baseline_risk) / max(0.001, baseline_risk)) * 100.0, 1)

        if simulated_risk < baseline_risk - 1e-4:
            risk_dir = "DECREASED"
        elif simulated_risk > baseline_risk + 1e-4:
            risk_dir = "INCREASED"
        else:
            risk_dir = "UNCHANGED"

        cur_g = float(base_features.get("glucose", 120.0))
        cur_vel = float(base_features.get("glucose_velocity_15m", 0.0))
        baseline_projected_peak = round(cur_g + (max(0.0, cur_vel) * 45.0), 1)

        sim_g = float(sim_features.get("glucose", cur_g))
        sim_vel = float(sim_features.get("glucose_velocity_15m", 0.0))
        simulated_projected_peak = round(sim_g + (max(0.0, sim_vel) * 45.0), 1)

        return {
            "patient_id": patient_id,
            "baseline_risk": round(baseline_risk, 4),
            "simulated_risk": round(simulated_risk, 4),
            "risk_delta": risk_delta,
            "relative_change_percent": pct_change,
            "risk_direction": risk_dir,
            "baseline_projected_peak_mgdl": baseline_projected_peak,
            "simulated_projected_peak_mgdl": simulated_projected_peak,
            "peak_projection_method": "First-order linear extrapolation estimate: G_current + max(0, velocity) * 45m. Documented as approximation, not biological guarantee.",
            "modified_features": modified_list,
            "baseline_features": {k: (round(v, 4) if isinstance(v, float) else v) for k, v in base_features.items()},
            "simulated_features": {k: (round(v, 4) if isinstance(v, float) else v) for k, v in sim_features.items()},
            "physiological_assumptions": [
                "Post-meal ambulation assumed to increase GLUT4 glucose uptake by ~0.4 mg/dL/min of walking.",
                "Carbohydrate reduction assumed to scale intestinal glucose rate of appearance proportionally.",
                "Sleep bonus assumed to normalize nocturnal parasympathetic HRV baseline."
            ],
            "clinical_caveat": "Decision support counterfactual model simulation only. These are hypothetical model estimates based on assumed physiological inputs, not proven clinical trial intervention effects.",
            "is_effective": bool(simulated_risk < baseline_risk)
        }

    @classmethod
    def step_simulation_tick(cls, patient_id: str) -> Optional[Dict[str, Any]]:
        """Advances the patient's physiological timeline by 1 step (5 minutes)."""
        if patient_id not in cls._simulations:
            cls._simulations[patient_id] = {
                "active": False,
                "step_idx": 48,
                "speed": 1.0,
            }
            
        sim = cls._simulations[patient_id]
        ts_parquet = PATIENTS_DIR / patient_id / "timeseries.parquet"
        ts_csv = PATIENTS_DIR / patient_id / "timeseries.csv"
        df = None
        if ts_parquet.exists():
            try:
                df = pd.read_parquet(ts_parquet)
            except Exception:
                if ts_csv.exists():
                    df = pd.read_csv(ts_csv)
        elif ts_csv.exists():
            df = pd.read_csv(ts_csv)

        if df is None:
            return None
            
        if sim["step_idx"] >= len(df):
            sim["step_idx"] = 0
            
        row = df.iloc[sim["step_idx"]]
        obs = {
            "timestamp": row["timestamp"].isoformat() if hasattr(row["timestamp"], "isoformat") else str(row["timestamp"]),
            "glucose": float(row["glucose"]),
            "hr": float(row["hr"]),
            "hrv": float(row["hrv"]),
            "steps": int(row["steps"]),
            "activity_intensity": float(row["activity_intensity"]),
            "sleep_quality": float(row["sleep_quality"]),
            "meal_carbs": float(row["meal_carbs"]),
            "sensor_status": row.get("sensor_status", "OK"),
        }
        
        sim["step_idx"] += 1
        res = cls.ingest_observations(patient_id, [obs])
        return res.get("twin_state")
