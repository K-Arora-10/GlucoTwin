"""
GlucoTwin — Synthetic Clinical & Physiological Data Generator
Happiest Health Digital Twin Challenge 2026

Generates realistic, scientifically grounded synthetic cohorts combining:
1. Static EHR Profiles (Synthea-aligned schema): demographics, HbA1c, BMI,
   diabetes duration, medications, comorbidities, and baseline vitals.
2. Dynamic Multimodal Sensor Streams (5-minute frequency):
   - Continuous Glucose Monitoring (CGM) via Bergman Minimal Model dynamics
   - Wearable Photoplethysmography (Heart Rate, HRV/RMSSD)
   - Accelerometry (Step counts, activity intensity)
   - Sleep tracking (circadian phase, duration, quality score)
   - Meal events (carbohydrate load, absorption kinetics)
   - Sensor noise, dropout, and missingness artifacts

Includes 5 targeted Clinical Archetypes for live jury demonstration.
"""

import os
import json
import math
import random
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
PATIENTS_DIR = DATA_DIR / "patients"

# Reproducibility seed
SEED = 2026
random.seed(SEED)
np.random.seed(SEED)

DEMO_PATIENTS = [
    {
        "patient_id": "PT-001",
        "name": "Eleanor Vance",
        "archetype": "Stable Diabetic",
        "description": "Controlled type-2 diabetes, consistent diet, regular moderate exercise, predictable postprandial recovery.",
        "age": 58,
        "sex": "female",
        "BMI": 26.4,
        "diabetes_duration_years": 4,
        "HbA1c": 6.7,
        "baseline_glucose": 112.0,
        "medications": ["Metformin 500mg BID"],
        "comorbidities": [],
        "baseline_hr": 68.0,
        "baseline_hrv": 48.0,
        "insulin_sensitivity": 0.042,
        "glucose_clearance": 0.028,
        "carb_sensitivity": 1.25,
        "activity_frequency": 0.85,
        "sleep_quality_mean": 0.85,
        "sensor_noise_std": 2.5,
        "dropout_rate": 0.005,
    },
    {
        "patient_id": "PT-002",
        "name": "Marcus Chen",
        "archetype": "High-Risk Diabetic",
        "description": "Elevated fasting glucose, insulin resistance, frequent acute postprandial excursions crossing 200 mg/dL.",
        "age": 63,
        "sex": "male",
        "BMI": 33.8,
        "diabetes_duration_years": 11,
        "HbA1c": 8.9,
        "baseline_glucose": 148.0,
        "medications": ["Metformin 1000mg BID", "Glimepiride 4mg QD"],
        "comorbidities": ["Hypertension", "Dyslipidemia"],
        "baseline_hr": 78.0,
        "baseline_hrv": 28.0,
        "insulin_sensitivity": 0.018,
        "glucose_clearance": 0.015,
        "carb_sensitivity": 2.10,
        "activity_frequency": 0.30,
        "sleep_quality_mean": 0.60,
        "sensor_noise_std": 3.5,
        "dropout_rate": 0.01,
    },
    {
        "patient_id": "PT-003",
        "name": "Sarah Jenkins",
        "archetype": "Sleep-Deprived & Stress-Reactive",
        "description": "Severe sleep fragmentation, chronic sympathetic elevation, blunted HRV, erratic nocturnal glucose spikes.",
        "age": 47,
        "sex": "female",
        "BMI": 29.5,
        "diabetes_duration_years": 6,
        "HbA1c": 7.6,
        "baseline_glucose": 128.0,
        "medications": ["Metformin 850mg BID"],
        "comorbidities": ["Sleep Apnea", "Generalized Anxiety"],
        "baseline_hr": 82.0,
        "baseline_hrv": 24.0,
        "insulin_sensitivity": 0.026,
        "glucose_clearance": 0.020,
        "carb_sensitivity": 1.70,
        "activity_frequency": 0.50,
        "sleep_quality_mean": 0.42,
        "sensor_noise_std": 3.0,
        "dropout_rate": 0.015,
    },
    {
        "patient_id": "PT-004",
        "name": "David Okafor",
        "archetype": "High Activity / Well-Compensated",
        "description": "High cardiorespiratory fitness, vigorous physical activity dampening postprandial excursions effectively.",
        "age": 52,
        "sex": "male",
        "BMI": 25.1,
        "diabetes_duration_years": 3,
        "HbA1c": 6.4,
        "baseline_glucose": 105.0,
        "medications": ["Empagliflozin 10mg QD"],
        "comorbidities": [],
        "baseline_hr": 58.0,
        "baseline_hrv": 62.0,
        "insulin_sensitivity": 0.055,
        "glucose_clearance": 0.035,
        "carb_sensitivity": 1.10,
        "activity_frequency": 0.95,
        "sleep_quality_mean": 0.88,
        "sensor_noise_std": 2.0,
        "dropout_rate": 0.005,
    },
    {
        "patient_id": "PT-005",
        "name": "Robert Kowalski",
        "archetype": "Complex Multi-Morbidity & Sensor Dropout",
        "description": "Advanced diabetes duration, renal microvascular disease, intermittent wearable contact loss, noisy readings.",
        "age": 71,
        "sex": "male",
        "BMI": 32.2,
        "diabetes_duration_years": 16,
        "HbA1c": 8.3,
        "baseline_glucose": 140.0,
        "medications": ["Metformin 500mg BID", "Sitagliptin 100mg QD", "Lisinopril 20mg QD"],
        "comorbidities": ["Stage 2 CKD", "Peripheral Neuropathy", "Hypertension"],
        "baseline_hr": 74.0,
        "baseline_hrv": 22.0,
        "insulin_sensitivity": 0.022,
        "glucose_clearance": 0.017,
        "carb_sensitivity": 1.85,
        "activity_frequency": 0.25,
        "sleep_quality_mean": 0.55,
        "sensor_noise_std": 6.0,
        "dropout_rate": 0.07,
    }
]

def generate_cohort_profiles(total_patients: int = 100) -> list[dict]:
    """Generate demographic & clinical EHR profiles for cohort."""
    profiles = []
    
    # First 5 are our clinical showcase archetypes
    for p in DEMO_PATIENTS:
        profiles.append(p.copy())
        
    med_options = [
        ["Metformin 500mg BID"],
        ["Metformin 1000mg BID"],
        ["Metformin 850mg BID", "Empagliflozin 10mg QD"],
        ["Metformin 1000mg BID", "Glimepiride 2mg QD"],
        ["Metformin 500mg BID", "Sitagliptin 100mg QD"],
        ["Semaglutide 0.5mg QW", "Metformin 1000mg BID"],
        ["Diet & Lifestyle Monitored"],
    ]
    comorbidity_options = [
        [],
        ["Hypertension"],
        ["Dyslipidemia"],
        ["Hypertension", "Dyslipidemia"],
        ["Sleep Apnea"],
        ["Mild CKD", "Hypertension"],
        ["Coronary Artery Disease"],
    ]

    for i in range(len(DEMO_PATIENTS) + 1, total_patients + 1):
        pid = f"PT-{str(i).zfill(3)}"
        hba1c = round(float(np.clip(np.random.normal(7.4, 0.9), 6.0, 11.5)), 1)
        bmi = round(float(np.clip(np.random.normal(30.2, 4.5), 22.0, 44.0)), 1)
        age = int(np.clip(np.random.normal(59, 9), 35, 84))
        sex = random.choice(["male", "female"])
        duration = int(np.clip(np.random.exponential(6.0), 1, 25))
        
        # Physiological baseline values correlated with HbA1c & BMI
        base_glucose = round(float(85.0 + (hba1c - 5.5) * 18.0 + (bmi - 25.0) * 0.8 + np.random.normal(0, 5)), 1)
        base_hr = round(float(64.0 + (bmi - 25.0) * 0.6 + (hba1c - 6.5) * 1.5 + np.random.normal(0, 3)), 1)
        base_hrv = round(float(np.clip(60.0 - (age - 40) * 0.5 - (hba1c - 6.0) * 3.5 + np.random.normal(0, 4), 15.0, 75.0)), 1)
        
        # Dynamics parameters
        si = np.clip(0.045 - (bmi - 25.0) * 0.0012 - (hba1c - 6.5) * 0.003, 0.012, 0.060)
        sg = np.clip(0.030 - (duration * 0.0006), 0.012, 0.040)
        carb_sens = np.clip(1.1 + (hba1c - 6.0) * 0.2 + (bmi - 25.0) * 0.02, 0.9, 2.4)
        
        profile = {
            "patient_id": pid,
            "name": f"Synthetic Patient {i}",
            "archetype": "Cohort Trajectory",
            "description": f"Type-2 diabetes cohort member with HbA1c {hba1c}%, BMI {bmi}.",
            "age": age,
            "sex": sex,
            "BMI": bmi,
            "diabetes_duration_years": duration,
            "HbA1c": hba1c,
            "baseline_glucose": base_glucose,
            "medications": random.choice(med_options),
            "comorbidities": random.choice(comorbidity_options),
            "baseline_hr": base_hr,
            "baseline_hrv": base_hrv,
            "insulin_sensitivity": float(round(float(si), 4)),
            "glucose_clearance": float(round(float(sg), 4)),
            "carb_sensitivity": float(round(float(carb_sens), 3)),
            "activity_frequency": float(round(float(np.clip(np.random.beta(3, 3), 0.1, 0.9)), 2)),
            "sleep_quality_mean": float(round(float(np.clip(np.random.normal(0.72, 0.15), 0.35, 0.95)), 2)),
            "sensor_noise_std": float(round(float(np.random.uniform(2.0, 4.5)), 1)),
            "dropout_rate": float(round(float(np.random.choice([0.005, 0.01, 0.02, 0.04])), 3)),
        }
        profiles.append(profile)
        
    return profiles

def simulate_physiological_trajectory(profile: dict, days: int = 14, start_time: datetime = None) -> pd.DataFrame:
    """
    Simulates a continuous 5-minute sampling physiological time-series.
    Employs Bergman-type minimal dynamics:
    - Glucose state G(t)
    - Active remote insulin action X(t)
    - Two-compartment gastrointestinal carbohydrate absorption curve
    - Physical exercise accelerated glucose disposal
    - Sleep & Circadian rhythm modulation
    """
    if start_time is None:
        start_time = datetime(2026, 10, 1, 0, 0, 0)
        
    freq_min = 5
    total_steps = int((days * 24 * 60) / freq_min)
    timestamps = [start_time + timedelta(minutes=i * freq_min) for i in range(total_steps)]
    
    G_base = profile["baseline_glucose"]
    HR_base = profile["baseline_hr"]
    HRV_base = profile["baseline_hrv"]
    Si = profile["insulin_sensitivity"]
    Sg = profile["glucose_clearance"]
    carb_sens = profile["carb_sensitivity"]
    noise_std = profile["sensor_noise_std"]
    dropout_prob = profile["dropout_rate"]
    
    # State variables
    G = float(G_base)
    X = 0.0  # Remote insulin compartment
    
    # Schedules for meals and workouts over the simulation duration
    meals = []  # list of (step_idx, grams_carbs)
    workouts = []  # list of (step_idx, duration_steps, intensity)
    
    steps_per_day = int(24 * 60 / freq_min)
    for day in range(days):
        day_offset = day * steps_per_day
        # Breakfast: ~7:30 - 8:30 AM
        b_time = day_offset + int((7.5 + np.random.uniform(-0.5, 0.8)) * 60 / freq_min)
        b_carbs = max(20.0, float(np.random.normal(45.0, 12.0)))
        meals.append((b_time, b_carbs))
        
        # Lunch: ~12:30 - 1:30 PM
        l_time = day_offset + int((12.5 + np.random.uniform(-0.5, 0.8)) * 60 / freq_min)
        l_carbs = max(30.0, float(np.random.normal(65.0, 18.0)))
        meals.append((l_time, l_carbs))
        
        # Dinner: ~18:30 - 20:00 PM
        d_time = day_offset + int((18.8 + np.random.uniform(-0.6, 1.0)) * 60 / freq_min)
        d_carbs = max(35.0, float(np.random.normal(75.0, 22.0)))
        meals.append((d_time, d_carbs))
        
        # Occasional snack (40% probability)
        if np.random.rand() < 0.40:
            s_time = day_offset + int((15.5 + np.random.uniform(-0.5, 0.5)) * 60 / freq_min)
            s_carbs = max(15.0, float(np.random.normal(28.0, 8.0)))
            meals.append((s_time, s_carbs))
            
        # Exercise session based on activity frequency
        if np.random.rand() < profile["activity_frequency"]:
            # Morning walk or evening gym
            w_hour = 17.5 if np.random.rand() < 0.6 else 6.8
            w_time = day_offset + int(w_hour * 60 / freq_min)
            w_dur = int(np.random.choice([15, 30, 45]) / freq_min)
            w_intensity = float(np.random.uniform(0.5, 0.85))
            workouts.append((w_time, w_dur, w_intensity))

    # Pre-allocate output arrays
    glucose_arr = np.zeros(total_steps, dtype=np.float32)
    hr_arr = np.zeros(total_steps, dtype=np.float32)
    hrv_arr = np.zeros(total_steps, dtype=np.float32)
    steps_arr = np.zeros(total_steps, dtype=np.int32)
    intensity_arr = np.zeros(total_steps, dtype=np.float32)
    sleep_arr = np.zeros(total_steps, dtype=np.float32)
    sleep_flag_arr = np.zeros(total_steps, dtype=np.int32)
    meal_carbs_arr = np.zeros(total_steps, dtype=np.float32)

    # Active meal absorption queues
    active_meals = []
    active_workouts = []
    
    for t in range(total_steps):
        dt_hour = (t % steps_per_day) * freq_min / 60.0
        
        # 1. Check for meal ingestion at this step
        for m_t, m_c in meals:
            if m_t == t:
                active_meals.append({"t0": t, "carbs": m_c})
                meal_carbs_arr[t] = round(m_c, 1)
                
        # 2. Check for workout initiation at this step
        for w_t, w_dur, w_int in workouts:
            if w_t == t:
                active_workouts.append({"t0": t, "dur": w_dur, "int": w_int})

        # 3. Compute gut carbohydrate rate of appearance Ra(t)
        Ra = 0.0
        remaining_meals = []
        for m in active_meals:
            elapsed_min = (t - m["t0"]) * freq_min
            if elapsed_min <= 240:  # 4-hour absorption window
                k_abs = 0.032  # 1/min absorption rate
                rate = m["carbs"] * carb_sens * (k_abs**2) * elapsed_min * math.exp(-k_abs * elapsed_min)
                Ra += rate * 4.2  # scale to mg/dL per 5 min
                remaining_meals.append(m)
        active_meals = remaining_meals
        
        # 4. Check exercise state
        is_exercising = False
        current_work_int = 0.0
        remaining_workouts = []
        for w in active_workouts:
            elapsed_steps = t - w["t0"]
            if elapsed_steps < w["dur"]:
                is_exercising = True
                current_work_int = max(current_work_int, w["int"])
                remaining_workouts.append(w)
        active_workouts = remaining_workouts
        
        # 5. Circadian & Sleep modeling
        is_sleeping = (dt_hour >= 23.0 or dt_hour < 6.5)
        sleep_flag_arr[t] = 1 if is_sleeping else 0
        if is_sleeping:
            sleep_q = profile["sleep_quality_mean"] + 0.08 * math.sin(t * 0.05)
            sleep_q = float(np.clip(sleep_q, 0.1, 1.0))
        else:
            sleep_q = 0.0
        sleep_arr[t] = round(sleep_q, 2)
        
        # Dawn phenomenon drift
        dawn_effect = 0.0
        if 4.0 <= dt_hour <= 8.5:
            dawn_effect = 6.0 * math.sin(math.pi * (dt_hour - 4.0) / 4.5)
            
        # 6. Physical activity disposal
        exercise_disposal = 0.0
        if is_exercising:
            exercise_disposal = 0.045 * current_work_int * (G - 70.0)

        # 7. Dynamic differential updates
        dG = -Sg * (G - G_base) - X * (G / 100.0) + Ra - exercise_disposal + (dawn_effect * 0.1)
        p2 = 0.025
        p3 = Si * 0.8
        dX = -p2 * X + p3 * max(0.0, G - G_base)
        
        wiener = float(np.random.normal(0, noise_std * 0.3))
        G = max(55.0, G + dG + wiener)
        X = max(0.0, X + dX)
        
        # 8. Correlated Hemodynamic signals
        if is_exercising:
            target_hr = HR_base + current_work_int * 65.0 + float(np.random.normal(0, 3.0))
            target_hrv = max(10.0, HRV_base * 0.35 + float(np.random.normal(0, 2.0)))
            steps = int(current_work_int * np.random.uniform(350, 600))
            intensity = current_work_int
        elif is_sleeping:
            target_hr = HR_base * 0.88 + float(np.random.normal(0, 1.5))
            target_hrv = HRV_base * 1.25 + float(np.random.normal(0, 2.5))
            steps = 0 if np.random.rand() > 0.05 else int(np.random.randint(5, 25))
            intensity = 0.02
        else:
            stress_elev = max(0.0, (G - G_base) / 30.0) * 3.5
            target_hr = HR_base + stress_elev + float(np.random.normal(0, 2.5))
            target_hrv = max(12.0, HRV_base - stress_elev * 1.2 + float(np.random.normal(0, 3.0)))
            steps = int(np.random.choice([0, 0, 15, 45, 120], p=[0.50, 0.25, 0.15, 0.08, 0.02]))
            intensity = round(steps / 300.0, 2)
            
        glucose_arr[t] = round(G, 1)
        hr_arr[t] = round(target_hr, 1)
        hrv_arr[t] = round(target_hrv, 1)
        steps_arr[t] = steps
        intensity_arr[t] = float(np.clip(intensity, 0.0, 1.0))
        
    df = pd.DataFrame({
        "timestamp": timestamps,
        "glucose": glucose_arr,
        "hr": hr_arr,
        "hrv": hrv_arr,
        "steps": steps_arr,
        "activity_intensity": intensity_arr,
        "sleep_quality": sleep_arr,
        "is_sleeping": sleep_flag_arr,
        "meal_carbs": meal_carbs_arr
    })
    
    # 9. Realistic Sensor Quality / Dropout injection
    if dropout_prob > 0:
        dropout_mask = np.random.rand(len(df)) < dropout_prob
        df["sensor_status"] = "OK"
        df.loc[dropout_mask, "sensor_status"] = "DROPOUT"
    else:
        df["sensor_status"] = "OK"
        
    return df

def generate_entire_cohort(num_patients: int = 100, days: int = 14):
    """Main execution entry point: builds full synthetic directory structure."""
    PATIENTS_DIR.mkdir(parents=True, exist_ok=True)
    profiles = generate_cohort_profiles(num_patients)
    
    cohort_manifest = []
    print(f"[DataGenerator] Generating {len(profiles)} synthetic patient profiles & physiological streams...")
    
    for idx, p in enumerate(profiles):
        pid = p["patient_id"]
        p_dir = PATIENTS_DIR / pid
        p_dir.mkdir(parents=True, exist_ok=True)
        
        # 1. Save static EHR JSON
        with open(p_dir / "static.json", "w", encoding="utf-8") as f:
            json.dump(p, f, indent=2)
            
        # 2. Simulate 5-min physiological time-series
        ts_df = simulate_physiological_trajectory(p, days=days)
        
        # Save Parquet & CSV for maximum interoperability
        ts_df.to_parquet(p_dir / "timeseries.parquet", index=False)
        ts_df.to_csv(p_dir / "timeseries.csv", index=False)
        
        # Summary statistics
        manifest_entry = {
            "patient_id": pid,
            "name": p["name"],
            "archetype": p["archetype"],
            "age": p["age"],
            "sex": p["sex"],
            "BMI": p["BMI"],
            "HbA1c": p["HbA1c"],
            "baseline_glucose": p["baseline_glucose"],
            "observations_count": len(ts_df),
            "start_time": ts_df["timestamp"].iloc[0].isoformat(),
            "end_time": ts_df["timestamp"].iloc[-1].isoformat(),
            "mean_glucose": round(float(ts_df["glucose"].mean()), 1),
            "spike_events_count": int((ts_df["glucose"] >= 180.0).sum()),
        }
        cohort_manifest.append(manifest_entry)
        
        if (idx + 1) % 25 == 0 or idx < 5:
            print(f" -> Completed {pid} ({p['archetype']}) | Avg G: {manifest_entry['mean_glucose']} mg/dL | Spikes: {manifest_entry['spike_events_count']}")

    # Save Cohort Manifest
    with open(DATA_DIR / "cohort_manifest.json", "w", encoding="utf-8") as f:
        json.dump(cohort_manifest, f, indent=2)
        
    print(f"[DataGenerator] Cohort generation complete. Successfully stored {len(cohort_manifest)} patient datasets in {DATA_DIR}.")

if __name__ == "__main__":
    generate_entire_cohort(num_patients=100, days=14)
