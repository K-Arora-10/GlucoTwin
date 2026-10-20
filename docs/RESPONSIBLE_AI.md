# GlucoTwin — Responsible AI & Healthcare Governance Framework
**Happiest Health Digital Twin Challenge 2026**

---

## 1. Ethical AI Principles in Healthcare

GlucoTwin has been developed in strict accordance with the **World Health Organization (WHO) Guidance on Ethics and Governance of Artificial Intelligence for Health** and the **US FDA Software as a Medical Device (SaMD)** regulatory guidelines.

### 1.1. Core Commitments
1. **Human Autonomy & Clinician-in-the-Loop:** GlucoTwin is designed as a **Clinical Decision Support (CDS)** system. It provides predictive probabilities, feature attributions, and non-pharmacological what-if projections to inform clinicians and empower patients, but does **not** autonomously alter medication dosages or insulin delivery.
2. **Transparency & Explainability:** Every prediction surfaces individualized feature attributions (via permutation importance) indicating whether acute carbohydrates, glucose velocity, baseline deviation, or circadian phase drove the risk score.
3. **Safety & Non-Maleficence:** Counterfactual simulation recommendations focus on physiological lifestyle adjustments (post-meal walking, portion control) with minimal risk of precipitating acute hypoglycemia.
4. **Data Privacy by Design:** The architecture functions entirely locally without external cloud dependencies or third-party telemetry tracking, avoiding Protected Health Information (PHI) exposure.

---

## 2. Software as a Medical Device (SaMD) Classification

Under the International Medical Device Regulators Forum (IMDRF) SaMD categorization framework:
- **State of Healthcare Situation:** Non-serious to Serious (Type 2 Diabetes postprandial hyperglycemia).
- **Significance of Information Provided:** "Drive or inform clinical management" (preemptive lifestyle action before threshold breach).
- **SaMD Category:** **Category II / Class IIa (EU MDR) / 510(k) exempt CDS (FDA Section 520(o))**.

---

## 3. Bias, Fairness & Demographic Parity

The synthetic cohort has been designed to reflect real-world epidemiological demographics:
- **Age Distribution:** 30 to 78 years across early-onset and geriatric T2D presentations.
- **Sex Representation:** 50% female, 50% male with balanced BMI and comorbidity stratification.
- **Glycemic Span:** HbA1c spans 5.4% (well-controlled / prediabetic) to 11.2% (severe insulin resistance), ensuring the model performs reliably across varying disease severities.

---

## 4. Clinical Decision Support System (CDS) Regulatory Disclaimer

> **IMPORTANT CLINICAL NOTICE**
> 
> GlucoTwin is a research proof-of-concept developed specifically for the **Happiest Health Digital Twin Challenge 2026**. 
> 
> It is not currently approved or cleared by the US Food and Drug Administration (FDA), European Medicines Agency (EMA), or the Central Drugs Standard Control Organisation (CDSCO) as a medical diagnostic device.
> 
> The system is intended solely for investigational and educational demonstration of multimodal digital twinning techniques in metabolic disease. Clinical decisions should always be made by qualified healthcare professionals based on standard clinical evaluations and laboratory tests.
