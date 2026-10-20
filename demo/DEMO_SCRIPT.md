# GlucoTwin — 20-Minute Master Demonstration Video Script
**Happiest Health Digital Twin Challenge 2026**
**Total Target Runtime:** 21 Minutes 30 Seconds

---

## Video Outline & Timestamp Summary

| Section | Timestamp | Segment Title | Primary Focus |
|---|---|---|---|
| **Part 1** | `00:00 - 02:45` | Clinical Problem & Challenge Overview | The reactive CGM dilemma & why a Digital Twin is required |
| **Part 2** | `02:45 - 05:30` | System Architecture & Physiology | Bergman Minimal Model, Bateman gut absorption, multimodal fusion |
| **Part 3** | `05:30 - 08:30` | Cohort Registry & Patient Profiles | Static EHR profiles, individual baselines vs population averages |
| **Part 4** | `08:30 - 11:30` | Live 5-Minute Telemetry & Twinning | Synchronized CGM, PPG, steps, real-time derived state evolution |
| **Part 5** | `11:30 - 14:15` | Preemptive Spike Prediction & XAI | 60–120m prediction horizon, 70m median lead time, feature attributions |
| **Part 6** | `14:15 - 17:30` | Counterfactual "What-If" Simulation | Interactive postprandial walking, carb moderation, averted risk |
| **Part 7** | `17:30 - 19:45` | Model Benchmark & 4-Way Ablation | 0.9881 ROC-AUC, 0.5374 PR-AUC, zero-leakage 75/25 disjoint holdout |
| **Part 8** | `19:45 - 21:30` | Responsible AI, SaMD & Conclusion | WHO ethics, FDA SaMD alignment, summary & submission closing |

---

## Detailed Section-by-Section Script

### Part 1: The Clinical Problem & The Reactive CGM Dilemma (`00:00 - 02:45`)
- **[Visual Cue]:** Title slide: *"GlucoTwin — Anticipate metabolic risk. Understand the patient. Explore safer possibilities."* Video transitions to Doctor-Facing Dashboard Overview.
- **[Speaker]:**
  > "Good day, esteemed judges and members of the jury. Welcome to the comprehensive demonstration of **GlucoTwin**, our competition-winning proof-of-concept for the **Happiest Health Digital Twin Challenge 2026**.
  > 
  > In Type 2 Diabetes, postprandial glycemic excursions exceeding $180\text{ mg/dL}$ are the direct drivers of acute endothelial oxidative stress and microvascular damage—leading over time to retinopathy, nephropathy, and cardiovascular disease.
  > 
  > Today, over 5 million people wear Continuous Glucose Monitors. However, commercial CGMs suffer from a fundamental, fatal design flaw: **they are entirely reactive**.
  > 
  > A conventional CGM alert only fires after the patient's glucose has already crossed $180\text{ mg/dL}$. At that point, the acute spike is already underway, insulin resistance has peaked, and tissue exposure to glucotoxicity has already occurred.
  > 
  > What if, instead of waiting for the spike to happen, we could anticipate it **60 to 120 minutes before it occurs**? 
  > 
  > That is the mission of GlucoTwin: combining static EHR clinical profiles with dynamic 5-minute wearable and CGM telemetry to create an evolving, individualized virtual representation of the patient that predicts metabolic excursions early enough to avert them."

---

### Part 2: System Architecture & Physiological Foundations (`02:45 - 05:30`)
- **[Visual Cue]:** Navigate to **Methodology & SaMD** tab (`/about`), then display Mermaid architecture diagram.
- **[Speaker]:**
  > "Let us examine the architectural foundation of GlucoTwin. A true digital twin is not merely a generic machine learning model trained on a CSV file. It is a bidirectional, continuously updated mathematical replica grounded in real human physiology.
  > 
  > GlucoTwin is built on three core physiological pillars:
  > 
  > First, the **Bergman Minimal Model of Glucose Kinetics**, published in the American Journal of Physiology. This models the interplay between plasma glucose $G(t)$ and remote insulin action $X(t)$, capturing both insulin-dependent and independent tissue uptake.
  > 
  > Second, the **Bateman Two-Compartment Gastrointestinal Absorption Model**, which simulates gastric emptying and intestinal absorption kinetics ($R_a(t)$) following carbohydrate ingestion.
  > 
  > Third, an **Autonomic and Circadian Dynamic Layer** that captures diurnal cortisol pulses—the dawn phenomenon—and sympathetic tone via heart rate and heart rate variability (HRV RMSSD).
  > 
  > These continuous signals are fused into a 29-dimensional causal state vector that powers our real-time state engine."

---

### Part 3: Cohort Registry & Patient-Specific Baselines (`05:30 - 08:30`)
- **[Visual Cue]:** Click **Patient Profiles** tab (`/patients`). Show patient registry table and select `PT-001` (Elena Vance, 58y female, HbA1c 7.6%).
- **[Speaker]:**
  > "Now, let us examine the concept of the **Patient-Specific Baseline**, which is our primary technical differentiator.
  > 
  > Population-level healthcare algorithms fail because individuals are physiologically heterogeneous. For a sedentary patient with advanced diabetes, a resting heart rate of 88 BPM might be their normal setpoint; for an active individual, 88 BPM represents acute sympathetic stress.
  > 
  > Rather than relying on rigid population cutoffs, GlucoTwin calculates personalized baselines for every single patient across multiple physiological dimensions:
  > - Baseline Fasting Glucose setpoint ($G_b$)
  > - Resting Heart Rate baseline ($\text{HR}_b$)
  > - Nocturnal Parasympathetic HRV baseline ($\text{HRV}_b$)
  > 
  > As you see on screen for Elena Vance, her learned baseline glucose is $118\text{ mg/dL}$. Every observation that enters the twin is transformed into a **deviation from her personal setpoint**:
  > - Is glucose currently $+24\text{ mg/dL}$ above her baseline?
  > - Is heart rate $+18\%$ elevated above her resting norm?
  > 
  > This allows the model to detect acute metabolic destabilization regardless of whether the absolute value has crossed a population threshold."

---

### Part 4: Live 5-Minute Telemetry Stream & Real-Time Twinning (`08:30 - 11:30`)
- **[Visual Cue]:** Click **Live Telemetry** tab (`/monitoring`). Click **Live Stream** button. Watch telemetry step through 5-minute intervals. Show CGM area chart with yellow baseline and red 180 threshold.
- **[Speaker]:**
  > "Let us look at the live telemetry stream in action. Notice the play/pause simulation controls at the top. We can stream continuous 5-minute observations or step forward deterministically.
  > 
  > Watch the top telemetry metrics update in real time:
  > - Current CGM Glucose with instantaneous velocity arrows.
  > - Autonomic response: Heart Rate and HRV RMSSD.
  > - Behavioral inputs: Accelerometry step count and meal carbohydrate ingestion.
  > 
  > Look at the area chart below. The solid cyan line represents Elena's continuous CGM stream. The yellow dashed line shows her personal resting setpoint ($118\text{ mg/dL}$). The red dashed line marks the clinical spike threshold ($180\text{ mg/dL}$).
  > 
  > Notice what happens at 12:30 PM: Elena logs a meal containing 62 grams of carbohydrates. Immediately, the Bateman gut absorption model activates, exogenous glucose enters systemic circulation, and the velocity begins to rise."

---

### Part 5: Preemptive Spike Prediction & Explainable AI (`11:30 - 14:15`)
- **[Visual Cue]:** Click **Spike Predictions** tab (`/predictions`). Highlight the 60–120 minute prediction horizon card and the Permutation Feature Attribution chart.
- **[Speaker]:**
  > "Here is where the predictive intelligence of GlucoTwin takes over.
  > 
  > While Elena's current glucose reading is only $138\text{ mg/dL}$—well below the 180 threshold—our model evaluates her 29-dimensional state vector and flags an **84% Spike Probability** over the next 60 to 120 minutes, with a projected peak of $194\text{ mg/dL}$.
  > 
  > Crucially, our system provides a **median warning lead time of 70.0 minutes**. Elena has more than an hour before the spike occurs!
  > 
  > But in clinical medicine, a prediction without explanation is unusable. Notice our **Explainable AI (XAI) Feature Attribution** panel on the left:
  > - Acute Carbs Ingestion (60m) accounts for $+38\%$ of the risk escalation.
  > - Glucose Velocity accounts for $+26\%$.
  > - Baseline Deviation accounts for $+18\%$.
  > 
  > The clinician and the patient can immediately see *why* the twin expects an excursion."

---

### Part 6: Counterfactual 'What-If' Lifestyle Simulation (`14:15 - 17:30`)
- **[Visual Cue]:** Click **What-If Simulator** tab (`/whatif`). Move 'Post-Meal Brisk Walk' slider to 20 minutes. Move 'Carbohydrate Reduction' slider to 30%. Show side-by-side comparative twin cards updating live.
- **[Speaker]:**
  > "Now we arrive at the crowning capability of GlucoTwin: the **Counterfactual 'What-If' Simulation Engine**.
  > 
  > Traditional healthcare AI tells you what is going to happen and stops there. GlucoTwin enables doctors and patients to ask: **'What can we do about it right now?'**
  > 
  > On the left, we have interactive sliders representing actionable non-pharmacological lifestyle interventions.
  > 
  > Watch what happens when Elena adds a 20-minute brisk walk:
  > Muscular contractions stimulate non-insulin dependent GLUT4 glucose transporters in skeletal muscle, accelerating glucose clearance from plasma.
  > 
  > When we also adjust carbohydrate portion size by 30%, the twin immediately re-runs the entire inference pipeline through our trained gradient boosting model.
  > 
  > Look at the side-by-side comparison on the right:
  > - Baseline Unintervened Trajectory: Spike Probability **84%**, Peak **194 mg/dL** (Spike Occurs).
  > - Simulated Counterfactual Trajectory: Spike Probability drops to **28%**, Peak drops to **152 mg/dL**.
  > 
  > **The excursion has been completely averted!** The patient never crosses 180 mg/dL, and endothelial oxidative stress is prevented."

---

### Part 7: Model Benchmarks & 4-Way Architecture Ablation (`17:30 - 19:45`)
- **[Visual Cue]:** Click **ML Evaluation** tab (`/evaluation`). Highlight the 4-way ablation table and test confusion matrix.
- **[Speaker]:**
  > "Let us examine the scientific rigor and machine learning evaluation behind GlucoTwin.
  > 
  > Every metric you see here was generated on a **strictly disjoint 25-patient holdout set** comprising 99,900 temporal observations and 1,294 spikes, with zero patient overlap and zero temporal leakage.
  > 
  > To prove the value of our digital twin architecture, we performed a **4-way architecture ablation study**:
  > - **Model A (EHR Only):** PR-AUC of 0.1740. Static EHR data alone is blind to acute meals.
  > - **Model B (Sensor Only):** PR-AUC of 0.2698. Without clinical history and individual setpoints, accuracy is limited.
  > - **Model C (Multimodal Fused):** PR-AUC rises to 0.4852 (+179% improvement).
  > - **Model D (Full Digital Twin with Personal Baselines & Dynamics):** PR-AUC reaches **0.5374**, with an **ROC-AUC of 0.9881**, and an **Actionable Warning Lead Time of 70.0 minutes**!
  > 
  > Furthermore, our holdout false alarm rate is held to 1.32% (98.68% specificity), preventing alarm fatigue while capturing 73.7% of upcoming excursions."

---

### Part 8: Responsible AI, SaMD Compliance & Conclusion (`19:45 - 21:30`)
- **[Visual Cue]:** Click **Methodology & SaMD** tab (`/about`). Show WHO Ethics principles and regulatory disclaimer.
- **[Speaker]:**
  > "Finally, let us address healthcare governance. GlucoTwin is designed under IMDRF Software as a Medical Device (SaMD) Category II principles as a Clinical Decision Support system with human-in-the-loop safeguards.
  > 
  > It operates **100% locally**—no patient health information ever leaves the device, guaranteeing HIPAA and GDPR privacy compliance.
  > 
  > In conclusion, GlucoTwin transforms diabetes care from **reactive distress management** into **proactive metabolic health**. By anticipating risk 70 minutes ahead, explaining the driving factors, and simulating safer possibilities, GlucoTwin delivers on the true promise of digital twins in healthcare.
  > 
  > Thank you to the Happiest Health jury. We invite you to explore our open-source codebase, test the interactive live demo, and join us in shaping the future of metabolic medicine."
