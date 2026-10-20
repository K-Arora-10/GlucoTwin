"""
GlucoTwin — Machine Learning Training, Evaluation & Ablation Engine
Happiest Health Digital Twin Challenge 2026

Trains and evaluates scientifically defensible classifiers for predicting
future glucose threshold excursions [t+60m, t+120m].

Implements:
1. Patient-level split (guarantees zero patient leakage).
2. Four-way multimodal ablation study:
   - EHR Only
   - Sensor Only
   - Multimodal Fused (EHR + Sensor)
   - Full Digital Twin (EHR + Sensor + Personalized Baseline Deviations & Dynamics)
3. Rigorous metric suite: ROC-AUC, PR-AUC, Precision, Recall, F1, Sensitivity,
   Specificity, Calibration (Brier Score), FPR, FNR, Lead-Time Distribution.
4. Feature importance extraction for explainability.
5. Production artifact serialization via Joblib.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    brier_score_loss,
)

from ml.feature_engineering import build_cohort_dataset, DATA_DIR

MODELS_DIR = Path(__file__).resolve().parents[1] / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Feature subsets for ablation study
EHR_FEATURES = [
    "age",
    "sex",
    "bmi",
    "diabetes_duration_years",
    "hba1c",
    "base_glucose",
    "base_hr",
    "base_hrv",
    "medication_count",
    "comorbidity_count",
]

SENSOR_FEATURES = [
    "glucose",
    "hr",
    "hrv",
    "steps_sum_30m",
    "activity_intensity",
    "sleep_quality",
    "recent_carbs_60m",
    "tod_sin",
    "tod_cos",
]

FUSED_FEATURES = EHR_FEATURES + SENSOR_FEATURES

FULL_TWIN_FEATURES = FUSED_FEATURES + [
    "glucose_velocity_15m",
    "glucose_acc_30m",
    "glucose_roll_mean_60m",
    "glucose_roll_std_60m",
    "hr_roll_mean_30m",
    "hrv_roll_mean_30m",
    "glucose_dev_base",
    "hr_dev_base",
    "hrv_dev_base",
    "metabolic_stability",
]

def evaluate_model_performance(y_true, y_prob, threshold=0.5, minutes_to_spike=None):
    """Computes comprehensive clinical prediction metrics."""
    y_pred = (y_prob >= threshold).astype(int)
    
    auc_roc = float(roc_auc_score(y_true, y_prob)) if len(np.unique(y_true)) > 1 else 0.0
    auc_pr = float(average_precision_score(y_true, y_prob)) if len(np.unique(y_true)) > 1 else 0.0
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    brier = float(brier_score_loss(y_true, y_prob))
    
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = [int(v) for v in cm.ravel()]
    
    sensitivity = rec
    specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0
    
    # Calculate early warning lead time for True Positives
    lead_time_median = 0.0
    lead_time_mean = 0.0
    if minutes_to_spike is not None:
        tp_mask = (y_true == 1) & (y_pred == 1)
        valid_lead_times = minutes_to_spike[tp_mask]
        valid_lead_times = valid_lead_times[~np.isnan(valid_lead_times)]
        if len(valid_lead_times) > 0:
            lead_time_median = float(np.median(valid_lead_times))
            lead_time_mean = float(np.mean(valid_lead_times))

    return {
        "roc_auc": round(auc_roc, 4),
        "pr_auc": round(auc_pr, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "sensitivity": round(sensitivity, 4),
        "specificity": round(specificity, 4),
        "brier_score": round(brier, 4),
        "false_positive_rate": round(fpr, 4),
        "false_negative_rate": round(fnr, 4),
        "early_warning_time_median_min": round(lead_time_median, 1),
        "early_warning_time_mean_min": round(lead_time_mean, 1),
        "confusion_matrix": {
            "true_negatives": tn,
            "false_positives": fp,
            "false_negatives": fn,
            "true_positives": tp,
        }
    }

def train_and_evaluate_all():
    print("[MLPipeline] Loading / computing feature matrix...")
    feature_matrix_path = DATA_DIR / "master_feature_matrix.parquet"
    if feature_matrix_path.exists():
        df = pd.read_parquet(feature_matrix_path)
    else:
        df = build_cohort_dataset()
        df.to_parquet(feature_matrix_path, index=False)
        
    print(f"Dataset shape: {df.shape}")
    
    # Patient-level split: 75 patients train, 25 patients test
    unique_patients = list(df["patient_id"].unique())
    train_pids, test_pids = train_test_split(unique_patients, test_size=0.25, random_state=42)
    
    train_mask = df["patient_id"].isin(train_pids).to_numpy()
    test_mask = df["patient_id"].isin(test_pids).to_numpy()
    
    print(f"Patient separation: {len(train_pids)} train patients ({train_mask.sum()} samples) | {len(test_pids)} test patients ({test_mask.sum()} samples)")
    assert set(train_pids).isdisjoint(set(test_pids)), "FATAL: Patient leakage detected!"
    
    y_train = df.loc[train_mask, "target_spike_60_120m"].to_numpy().astype(int)
    y_test = df.loc[test_mask, "target_spike_60_120m"].to_numpy().astype(int)
    test_lead_times = df.loc[test_mask, "minutes_to_spike"].to_numpy()
    
    print(f"Train spike prevalence: {y_train.mean()*100:.2f}% | Test spike prevalence: {y_test.mean()*100:.2f}%")
    
    ablation_results = {}
    
    # -------------------------------------------------------------
    # 1. Ablation A: EHR Only
    # -------------------------------------------------------------
    print("\n--- Training Ablation A: EHR Only Baseline ---")
    X_train_ehr = df.loc[train_mask, EHR_FEATURES].to_numpy().astype(np.float32)
    X_test_ehr = df.loc[test_mask, EHR_FEATURES].to_numpy().astype(np.float32)
    
    scaler_ehr = StandardScaler().fit(X_train_ehr)
    model_ehr = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)
    model_ehr.fit(scaler_ehr.transform(X_train_ehr), y_train)
    probs_ehr = model_ehr.predict_proba(scaler_ehr.transform(X_test_ehr))[:, 1]
    
    metrics_ehr = evaluate_model_performance(y_test, probs_ehr, threshold=0.5, minutes_to_spike=test_lead_times)
    ablation_results["A_EHR_Only"] = {
        "model_name": "Logistic Regression (EHR Only)",
        "features_count": len(EHR_FEATURES),
        **metrics_ehr
    }
    print(f"EHR Only -> ROC-AUC: {metrics_ehr['roc_auc']} | PR-AUC: {metrics_ehr['pr_auc']} | F1: {metrics_ehr['f1']}")

    # -------------------------------------------------------------
    # 2. Ablation B: Sensor Only
    # -------------------------------------------------------------
    print("\n--- Training Ablation B: Sensor Only ---")
    X_train_sensor = df.loc[train_mask, SENSOR_FEATURES].to_numpy().astype(np.float32)
    X_test_sensor = df.loc[test_mask, SENSOR_FEATURES].to_numpy().astype(np.float32)
    
    model_sensor = HistGradientBoostingClassifier(max_iter=100, class_weight="balanced", random_state=42)
    model_sensor.fit(X_train_sensor, y_train)
    probs_sensor = model_sensor.predict_proba(X_test_sensor)[:, 1]
    
    metrics_sensor = evaluate_model_performance(y_test, probs_sensor, threshold=0.5, minutes_to_spike=test_lead_times)
    ablation_results["B_Sensor_Only"] = {
        "model_name": "HistGradientBoosting (Sensors Only)",
        "features_count": len(SENSOR_FEATURES),
        **metrics_sensor
    }
    print(f"Sensor Only -> ROC-AUC: {metrics_sensor['roc_auc']} | PR-AUC: {metrics_sensor['pr_auc']} | F1: {metrics_sensor['f1']}")

    # -------------------------------------------------------------
    # 3. Ablation C: Multimodal Fused (EHR + Sensor)
    # -------------------------------------------------------------
    print("\n--- Training Ablation C: Multimodal Fused (EHR + Sensors) ---")
    X_train_fused = df.loc[train_mask, FUSED_FEATURES].to_numpy().astype(np.float32)
    X_test_fused = df.loc[test_mask, FUSED_FEATURES].to_numpy().astype(np.float32)
    
    model_fused = HistGradientBoostingClassifier(max_iter=100, class_weight="balanced", random_state=42)
    model_fused.fit(X_train_fused, y_train)
    probs_fused = model_fused.predict_proba(X_test_fused)[:, 1]
    
    metrics_fused = evaluate_model_performance(y_test, probs_fused, threshold=0.5, minutes_to_spike=test_lead_times)
    ablation_results["C_Multimodal_Fused"] = {
        "model_name": "HistGradientBoosting (EHR + Sensors)",
        "features_count": len(FUSED_FEATURES),
        **metrics_fused
    }
    print(f"Multimodal Fused -> ROC-AUC: {metrics_fused['roc_auc']} | PR-AUC: {metrics_fused['pr_auc']} | F1: {metrics_fused['f1']}")

    # -------------------------------------------------------------
    # 4. Ablation D: Full Digital Twin (EHR + Sensor + Personalized Baseline + Dynamics)
    # -------------------------------------------------------------
    print("\n--- Training Model D: Full Digital Twin System ---")
    X_train_twin = df.loc[train_mask, FULL_TWIN_FEATURES].to_numpy().astype(np.float32)
    X_test_twin = df.loc[test_mask, FULL_TWIN_FEATURES].to_numpy().astype(np.float32)
    
    model_twin = HistGradientBoostingClassifier(
        max_iter=150,
        learning_rate=0.08,
        max_leaf_nodes=31,
        min_samples_leaf=20,
        class_weight="balanced",
        random_state=42,
    )
    model_twin.fit(X_train_twin, y_train)
    probs_twin = model_twin.predict_proba(X_test_twin)[:, 1]
    
    metrics_twin = evaluate_model_performance(y_test, probs_twin, threshold=0.5, minutes_to_spike=test_lead_times)
    ablation_results["D_Full_Digital_Twin"] = {
        "model_name": "GlucoTwin State Engine (Full Multimodal + Personalized Baseline Deviations)",
        "features_count": len(FULL_TWIN_FEATURES),
        **metrics_twin
    }
    print(f"Full Digital Twin -> ROC-AUC: {metrics_twin['roc_auc']} | PR-AUC: {metrics_twin['pr_auc']} | F1: {metrics_twin['f1']} | Lead-time Median: {metrics_twin['early_warning_time_median_min']} min")

    # -------------------------------------------------------------
    # Feature Importance for Explainability
    # -------------------------------------------------------------
    print("\n[MLPipeline] Computing feature importance on holdout test set sample...")
    from sklearn.inspection import permutation_importance
    # Sample 4000 test cases for fast, reliable permutation importance
    np.random.seed(42)
    sample_indices = np.random.choice(len(X_test_twin), size=min(4000, len(X_test_twin)), replace=False)
    X_test_sub = X_test_twin[sample_indices]
    y_test_sub = y_test[sample_indices]
    
    perm_importance = permutation_importance(model_twin, X_test_sub, y_test_sub, n_repeats=3, random_state=42)
    
    feature_importances = []
    for idx, f_name in enumerate(FULL_TWIN_FEATURES):
        feature_importances.append({
            "feature": f_name,
            "importance": round(float(perm_importance.importances_mean[idx]), 5),
            "std": round(float(perm_importance.importances_std[idx]), 5),
            "category": "Personalized Twin" if ("dev" in f_name or "stability" in f_name or "velocity" in f_name or "acc" in f_name) else ("EHR" if f_name in EHR_FEATURES else "Sensor")
        })
    feature_importances.sort(key=lambda x: x["importance"], reverse=True)

    # -------------------------------------------------------------
    # Serialize Model Artifacts
    # -------------------------------------------------------------
    artifact_payload = {
        "model": model_twin,
        "features": FULL_TWIN_FEATURES,
        "model_version": "v2.6-production",
        "spike_threshold_mgdl": 180.0,
        "prediction_horizon_minutes": [60, 120],
        "training_patients_count": len(train_pids),
        "test_patients_count": len(test_pids),
        "test_metrics": metrics_twin,
    }
    
    model_artifact_path = MODELS_DIR / "gluco_twin_model.joblib"
    joblib.dump(artifact_payload, model_artifact_path)
    print(f"\n[MLPipeline] Saved trained artifact to {model_artifact_path}")
    
    with open(MODELS_DIR / "model_metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics_twin, f, indent=2)
        
    with open(MODELS_DIR / "ablation_study.json", "w", encoding="utf-8") as f:
        json.dump(ablation_results, f, indent=2)
        
    with open(MODELS_DIR / "feature_importance.json", "w", encoding="utf-8") as f:
        json.dump(feature_importances, f, indent=2)
        
    with open(MODELS_DIR / "confusion_matrix.json", "w", encoding="utf-8") as f:
        json.dump(metrics_twin["confusion_matrix"], f, indent=2)
        
    print("[MLPipeline] All model artifacts & evaluation JSONs successfully saved to models/ directory.")

if __name__ == "__main__":
    train_and_evaluate_all()
