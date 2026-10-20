"""
GlucoTwin — Leakage-Free Temporal Feature Engineering Pipeline
Happiest Health Digital Twin Challenge 2026

Transforms multimodal static EHR profiles and dynamic 5-minute physiological
sensor streams into temporal observation vectors without lookahead leakage.
Computes personalized baseline deviations, rolling velocities, accelerations,
variability metrics, and future horizon ground-truth labels.
"""

import json
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import timedelta

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
PATIENTS_DIR = DATA_DIR / "patients"

def compute_patient_features(static_profile: dict, ts_df: pd.DataFrame, spike_threshold: float = 180.0) -> pd.DataFrame:
    """
    Extracts strictly causal temporal features and target labels for a single patient.
    
    Target:
    - spike_in_60_120m: Binary flag indicating if MAX(glucose) in [t+60m, t+120m] >= spike_threshold.
    - minutes_to_spike: Minutes from t until first threshold crossing within horizon (or None if no spike).
    """
    df = ts_df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)
    
    # Static EHR Features
    age = static_profile["age"]
    sex_num = 1 if static_profile.get("sex") == "male" else 0
    bmi = static_profile["BMI"]
    duration = static_profile["diabetes_duration_years"]
    hba1c = static_profile["HbA1c"]
    base_glucose = static_profile["baseline_glucose"]
    base_hr = static_profile["baseline_hr"]
    base_hrv = static_profile["baseline_hrv"]
    med_count = len(static_profile.get("medications", []))
    comorb_count = len(static_profile.get("comorbidities", []))
    
    # 5-minute sampling: 12 steps = 1 hour, 3 steps = 15 mins, 6 steps = 30 mins
    # Step 1: Rolling physiological trends (causal, past-only)
    glucose = df["glucose"].values
    hr = df["hr"].values
    hrv = df["hrv"].values
    steps = df["steps"].values
    intensity = df["activity_intensity"].values
    sleep_q = df["sleep_quality"].values
    meal_carbs = df["meal_carbs"].values
    
    n = len(df)
    
    # Allocate arrays
    glucose_vel_15m = np.zeros(n, dtype=np.float32)
    glucose_acc_30m = np.zeros(n, dtype=np.float32)
    glucose_roll_mean_60m = np.zeros(n, dtype=np.float32)
    glucose_roll_std_60m = np.zeros(n, dtype=np.float32)
    hr_roll_mean_30m = np.zeros(n, dtype=np.float32)
    hrv_roll_mean_30m = np.zeros(n, dtype=np.float32)
    steps_sum_30m = np.zeros(n, dtype=np.float32)
    recent_carbs_60m = np.zeros(n, dtype=np.float32)
    
    # Digital Twin Personalized Baseline Deviations
    glucose_dev_base = np.zeros(n, dtype=np.float32)
    hr_dev_base = np.zeros(n, dtype=np.float32)
    hrv_dev_base = np.zeros(n, dtype=np.float32)
    metabolic_stability = np.zeros(n, dtype=np.float32)
    
    # Circadian temporal features
    tod_sin = np.zeros(n, dtype=np.float32)
    tod_cos = np.zeros(n, dtype=np.float32)
    
    # Targets
    target_spike = np.zeros(n, dtype=np.int32)
    minutes_to_spike = np.full(n, np.nan, dtype=np.float32)
    
    # Window indices
    steps_15m = 3
    steps_30m = 6
    steps_60m = 12
    steps_120m = 24
    
    for i in range(n):
        cur_t = df.at[i, "timestamp"]
        hour_frac = cur_t.hour + cur_t.minute / 60.0
        tod_sin[i] = np.sin(2.0 * np.pi * hour_frac / 24.0)
        tod_cos[i] = np.cos(2.0 * np.pi * hour_frac / 24.0)
        
        # Velocity over last 15 min: (G[i] - G[i-3]) / 15
        i_prev15 = max(0, i - steps_15m)
        glucose_vel_15m[i] = (glucose[i] - glucose[i_prev15]) / max(1.0, (i - i_prev15) * 5.0)
        
        # Acceleration over last 30 min: difference of two 15-min velocities
        i_prev30 = max(0, i - steps_30m)
        prev_vel = (glucose[i_prev15] - glucose[i_prev30]) / max(1.0, (i_prev15 - i_prev30) * 5.0)
        glucose_acc_30m[i] = (glucose_vel_15m[i] - prev_vel) / 15.0
        
        # Rolling 60m glucose stats
        i_start60 = max(0, i - steps_60m)
        g_window = glucose[i_start60 : i + 1]
        glucose_roll_mean_60m[i] = float(np.mean(g_window))
        glucose_roll_std_60m[i] = float(np.std(g_window)) if len(g_window) > 1 else 0.0
        
        # Rolling 30m HR & HRV stats
        i_start30 = max(0, i - steps_30m)
        hr_roll_mean_30m[i] = float(np.mean(hr[i_start30 : i + 1]))
        hrv_roll_mean_30m[i] = float(np.mean(hrv[i_start30 : i + 1]))
        steps_sum_30m[i] = float(np.sum(steps[i_start30 : i + 1]))
        recent_carbs_60m[i] = float(np.sum(meal_carbs[i_start60 : i + 1]))
        
        # Personalized Baseline Deviations
        glucose_dev_base[i] = glucose[i] - base_glucose
        hr_dev_base[i] = hr[i] - base_hr
        hrv_dev_base[i] = hrv[i] - base_hrv
        metabolic_stability[i] = float(np.clip(1.0 - (abs(glucose[i] - base_glucose) / 75.0), 0.0, 1.0))
        
        # Future Target Ground Truth: [i + 12 (60 min), i + 24 (120 min)]
        target_start = i + steps_60m
        target_end = min(n, i + steps_120m + 1)
        
        if target_start < n:
            future_window = glucose[target_start:target_end]
            max_future_g = np.max(future_window)
            if max_future_g >= spike_threshold:
                target_spike[i] = 1
                # Find exact first time step crossing threshold
                spike_indices = np.where(future_window >= spike_threshold)[0]
                first_spike_idx = target_start + spike_indices[0]
                minutes_to_spike[i] = (first_spike_idx - i) * 5.0
            else:
                target_spike[i] = 0
        else:
            # End of time series boundary
            target_spike[i] = 0
            
    # Build complete patient tabular DataFrame
    res_df = pd.DataFrame({
        "patient_id": static_profile["patient_id"],
        "timestamp": df["timestamp"],
        # Static EHR
        "age": age,
        "sex": sex_num,
        "bmi": bmi,
        "diabetes_duration_years": duration,
        "hba1c": hba1c,
        "base_glucose": base_glucose,
        "base_hr": base_hr,
        "base_hrv": base_hrv,
        "medication_count": med_count,
        "comorbidity_count": comorb_count,
        # Dynamic Sensor state
        "glucose": glucose,
        "glucose_velocity_15m": glucose_vel_15m,
        "glucose_acc_30m": glucose_acc_30m,
        "glucose_roll_mean_60m": glucose_roll_mean_60m,
        "glucose_roll_std_60m": glucose_roll_std_60m,
        "hr": hr,
        "hr_roll_mean_30m": hr_roll_mean_30m,
        "hrv": hrv,
        "hrv_roll_mean_30m": hrv_roll_mean_30m,
        "steps_sum_30m": steps_sum_30m,
        "activity_intensity": intensity,
        "sleep_quality": sleep_q,
        "recent_carbs_60m": recent_carbs_60m,
        "tod_sin": tod_sin,
        "tod_cos": tod_cos,
        # Personalized Twin Deviations
        "glucose_dev_base": glucose_dev_base,
        "hr_dev_base": hr_dev_base,
        "hrv_dev_base": hrv_dev_base,
        "metabolic_stability": metabolic_stability,
        # Targets
        "target_spike_60_120m": target_spike,
        "minutes_to_spike": minutes_to_spike,
    })
    
    # Exclude the very beginning (burn-in for 60m rolling features) and the end boundary
    burn_in = steps_60m
    cutoff = n - steps_120m
    return res_df.iloc[burn_in:cutoff].reset_index(drop=True)

def build_cohort_dataset(spike_threshold: float = 180.0) -> pd.DataFrame:
    """Iterates through all patients and aggregates the master ML feature matrix."""
    with open(DATA_DIR / "cohort_manifest.json", "r", encoding="utf-8") as f:
        manifest = json.load(f)
        
    all_patient_dfs = []
    print(f"[FeatureEngineering] Building cohort dataset for {len(manifest)} patients...")
    for idx, item in enumerate(manifest):
        pid = item["patient_id"]
        p_dir = PATIENTS_DIR / pid
        with open(p_dir / "static.json", "r", encoding="utf-8") as f:
            static_data = json.load(f)
        ts_df = pd.read_parquet(p_dir / "timeseries.parquet")
        
        pdf = compute_patient_features(static_data, ts_df, spike_threshold=spike_threshold)
        all_patient_dfs.append(pdf)
        
    master_df = pd.concat(all_patient_dfs, ignore_index=True)
    print(f"[FeatureEngineering] Master ML matrix compiled: {master_df.shape[0]} rows, {master_df.shape[1]} columns.")
    print(f" -> Positive target rate: {master_df['target_spike_60_120m'].mean()*100:.2f}% ({master_df['target_spike_60_120m'].sum()} events)")
    return master_df

if __name__ == "__main__":
    df = build_cohort_dataset()
    out_file = DATA_DIR / "master_feature_matrix.parquet"
    df.to_parquet(out_file, index=False)
    print(f"Saved to {out_file}")
