# GlucoTwin — Clinical & Sensor Data Dictionary
**Happiest Health Digital Twin Challenge 2026**

---

## 1. Static Electronic Health Record (EHR) Schema

| Field Name | Type | Range / Format | Description | Clinical Significance |
|---|---|---|---|---|
| `patient_id` | String | `PT-001` to `PT-100` | Unique cohort identifier | Patient linkage |
| `name` | String | UTF-8 String | Anonymized synthetic patient name | UI presentation |
| `age` | Integer | 30 to 78 | Chronological age in years | Age-related insulin decline |
| `sex` | String | `male` / `female` | Biological sex | Fat distribution & hormonal profile |
| `BMI` | Float | 21.0 to 42.5 $\text{kg/m}^2$ | Body Mass Index | Peripheral insulin resistance indicator |
| `diabetes_duration_years`| Integer| 1 to 24 | Years since T2D clinical diagnosis | Beta-cell functional exhaustion |
| `HbA1c` | Float | 5.4 to 11.2% | Glycated hemoglobin fraction | 3-month average glycemic control |
| `baseline_glucose` | Float | 85.0 to 165.0 $\text{mg/dL}$ | Learned fasting/resting setpoint | Patient-specific glycemic baseline |
| `baseline_hr` | Float | 58.0 to 86.0 $\text{BPM}$ | Learned resting heart rate | Cardiovascular autonomic baseline |
| `baseline_hrv` | Float | 22.0 to 65.0 $\text{ms}$ | Learned nocturnal RMSSD | Parasympathetic baseline tone |
| `medications` | List[Str]| Categorical | Active anti-hyperglycemic regimen | Pharmacodynamics (Metformin, SGLT2i, GLP-1 RA, etc.) |
| `comorbidities` | List[Str]| Categorical | Diagnosed concurrent conditions | Hypertension, Dyslipidemia, CKD, Neuropathy |
| `risk_category` | String | `Low`, `Moderate`, `High` | Static risk stratification | Baseline epidemiological risk tier |

---

## 2. Dynamic 5-Minute IoT Sensor Observation Schema

| Field Name | Type | Unit | Range | Sampling Rate | Modality Source |
|---|---|---|---|---|---|
| `timestamp` | ISO-8601 | YYYY-MM-DDTHH:MM:SS | Continuous | 5 minutes | System Clock |
| `glucose` | Float | $\text{mg/dL}$ | 40.0 to 450.0 | 5 minutes | Continuous Glucose Monitor (CGM) |
| `hr` | Float | $\text{BPM}$ | 40.0 to 200.0 | 5 minutes | Wearable Optical PPG Sensor |
| `hrv` | Float | $\text{ms}$ | 5.0 to 250.0 | 5 minutes | PPG Root Mean Square Successive Differences |
| `steps` | Integer | steps | 0 to 1,200 | 5-min epoch | 3-Axis Accelerometer |
| `activity_intensity`| Float | index | 0.0 to 1.0 | 5-min epoch | Derived Vector Magnitude Units |
| `sleep_quality` | Float | index | 0.0 to 1.0 | Nocturnal (repeated) | Sleep Architecture & Restlessness |
| `meal_carbs` | Float | grams | 0.0 to 120.0 | Discrete event | Dietary Ingestion Log / Bolus Entry |
| `sensor_status` | String | Enum | `OK`, `WARN`, `ERROR` | Per step | Data Quality / Lead-off Detector |

---

## 3. Derived Digital Twin State Schema

| Field Name | Type | Formula / Origin | Clinical Relevance |
|---|---|---|---|
| `glucose_velocity_15m` | Float | $(G_t - G_{t-15})/15$ | Rate of glucose change ($\text{mg/dL/min}$) |
| `glucose_acceleration_30m`| Float | $(v_t - v_{t-15})/15$ | Acceleration of glycemic surge |
| `glucose_roll_mean_60m` | Float | $\text{Mean}(G_{t-60 \dots t})$ | 1-hour glycemic rolling moving average |
| `glucose_roll_std_60m` | Float | $\text{Std}(G_{t-60 \dots t})$ | Acute glycemic variability metric |
| `glucose_dev_base` | Float | $G_t - G_{baseline}$ | Absolute personal baseline deviation ($\text{mg/dL}$) |
| `glucose_dev_percent` | Float | $(G_t - G_{base})/G_{base} \times 100$ | Relative personal baseline percentage deviation |
| `hr_dev_base` | Float | $\text{HR}_t - \text{HR}_{baseline}$ | Tachycardic autonomic stress response |
| `hrv_dev_base` | Float | $\text{HRV}_t - \text{HRV}_{baseline}$ | Parasympathetic withdrawal indicator |
| `metabolic_stability` | Float | $100 \times [1.0 - (|G - G_b| / 75.0)]$ | Overall homeostasis integrity ($0\text{ to }100\%$) |
| `stress_proxy` | Float | $(\text{HR} - \text{HR}_b)/25 \times (1 - \text{HRV}/100)$ | Sympathetic tone / cortisol surge proxy |

---

## 4. Prediction & Clinical Decision Support Schema

| Field Name | Type | Value Range | Interpretation |
|---|---|---|---|
| `target` | String | Fixed | `Postprandial Glucose Excursion >= 180 mg/dL` |
| `horizon` | String | Fixed | `60–120 minutes ahead` |
| `risk_score` | Float | 0.0000 to 1.0000 | Calibrated Platt probability of crossing $180\text{ mg/dL}$ |
| `risk_category` | String | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` | Risk stratification category |
| `eta_minutes` | Float / Null| 60.0 to 120.0 | Estimated time to breach threshold in minutes |
| `is_spike_predicted` | Boolean| `true` / `false` | Threshold indicator ($\text{risk} \ge 0.50$) |
| `top_features` | List[Dict] | Array of feature weights | Explainable AI risk factor attribution ranking |
