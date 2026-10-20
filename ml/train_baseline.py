import os
import json
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
import xgboost as xgb
import joblib

# ---------------------------------------------------------------------------
# Helper to load a single patient’s static profile and time‑series data
# ---------------------------------------------------------------------------

def load_patient(patient_dir: Path):
    static_path = patient_dir / "static.json"
    ts_path = patient_dir / "timeseries.parquet"
    if not static_path.is_file() or not ts_path.is_file():
        return None, None
    with open(static_path, "r", encoding="utf-8") as f:
        static = json.load(f)
    ts = pd.read_parquet(ts_path)
    return static, ts

# ---------------------------------------------------------------------------
# Feature engineering + label creation
# ---------------------------------------------------------------------------

def build_dataset(data_root: Path, glucose_threshold: float = 180.0):
    rows = []
    patient_dirs = list((data_root / "patients").iterdir())
    for pdir in patient_dirs:
        if not pdir.is_dir():
            continue
        static, ts = load_patient(pdir)
        if static is None:
            continue
        # Ensure timestamp column is datetime
        ts = ts.copy()
        ts["timestamp"] = pd.to_datetime(ts["timestamp"])
        ts = ts.sort_values("timestamp")
        # Compute label for each row: look ahead 60‑120 min, if any glucose >= threshold → 1
        timestamps = ts["timestamp"].values
        glucose_vals = ts["glucose"].values
        # Use a rolling window approach for efficiency
        # For each index i, find indices where 60min <= dt <= 120min
        for i, cur_time in enumerate(timestamps):
            start = cur_time + np.timedelta64(60, "m")
            end = cur_time + np.timedelta64(120, "m")
            mask = (timestamps >= start) & (timestamps <= end)
            future_glucose = glucose_vals[mask]
            label = int(np.nanmax(future_glucose) >= glucose_threshold) if mask.any() else 0
            # Build feature vector – static + latest dynamic values up to i
            row = {
                "patient_id": pdir.name,
                "age": static.get("age"),
                "sex": 1 if static.get("sex") == "male" else 0,
                "BMI": static.get("BMI"),
                "diabetes_duration_years": static.get("diabetes_duration_years"),
                "HbA1c": static.get("HbA1c"),
                "baseline_glucose": static.get("baseline_glucose"),
                "baseline_hr": static.get("baseline_hr"),
                "baseline_hrv": static.get("baseline_hrv"),
                "glucose": glucose_vals[i],
                "hr": ts.at[i, "hr"],
                "hrv": ts.at[i, "hrv"],
                "steps": ts.at[i, "steps"],
                "activity_intensity": ts.at[i, "activity_intensity"],
                "sleep_quality": ts.at[i, "sleep_quality"],
                "label": label,
                "timestamp": cur_time,
            }
            rows.append(row)
    df = pd.DataFrame(rows)
    # Drop rows with any missing sensor values (simplify for baseline model)
    df = df.dropna(subset=["glucose", "hr", "hrv", "steps", "activity_intensity", "sleep_quality"])
    return df

# ---------------------------------------------------------------------------
# Train / evaluation
# ---------------------------------------------------------------------------

def train_save_model(data_root: Path, model_path: Path, test_size: float = 0.2, random_state: int = 42):
    print("Building dataset …")
    df = build_dataset(data_root)
    feature_cols = [c for c in df.columns if c not in ["patient_id", "label", "timestamp"]]
    X = df[feature_cols]
    y = df["label"]
    # Patient‑level split – ensure no patient appears in both train and test
    patient_ids = df["patient_id"].unique()
    train_ids, test_ids = train_test_split(patient_ids, test_size=test_size, random_state=random_state)
    train_mask = df["patient_id"].isin(train_ids)
    X_train, y_train = X[train_mask], y[train_mask]
    X_test, y_test = X[~train_mask], y[~train_mask]
    print(f"Training on {X_train.shape[0]} rows, testing on {X_test.shape[0]} rows")
    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="binary:logistic",
        eval_metric="auc",
        use_label_encoder=False,
        n_jobs=4,
    )
    model.fit(X_train, y_train)
    # Save model and feature list
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "features": feature_cols}, model_path)
    print(f"Model saved to {model_path}")
    # Quick evaluation
    from sklearn.metrics import roc_auc_score, precision_recall_fscore_support
    prob = model.predict_proba(X_test)[:, 1]
    preds = (prob >= 0.5).astype(int)
    auc = roc_auc_score(y_test, prob)
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, preds, average="binary")
    print(f"Test ROC‑AUC: {auc:.3f}, Precision: {precision:.3f}, Recall: {recall:.3f}, F1: {f1:.3f}")

if __name__ == "__main__":
    DATA_ROOT = Path(__file__).resolve().parents[2] / "data"
    MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "baseline.pkl"
    train_save_model(DATA_ROOT, MODEL_PATH)
