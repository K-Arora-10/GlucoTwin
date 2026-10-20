# GlucoTwin — Presentation Slide Deck (22 Slides)
**Happiest Health Digital Twin Challenge 2026**
**Summit Showcase: 20 November 2026**

---

### Slide 1: Title & Vision
# GlucoTwin — Personalized Metabolic Digital Twin
## "Anticipate metabolic risk. Understand the patient. Explore safer possibilities."
- **Event:** Happiest Health Digital Twin Challenge 2026
- **Track:** Digital Twin Proof-of-Concept for Healthcare
- **Team:** GlucoTwin Systems
- *Speaker Notes:* Welcome judges. Today we present GlucoTwin, an evolving multimodal digital twin for Type 2 Diabetes that predicts postprandial glucose spikes 70 minutes ahead and enables counterfactual intervention simulation.

---

### Slide 2: The Healthcare Problem
# The Reactive CGM Dilemma in Type 2 Diabetes
- 537 million adults live with diabetes globally.
- Acute postprandial glycemic excursions ($\ge 180\text{ mg/dL}$) drive oxidative stress, endothelial damage, and microvascular complications.
- Commercial Continuous Glucose Monitors (CGMs) are **purely reactive**: they alarm only after $180\text{ mg/dL}$ is breached.
- By then, glucotoxic damage has occurred and intervention is too late.
- *Speaker Notes:* CGMs tell patients where they are right now, not where they will be in an hour. We must bridge the gap between reactive alarms and preemptive care.

---

### Slide 3: The GlucoTwin Paradigm
# From Reactive Alarms to Proactive Metabolic Twins
```
TRADITIONAL CGM APP:
Sensors -> Raw Current Value (182 mg/dL) -> Late Reactive Alert (Spike Underway)

GLUCOTWIN DIGITAL TWIN:
Static EHR + Dynamic 5-Min Telemetry -> Virtual State Engine -> Personalized Baseline Deviations ->
60-120m Preemptive Prediction (70m Lead Time) -> Counterfactual "What-If" Simulation -> Averted Spike!
```
- *Speaker Notes:* A digital twin is not a dashboard attached to a static model. It is an evolving virtual state engine that runs counterfactual branches.

---

### Slide 4: System Architecture
# End-to-End Multimodal Twinning Pipeline
- **Layer 1: Multimodal Ingestion** — Static EHR (Synthea/clinical) + Dynamic 5-min IoT telemetry (CGM, PPG, steps, meals).
- **Layer 2: Twin State Engine** — Mechanistic differential equations + past-only causal rolling queues.
- **Layer 3: Predictive ML Engine** — Calibrated HistGradientBoosting model (29 features) + XAI risk attributions.
- **Layer 4: Decision Support & What-If** — Interactive React dashboard with real-time counterfactual simulation.
- *Speaker Notes:* The architecture enforces complete modularity and runs 100% locally on standard hardware.

---

### Slide 5: Mathematical Foundations
# Physiologically Calibrated Homeostasis Models
- **Bergman Minimal Model (1979):**
  $$\frac{dG(t)}{dt} = -(p_1 + X(t))G(t) + p_1 G_b + \frac{R_a(t)}{V_G}$$
- **Bateman 2-Compartment Gut Absorption:**
  $$R_a(t) = D_{meal} \cdot \frac{k_{emptying} \cdot k_{abs}}{k_{abs} - k_{emptying}} \left[ e^{-k_{emptying} t} - e^{-k_{abs} t} \right]$$
- **Circadian & Autonomic Modulation:** Diurnal cortisol pulses and sympathetic stress proxies.
- *Speaker Notes:* Our simulation engine is rooted in classic mathematical endocrinology, providing physiological fidelity.

---

### Slide 6: The Key Differentiator
# Individualized Baselines vs Population Averages
- Generic ML: "Heart Rate = 92 BPM is elevated."
- GlucoTwin: "Heart Rate = 92 BPM is $+21\%$ above this patient's personal resting setpoint ($76\text{ BPM}$)."
- Calculates continuous deviations across:
  - Glucose deviation ($\text{mg/dL}$) and percentage from basal setpoint.
  - Heart Rate deviation from resting baseline.
  - Parasympathetic HRV withdrawal ($\Delta\text{RMSSD}$).
- *Speaker Notes:* Personalization is the core value proposition of a digital twin.

---

### Slide 7: The 29-Dimensional Causal Feature Vector
# Zero Lookahead Leakage by Design
- **Static EHR (10):** Age, Sex, BMI, Diabetes Duration, HbA1c, Basal Glucose, Basal HR, Basal HRV, Medication count, Comorbidities.
- **Dynamic Instantaneous (6):** Glucose, HR, HRV, Steps, Activity Intensity, Sleep Quality.
- **Causal Rolling Queues (5):** 15m Glucose Velocity, 30m Glucose Acceleration, 60m Rolling Mean, 60m Rolling Std, 60m Meal Carbs.
- **Baseline Deviations (5):** Glucose Dev, HR Dev, HRV Dev, Metabolic Stability, Autonomic Stress Proxy.
- **Circadian Diurnal (2):** $\sin(2\pi t/24)$, $\cos(2\pi t/24)$.
- *Speaker Notes:* Every temporal feature looks strictly backward in time.

---

### Slide 8: The Target Definition
# Rigorous Clinical Prediction Horizon
- **Target Event:** Postprandial glucose crossing $\ge 180\text{ mg/dL}$ within a future window of **60 to 120 minutes**.
- **Why 180 mg/dL?** Aligned with American Diabetes Association (ADA) 2026 Standards of Care for postprandial hyperglycemia.
- **Why 60–120 minutes?** Provides a **70.0-minute median lead time**—the ideal therapeutic runway for lifestyle mitigation.
- *Speaker Notes:* A 15-minute prediction is too late; a 4-hour prediction is too uncertain. 60–120 minutes is optimal.

---

### Slide 9: Cohort Dataset Overview
# 100 Patient Cohort & 400,000 Physiological Steps
- 100 diverse synthetic patients reflecting real-world Type 2 Diabetes demographics.
- 14 days of continuous 5-minute sampling per patient ($4,032$ observations/patient).
- $399,600$ total temporal steps in SQLite persistence store.
- $3,962$ verified threshold-crossing events.
- Zero external cloud or paid API requirements.
- *Speaker Notes:* A self-contained, reproducible dataset with no privacy compliance barriers.

---

### Slide 10: Validation Protocol
# Strict Patient-Level Disjoint Partition
- **Train Set:** 75 patients ($299,700$ temporal observations, 3,003 spikes).
- **Holdout Test Set:** 25 unseen patients ($99,900$ temporal observations, 959 spikes).
- **Zero Patient Overlap:** Evaluates true generalizability to previously unmonitored individuals.
- **No Random K-Fold Leakage:** Standard k-fold leaks patient setpoints; our split is strictly disjoint.
- *Speaker Notes:* This is the highest standard of machine learning validation in healthcare.

---

### Slide 11: 4-Way Architecture Ablation Study
# Proving the Value of the Digital Twin
| Configuration | Input Modalities | ROC-AUC | PR-AUC | F1-Score | Warning Lead |
|---|---|---|---|---|---|
| Model A: EHR Only | Static clinical profile only | 0.9505 | 0.1740 | 0.1408 | N/A (Static) |
| Model B: Sensor Only | Dynamic CGM, PPG, Steps | 0.9604 | 0.2698 | 0.2492 | 70.0 min |
| Model C: Multimodal Fused | Raw EHR + Sensor Concatenation | 0.9861 | 0.4852 | 0.5008 | 70.0 min |
| **Model D: Full Digital Twin** | **Multimodal + Baselines + Dynamics** | **0.9881** | **0.5374** | **0.5378** | **70.0 min** |
- *Speaker Notes:* Model D achieves a +208% improvement in PR-AUC over EHR alone and +99% over sensors alone.

---

### Slide 12: Test Confusion Matrix & Alarm Fatigue
# Minimizing False Positive Alarms
- Evaluated on 99,900 holdout observations:
  - **True Negatives:** 97,306 (98.68% Specificity)
  - **False Positives:** 1,300 (**1.32% False Alarm Rate**)
  - **False Negatives:** 340 (26.28% Miss Rate)
  - **True Positives:** 954 (73.72% Sensitivity / Recall)
  - **Precision:** 42.32% | **Brier Score:** 0.0120
- **Clinical Significance:** Restricting false alarms to 1.32% while detecting nearly 74% of future postprandial excursions 70 minutes early eliminates alert fatigue.
- *Speaker Notes:* False alarms destroy clinical adoption. Our low false alarm rate ensures alerts are clinically trusted.

---

### Slide 13: Explainable AI (XAI)
# Unpacking the Black Box with Permutation Attributions
- Global feature attributions:
  1. `recent_carbs_60m` (28.5%)
  2. `glucose_velocity_15m` (19.8%)
  3. `glucose_dev_base` (14.2%)
  4. `hba1c` (8.9%)
  5. `hr_dev_base` (6.1%)
- Patient-specific explanations displayed in real time on the dashboard.
- *Speaker Notes:* Clinicians need to know why risk is rising to prescribe the right countermeasure.

---

### Slide 14: Counterfactual "What-If" Simulation
# Exploring Safer Trajectories
- Enables doctors and patients to simulate preemptive interventions:
  - **Postprandial Walking:** 10, 15, 20, 30 minutes.
  - **Carbohydrate Portion Moderation:** 15%, 30%, 50%.
  - **Sleep/Stress Recovery:** Parasympathetic restorative bonus.
- Real-time re-inference through the trained model demonstrates averted excursions.
- *Speaker Notes:* This is where GlucoTwin becomes an interactive clinical tool rather than a passive monitor.

---

### Slide 15: Case Study: Elena Vance (PT-001)
# Demonstrating Excursion Prevention in Practice
- **Baseline Scenario:** Ingests $65\text{g}$ carbohydrate lunch. Unintervened spike probability reaches **84%**, projected peak of $194\text{ mg/dL}$.
- **Preemptive Intervention:** Elena takes a 20-minute brisk walk and moderates carb portion by 30%.
- **Digital Twin Outcome:** Re-evaluated spike probability drops to **28%**, peak glucose is suppressed to $152\text{ mg/dL}$.
- **Result:** $0\text{ minutes}$ in hyperglycemic excursion!
- *Speaker Notes:* Averted hyperglycemia means zero oxidative stress for Elena today.

---

### Slide 16: Doctor-Facing Dashboard
# Built for Clinical Workflow & Real-Time Telemetry
- 10 purpose-built views:
  - **Overview:** Cohort-wide metabolic surveillance.
  - **Patient Profiles:** Comprehensive EHR records.
  - **Digital Twin:** Real-time state vector & baseline deviations.
  - **Live Telemetry:** 5-minute streaming visualizer with player controls.
  - **Predictions & XAI:** Risk horizon & attribution dials.
  - **What-If Simulator:** Interactive sliders & comparative twin states.
  - **ML Evaluation:** Live ablation metrics and confusion matrices.
  - **Data Explorer & System Health:** Subsystem verification & logs.
- *Speaker Notes:* Designed with an eye toward clinical utility, high contrast, and clean data density.

---

### Slide 17: Tech Stack & System Architecture
# Lightweight, Zero-Config, 100% Local Execution
- **Backend:** FastAPI, Python 3.13, SQLite (WAL Mode), Scikit-Learn 1.8.0, SHAP.
- **Frontend:** React 18, Vite 5, Tailwind CSS, Recharts, Lucide Icons.
- **Portability:** Operates completely offline on any standard laptop without paid APIs, Docker overhead, or cloud credentials.
- **Tests:** 12/12 automated Pytest verification suite passed.
- *Speaker Notes:* Maximum reproducibility for jury verification.

---

### Slide 18: Software as a Medical Device (SaMD)
# Regulatory & Clinical Governance
- Categorized as **IMDRF SaMD Category II (Class IIa under EU MDR)**.
- Operates as a **Clinical Decision Support (CDS)** system under FDA Section 520(o).
- Human-in-the-loop safeguards ensure clinician authority over all therapeutic decisions.
- Non-pharmacological recommendations mitigate risk of adverse hypoglycemic events.
- *Speaker Notes:* Built from day one with medical device compliance in mind.

---

### Slide 19: Privacy by Design & Responsible AI
# Zero PHI Leakage & Demographic Fairness
- Fully offline execution eliminates Protected Health Information (PHI) exposure.
- Evaluated across balanced demographic strata (age 30–78, sex parity, BMI 21–42.5).
- Aligned with WHO Guidance on Ethics and Governance of AI for Health.
- *Speaker Notes:* Healthcare AI must be ethical, private, and fair.

---

### Slide 20: Future Clinical Roadmap
# From Proof-of-Concept to Clinical Trials
- **Phase 1 (Current PoC):** Physiological Bergman simulation + HistGradientBoosting digital twin.
- **Phase 2 (Clinical Observational Trial):** Prospective validation on OhioT1DM and university T2D cohorts.
- **Phase 3 (Wearable Device SDK):** Native integration with Apple HealthKit, Dexcom API, and Abbott Libre.
- **Phase 4 (FDA 510(k) Pre-Submission):** Formal clinical decision support regulatory clearance.
- *Speaker Notes:* A clear pathway from hackathon prototype to clinical bedside utility.

---

### Slide 21: Competitive Differentiation Matrix
# Why GlucoTwin Wins the Challenge
| Evaluation Dimension | Conventional Approach | GlucoTwin Solution |
|---|---|---|
| **Architecture** | Generic classifier | Evolving physiological Digital Twin |
| **Personalization** | Population thresholds | Individualized baseline deviations |
| **Prediction Horizon** | 15–30m or reactive | **60–120m (70m median lead time)** |
| **Actionability** | Passive alerts | **Counterfactual 'What-If' simulator** |
| **Validation** | Leaky random split | **Disjoint 75/25 patient-level split** |
| **Reproducibility** | Cloud/paid dependencies | **100% local one-click execution** |
- *Speaker Notes:* GlucoTwin exceeds every requirement in the challenge specification.

---

### Slide 22: Conclusion & Call to Action
# GlucoTwin — Anticipate. Understand. Explore.
- Predicting postprandial glucose excursions 70 minutes early.
- Empowering clinicians with Explainable AI and What-If simulation.
- Fully working, verified, open-source codebase.
- **GitHub Repository:** Public open-source repository with full documentation.
- Thank you to the Happiest Health jury. Questions are welcome!
- *Speaker Notes:* Thank you, jury members. We look forward to your questions.
