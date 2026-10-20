# GlucoTwin — Machine Learning Model Card
**According to Mitchell et al. (2019) Guidelines**
**Happiest Health Digital Twin Challenge 2026**

---

## 1. Model Details
- **Model Name:** GlucoTwin Multimodal Gradient Boosting System
- **Version:** `v2.6-production`
- **Release Date:** October 2026
- **Model Type:** Histogram-Based Gradient Boosting Classifier (`HistGradientBoostingClassifier`)
- **Framework:** Scikit-Learn 1.8.0 / Python 3.13.2
- **Hyperparameters:**
  - `max_iter`: 150
  - `learning_rate`: 0.08
  - `max_depth`: 6
  - `min_samples_leaf`: 20
  - `l2_regularization`: 1.5
  - `class_weight`: `'balanced'` (addressed severe class imbalance)
- **Serialization:** `models/gluco_twin_model.joblib` (Includes trained model, 29 feature definitions, baseline normalizers, calibration records)

---

## 2. Intended Use & Clinical Scope
- **Intended Purpose:** Preemptively identify upcoming postprandial glucose excursions ($\ge 180\text{ mg/dL}$) in adult patients with Type 2 Diabetes within a 60–120 minute window.
- **Intended Users:** Endocrinologists, diabetologists, certified diabetes educators, primary care physicians, and patients utilizing digital twin lifestyle guidance.
- **Out-of-Scope Uses:**
  - Not for autonomous insulin bolus dosing (closed-loop artificial pancreas controller).
  - Not tested on pediatric populations or pregnant patients with gestational diabetes.
  - Not intended to replace standard emergent hypoglycemia alarms ($< 70\text{ mg/dL}$).

---

## 3. Training & Evaluation Data
- **Cohort Size:** 100 simulated patients, 14 days of 5-minute telemetry per patient ($399,600$ total steps).
- **Partitioning Method:** Strictly disjoint **Patient-Level Split** (75 train patients / 25 test patients).
  - Train dataset: 299,700 temporal observations.
  - Test dataset: 99,900 temporal observations (1,294 spike events).
- **Leakage Controls:**
  - All rolling features are strictly causal ($t \le t_0$).
  - Zero patient overlap across splits.
  - Normalization parameters fit exclusively on training cohort.

---

## 4. Evaluation Metrics & Benchmark Results

### 4.1. 4-Way Architecture Ablation Study (Disjoint Test Set)

| Architecture | Input Features | ROC-AUC | PR-AUC | F1-Score | Lead Time |
|---|---|---|---|---|---|
| **Model A: EHR Only** | Static demographic, clinical, medication profile | 0.9505 | 0.1740 | 0.1408 | N/A (Static) |
| **Model B: Sensor Only** | Dynamic CGM, PPG HR, HRV, Steps, Carbs | 0.9604 | 0.2698 | 0.2492 | 70.0 min |
| **Model C: Multimodal Fused** | Raw concatenation of Static EHR + Dynamic Sensor | 0.9861 | 0.4852 | 0.5008 | 70.0 min |
| **Model D: Full Digital Twin** | Multimodal + Personal Baselines + Velocity + Circadian | **0.9881** | **0.5374** | **0.5378** | **70.0 min** |

### 4.2. Confusion Matrix on 99,900 Holdout Test Steps
- **True Negatives:** 97,306 (98.68% specificity)
- **False Positives:** 1,300 (1.32% false alarm rate)
- **False Negatives:** 340 (missed excursions, FNR: 26.28%)
- **True Positives:** 954 (detected excursions, Sensitivity / Recall: 73.72%)
- **Precision:** 42.32%
- **Brier Score:** 0.0120
- **Median Warning Lead Time:** **70.0 minutes** (Mean: 77.5 minutes)

---

## 5. Explainability & Feature Importance
Global permutation feature importance on holdout test set:
1. `recent_carbs_60m` (28.5%): Acute exogenous carbohydrate influx into the Bateman gut absorption compartment.
2. `glucose_velocity_15m` (19.8%): 15-minute rate of glucose elevation ($\text{mg/dL/min}$).
3. `glucose_dev_base` (14.2%): Current glucose distance from patient's individual resting baseline.
4. `hba1c` (8.9%): Chronic glycemic load and general insulin sensitivity setpoint.
5. `glucose_roll_mean_60m` (7.6%): 1-hour rolling glycemic average.
6. `hr_dev_base` (6.1%): Autonomic sympathetic arousal / acute metabolic stress response.
7. `steps_sum_30m` (5.4%): Skeletal muscle ambulation activating non-insulin-mediated GLUT4 clearance.
8. `tod_sin` / `tod_cos` (4.8%): Circadian diurnal variation (dawn phenomenon).

---

## 6. Limitations & Risk Mitigation
- **Synthetic Data Baseline:** While physiologically grounded in the Bergman minimal model, clinical translation requires validation on prospective clinical cohorts (e.g., OhioT1DM or multi-center T2D registry).
- **Sensor Latency:** Wearable CGM interstitial fluid lag ($\approx 5\text{–}10\text{ min}$) is mitigated by including the 15-minute glucose velocity derivative.
- **Intervention Safety:** Counterfactual recommendations are non-invasive (e.g. 15-minute walk, portion control) to prevent inadvertent hypoglycemia.
