/**
 * GlucoTwin — API Client
 * Happiest Health Digital Twin Challenge 2026
 * Fully supports all views and endpoints with robust fallback and naming aliases.
 */

const API_BASE = '/api';

// System & Diagnostics
export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}
export const getHealthStatus = fetchHealth;

// Patients Registry
export async function fetchPatients() {
  const res = await fetch(`${API_BASE}/patients`);
  if (!res.ok) throw new Error('Failed to fetch patients');
  const data = await res.json();
  // Ensure we return an object with patients array if backend returns array
  if (Array.isArray(data)) {
    return { patients: data, count: data.length };
  }
  return data;
}
export const getPatients = fetchPatients;

export async function fetchPatient(patientId) {
  const res = await fetch(`${API_BASE}/patients/${patientId}`);
  if (!res.ok) throw new Error(`Failed to fetch patient ${patientId}`);
  return res.json();
}

// Digital Twin State & Streaming Telemetry
export async function fetchTwinState(patientId) {
  const res = await fetch(`${API_BASE}/patients/${patientId}/twin`);
  if (!res.ok) throw new Error(`Failed to fetch twin state for ${patientId}`);
  const raw = await res.json();

  // Normalize fields so views with either naming convention work seamlessly
  const normalized = {
    ...raw,
    // Aliases for dynamic_state
    dynamic_state: raw.dynamic ? {
      ...raw.dynamic,
      timestamp: raw.last_update,
      glucose_velocity: raw.dynamic.glucose_velocity_15m,
      heart_rate: raw.dynamic.hr,
      steps: raw.dynamic.steps_30m,
      meal_carbs_g: raw.dynamic.meal_carbs_60m
    } : raw.dynamic_state,
    
    // Aliases for personal_baseline
    personal_baseline: raw.baseline ? {
      ...raw.baseline,
      mean_glucose: raw.baseline.baseline_glucose,
      mean_hr: raw.baseline.baseline_hr,
      mean_hrv: raw.baseline.baseline_hrv
    } : raw.personal_baseline,

    // Aliases for derived_state
    derived_state: raw.derived ? {
      ...raw.derived,
      hr_deviation_pct: raw.derived.hr_dev_percent,
      glucose_deviation_mgdl: raw.derived.glucose_dev_base,
      hr_deviation_bpm: raw.derived.hr_dev_base
    } : raw.derived_state,

    // Aliases for prediction
    prediction: raw.prediction ? {
      ...raw.prediction,
      spike_probability: raw.prediction.risk_score,
      risk_tier: raw.prediction.risk_category,
      projected_peak_mgdl: Math.round((raw.dynamic?.glucose || 120) + (raw.dynamic?.glucose_velocity_15m > 0 ? raw.dynamic.glucose_velocity_15m * 45 : 15)),
      clinical_recommendation: raw.prediction.risk_category === 'HIGH' || raw.prediction.risk_category === 'CRITICAL'
        ? 'High probability of postprandial glucose spike (≥180 mg/dL). Preemptive 15-minute brisk walk and carbohydrate moderation recommended.'
        : 'Glycemic equilibrium within standard target bounds. Continue routine postprandial observation.'
    } : raw.prediction,

    static_profile: raw.static || raw.static_profile
  };

  return normalized;
}
export const getDigitalTwinState = fetchTwinState;

export async function fetchSensorHistory(patientId, limit = 144) {
  const res = await fetch(`${API_BASE}/patients/${patientId}/history?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch sensor history for ${patientId}`);
  const list = await res.json();
  const historyList = Array.isArray(list) ? list : list.history || [];
  
  // Normalize each observation
  const normalizedHistory = historyList.map(item => ({
    ...item,
    heart_rate: item.hr ?? item.heart_rate ?? 72,
    hrv: item.hrv ?? 45,
    steps: item.steps ?? 0,
    meal_carbs_g: item.meal_carbs ?? item.meal_carbs_g ?? 0
  }));

  return { history: normalizedHistory, patient_id: patientId };
}
export const getPatientHistory = fetchSensorHistory;

export async function fetchPredictionsHistory(patientId, limit = 48) {
  const res = await fetch(`${API_BASE}/patients/${patientId}/predictions/history?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch prediction history for ${patientId}`);
  return res.json();
}

export async function fetchExplanation(patientId) {
  const res = await fetch(`${API_BASE}/patients/${patientId}/explanation`);
  if (!res.ok) throw new Error(`Failed to fetch explanation for ${patientId}`);
  return res.json();
}

// What-If Counterfactual Simulator
export async function runWhatIfSimulation(patientId, interventions) {
  const payload = {
    walk_minutes: Number(interventions.walk_minutes || 0),
    carb_reduction_percent: Number(interventions.carb_reduction_percent !== undefined ? interventions.carb_reduction_percent : (interventions.carb_reduction_pct || 0.0)),
    carb_reduction_pct: Number(interventions.carb_reduction_pct !== undefined ? interventions.carb_reduction_pct : (interventions.carb_reduction_percent || 0.0)),
    sleep_boost: Boolean(interventions.sleep_boost || (interventions.sleep_bonus_hours && interventions.sleep_bonus_hours > 0)),
    sleep_bonus_hours: Number(interventions.sleep_bonus_hours || 0.0)
  };

  const res = await fetch(`${API_BASE}/patients/${patientId}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Simulation request failed');
    throw new Error(errorText || 'What-if simulation failed');
  }
  const data = await res.json();
  
  return {
    ...data,
    simulated_spike_probability: data.simulated_risk,
    baseline_spike_probability: data.baseline_risk,
    simulated_peak_mgdl: data.simulated_projected_peak_mgdl,
    baseline_peak_mgdl: data.baseline_projected_peak_mgdl
  };
}

// Deterministic Simulation Stepper
export async function tickSimulation(patientId, speed = 1.0) {
  const res = await fetch(`${API_BASE}/simulation/tick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_id: patientId, speed_multiplier: speed }),
  });
  if (!res.ok) throw new Error('Failed to tick simulation');
  return fetchTwinState(patientId);
}

export async function resetSimulation(patientId) {
  const res = await fetch(`${API_BASE}/simulation/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_id: patientId }),
  });
  if (!res.ok) throw new Error('Failed to reset simulation');
  return res.json();
}
export const resetPatientSimulation = resetSimulation;

// Model Benchmarks & Metrics
export async function fetchModelMetrics() {
  const res = await fetch(`${API_BASE}/model/metrics`);
  if (!res.ok) throw new Error('Failed to fetch model metrics');
  return res.json();
}
export const getEvaluationMetrics = fetchModelMetrics;

export async function fetchModelInfo() {
  const res = await fetch(`${API_BASE}/model/info`);
  if (!res.ok) throw new Error('Failed to fetch model info');
  return res.json();
}

export async function fetchDataQuality() {
  const res = await fetch(`${API_BASE}/data/quality`);
  if (!res.ok) throw new Error('Failed to fetch data quality');
  return res.json();
}
export const getCohortStats = fetchDataQuality;
