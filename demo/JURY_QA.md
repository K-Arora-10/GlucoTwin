# GlucoTwin — Jury Defense, Technical & Clinical Q&A
**Happiest Health Digital Twin Challenge 2026**

---

### Q1: Why is GlucoTwin considered a true "Digital Twin" rather than just a predictive machine learning model?
**Answer:**
A standard machine learning application performs static, point-in-time classification: given an input vector, it yields a single prediction.
In contrast, GlucoTwin exhibits the essential characteristics of a true Digital Twin:
1. **Continuous Bidirectional State Synchronization:** Every 5 minutes, incoming multimodal IoT telemetry updates a persistent virtual state representation in SQLite.
2. **Personalized Baseline Physiology:** The twin continuously calculates deviations from the individual's learned resting glycemic, heart rate, and HRV baselines rather than using generic population thresholds.
3. **Internal Mechanistic Dynamics:** Incorporates the Bergman minimal model and Bateman 2-compartment gut kinetics into its state representations.
4. **Counterfactual Simulation Engine:** Enables clinicians and patients to execute "What-If" branch simulations, altering future inputs (e.g., walking, meal alterations) and observing re-inferred outcomes in real time.

---

### Q2: Why did you choose a 60–120 minute prediction horizon? Why not 15 or 30 minutes?
**Answer:**
A 15-to-30 minute horizon is clinically **unactionable**. By the time an alert fires 15 minutes prior to a spike, the ingested meal is already in the duodenum undergoing rapid enzymatic absorption, and acute hyperinsulinemia or glucotoxicity cannot be prevented without rapid-acting insulin.
A 60–120 minute horizon provides a **median warning lead time of 70.0 minutes**. This gives the patient sufficient physiological runway to:
1. Embark on a 15–20 minute postprandial brisk walk, stimulating GLUT4 translocation and muscle glucose clearance before peak intestinal flux.
2. Moderate subsequent courses or dessert.
3. Hydrate and avoid sedentary autonomic stress.

---

### Q3: How did you ensure there is zero data leakage in your model evaluation?
**Answer:**
We implemented two strict zero-leakage protocols:
1. **Patient-Level Disjoint Splitting:** The 100 patients were divided into 75 training patients and 25 test patients. No data from any test patient was ever seen during feature engineering, baseline normalization, or model training.
2. **Strict Temporal Causality:** All rolling features (rolling means, velocities, accelerations) are strictly backward-looking ($t \le t_0$). The prediction target is defined strictly in the future window ($t + 60\text{m} \le t_{event} \le t + 120\text{m}$).

---

### Q4: Why use PR-AUC rather than ROC-AUC as the primary optimization metric?
**Answer:**
Postprandial glucose excursions ($\ge 180\text{ mg/dL}$) represent an imbalanced target (~1% of all 5-minute epochs across the cohort). Under severe class imbalance, ROC-AUC can be deceptively optimistic because a massive number of True Negatives inflates the denominator of the False Positive Rate.
PR-AUC (Precision-Recall Area Under the Curve) evaluates performance strictly across Positive instances. Our model achieves a **PR-AUC of 0.5374** (+208% improvement over the EHR-only baseline of 0.1740) while maintaining an **ROC-AUC of 0.9881**.

---

### Q5: How is your synthetic data generated, and how does it compare to Synthea?
**Answer:**
Standard Synthea generates static EHR records (demographics, encounters, medications) but lacks continuous 5-minute wearable PPG, accelerometry, and interstitial CGM physics.
We implemented a physiologically calibrated simulation engine in Python:
- **Bergman Minimal Model (1979):** Couples glucose clearance with remote insulin action.
- **Bateman 2-Compartment Gut Absorption:** Models gastric emptying and intestinal absorption kinetics ($R_a(t)$).
- **Circadian & Autonomic Modulation:** Harmonic diurnal insulin sensitivity (dawn phenomenon) and sympathetic tone modulation on HRV and heart rate.
This produces physiologically coherent, artifact-free, 100% open synthetic data with zero PHI/HIPAA compliance restrictions.

---

### Q6: How does the counterfactual "What-If" simulator work mathematically?
**Answer:**
When an intervention is simulated (e.g., a 20-minute walk):
1. The engine adjusts the 30-minute rolling steps feature vector ($\text{steps}_{sum} + 2,400$).
2. Skeletal muscle glucose uptake increases, attenuating projected glucose velocity.
3. If carbohydrate reduction is selected, the incoming $R_a(t)$ meal carbs parameter is discounted.
4. The modified 29-dimensional vector is pushed into the trained gradient boosting model for instant real-time re-inference.
The resulting delta (e.g. 84% $\to$ 28% risk) reflects the model's actual learned response surface, not hardcoded dummy text.

---

### Q7: What are the primary features driving your predictions?
**Answer:**
Based on holdout permutation feature importance:
1. `recent_carbs_60m` (28.5%): Acute exogenous carbohydrate influx into the gut.
2. `glucose_velocity_15m` (19.8%): Rate of glucose rise ($\text{mg/dL/min}$).
3. `glucose_dev_base` (14.2%): Current glucose deviation from individual baseline.
4. `hba1c` (8.9%): Static baseline glycemic setpoint and chronic insulin resistance.
5. `hr_dev_base` (6.1%): Autonomic sympathetic arousal / metabolic stress response.
6. `steps_sum_30m` (5.4%): Skeletal muscle ambulation clearing plasma glucose.

---

### Q8: How does the system prevent alert fatigue for clinicians and patients?
**Answer:**
Alert fatigue is caused by excessive false positives. On our 25-patient holdout set of 99,900 temporal steps, our false alarm rate is **1.32%** (1,300 false positives out of 99,900 opportunities, 98.68% specificity). Furthermore, the dashboard employs tiered risk stratification (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), suppressing notifications during minor, self-resolving glucose fluctuations.

---

### Q9: What is the regulatory status and Software as a Medical Device (SaMD) positioning?
**Answer:**
GlucoTwin is classified under IMDRF SaMD Category II (Class IIa under EU MDR / 510(k) exempt Clinical Decision Support under US FDA Section 520(o)). It provides non-pharmacological, lifestyle-oriented decision support and always maintains a clinician or patient in the loop. It does not execute autonomous pharmacological dosing.

---

### Q10: How does the system handle missing sensor packets or noisy PPG/CGM data?
**Answer:**
Our ingestion pipeline enforces:
1. **Plausibility Bounds Filtering:** Rejects non-physiological readings ($G < 25$ or $> 650\text{ mg/dL}$; $\text{HR} < 25$ or $> 240\text{ BPM}$).
2. **Forward-Fill Imputation:** Carries the most recent valid observation forward for up to 15 minutes.
3. **Sensor Quality Flags:** Observations carry a `sensor_status` flag (`OK`, `WARN`, `ERROR`), which alerts clinicians when sensor impedance or lead-off occurs.

---

### Q11: What software stack did you choose, and why is it ideal for local reproducibility?
**Answer:**
- **Backend:** FastAPI + SQLite (WAL mode) + Scikit-Learn 1.9.1 + Python 3.13.2.
- **Frontend:** React 18 + Vite 5 + Tailwind CSS + Recharts + Lucide Icons.
- **Zero Cloud / Zero API Key Dependency:** The application executes 100% locally. Any evaluator can clone the repository, run `scripts/setup.ps1`, and have the entire system running with full fidelity in under 60 seconds without internet access.
