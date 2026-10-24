import React from 'react';
import {
  Cpu,
  Layers,
  Activity,
  Heart,
  Shield,
  Zap,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function DigitalTwinView({ twinState, onNavigate, onSimulateWhatIf, setCurrentView }) {
  const navigate = onNavigate || onSimulateWhatIf || setCurrentView || (() => {});

  if (!twinState) {
    return <div className="text-center py-12 text-slate-500">Loading Digital Twin State...</div>;
  }

  const patient = twinState.static || twinState.static_profile || {};
  const baseline = twinState.baseline || twinState.personal_baseline || {};
  const dyn = twinState.dynamic || twinState.dynamic_state || {};
  const derived = twinState.derived || twinState.derived_state || {};
  const prediction = twinState.prediction || {};

  const stability = derived?.metabolic_stability ?? 100.0;
  const gDev = derived?.glucose_dev_base ?? 0.0;
  const gDevPct = derived?.glucose_dev_percent ?? 0.0;
  const hrDev = derived?.hr_dev_base ?? 0.0;
  const hrDevPct = derived?.hr_dev_percent ?? derived?.hr_deviation_pct ?? (
    (baseline?.baseline_hr || patient?.baseline_hr) && dyn?.hr
      ? Number((((dyn.hr - (baseline?.baseline_hr || patient?.baseline_hr)) / (baseline?.baseline_hr || patient?.baseline_hr)) * 100).toFixed(1))
      : 0.0
  );
  const hrvDev = derived?.hrv_dev_base ?? 0.0;
  const hrvDevPct = derived?.hrv_dev_percent ?? 0.0;

  return (
    <div className="space-y-6">
      {/* Title & Architecture Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
                <Cpu className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900">
                Patient Virtual Representation: {patient.name} ({patient.patient_id})
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              The Digital Twin continuously fuses static EHR clinical history with live wearable & CGM IoT streams to estimate personalized physiological homeostasis and forecast upcoming metabolic excursions.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">Twin Update Rate:</span>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2 py-1 rounded">
              Every 5 Minutes (Continuous)
            </span>
          </div>
        </div>
      </div>

      {/* 5-Tier Digital Twin Layer Architecture Diagram */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center">
          <Layers className="w-4 h-4 mr-2 text-teal-600" />
          Multi-Tier Virtual State Pipeline
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          {/* Tier 1: Static EHR */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tier 1</span>
              <h3 className="font-bold text-xs text-slate-900 mt-0.5">Static EHR Profile</h3>
              <p className="text-[11px] text-slate-500 mt-1">Clinical demographics & diagnoses</p>
              <div className="mt-3 space-y-1 text-xs text-slate-700">
                <div>HbA1c: <strong>{patient.HbA1c}%</strong></div>
                <div>BMI: <strong>{patient.BMI}</strong></div>
                <div>Age: <strong>{patient.age} yrs</strong></div>
                <div>Duration: <strong>{patient.diabetes_duration_years} yrs</strong></div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-teal-700 font-semibold">
              Fixed Context
            </div>
          </div>

          {/* Tier 2: Personal Baseline */}
          <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Tier 2</span>
              <h3 className="font-bold text-xs text-slate-900 mt-0.5">Learned Baselines</h3>
              <p className="text-[11px] text-slate-500 mt-1">Individual physiological norm</p>
              <div className="mt-3 space-y-1 text-xs text-slate-700">
                <div>Base Glucose: <strong>{baseline.baseline_glucose} mg/dL</strong></div>
                <div>Resting HR: <strong>{baseline.baseline_hr} BPM</strong></div>
                <div>Resting HRV: <strong>{baseline.baseline_hrv} ms</strong></div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-teal-200 text-[10px] text-teal-800 font-semibold">
              Rolling 14-day Norm
            </div>
          </div>

          {/* Tier 3: Dynamic Sensors */}
          <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Tier 3</span>
              <h3 className="font-bold text-xs text-slate-900 mt-0.5">Live Sensor Stream</h3>
              <p className="text-[11px] text-slate-500 mt-1">Current 5-min physiological state</p>
              <div className="mt-3 space-y-1 text-xs text-slate-700">
                <div>Current G: <strong>{dyn.glucose} mg/dL</strong></div>
                <div>Velocity: <strong>{dyn.glucose_velocity_15m} mg/dL/min</strong></div>
                <div>Current HR: <strong>{dyn.hr} BPM</strong></div>
                <div>Current HRV: <strong>{dyn.hrv} ms</strong></div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-indigo-200 text-[10px] text-indigo-800 font-semibold">
              Real-time Ingestion
            </div>
          </div>

          {/* Tier 4: Derived State */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Tier 4</span>
              <h3 className="font-bold text-xs text-slate-900 mt-0.5">Derived Deviations</h3>
              <p className="text-[11px] text-slate-500 mt-1">Distance from personal baseline</p>
              <div className="mt-3 space-y-1 text-xs text-slate-700">
                <div>G Deviation: <strong>{gDev > 0 ? `+${gDev}` : gDev} mg/dL</strong></div>
                <div>HR Deviation: <strong>{hrDev > 0 ? `+${hrDev}` : hrDev} BPM</strong></div>
                <div>Stability: <strong>{stability}%</strong></div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-amber-200 text-[10px] text-amber-800 font-semibold">
              The Twin Core Differentiator
            </div>
          </div>

          {/* Tier 5: Predictive Inference */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            prediction.risk_category === 'CRITICAL' ? 'bg-rose-50 border-rose-300' :
            prediction.risk_category === 'HIGH' ? 'bg-orange-50 border-orange-300' :
            prediction.risk_category === 'MEDIUM' ? 'bg-amber-50 border-amber-300' :
            'bg-emerald-50 border-emerald-300'
          }`}>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-700">Tier 5</span>
              <h3 className="font-bold text-xs text-slate-900 mt-0.5">Adverse Forecast</h3>
              <p className="text-[11px] text-slate-600 mt-1">Future horizon [60-120 min]</p>
              <div className="mt-3 space-y-1 text-xs text-slate-800">
                <div>Spike Risk: <strong>{Math.round(prediction.risk_score * 100)}%</strong></div>
                <div>Category: <strong className="uppercase">{prediction.risk_category}</strong></div>
                <div>ETA: <strong>{prediction.eta_minutes ? `~${prediction.eta_minutes} min` : 'None'}</strong></div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-300 text-[10px] font-bold text-slate-800">
              Calibrated Decision Support
            </div>
          </div>
        </div>
      </div>

      {/* Visual Physiological State Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Metabolic & Cardiovascular State Gauges */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center">
            <Activity className="w-4 h-4 mr-2 text-teal-600" />
            Physiological Organ-System Gauges
          </h2>

          {/* Gauge 1: Metabolic Homeostasis */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-700">Metabolic Homeostasis (Personal Stability)</span>
              <span className="font-bold text-slate-900">{stability}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  stability > 70 ? 'bg-teal-600' : stability > 45 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${stability}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Severe Excursion</span>
              <span>Near Personal Baseline ({baseline.baseline_glucose || patient.baseline_glucose || 110} mg/dL)</span>
            </div>
          </div>

          {/* Gauge 2: Cardiovascular State */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-700">Cardiovascular Tone (Resting HR Deviation)</span>
              <span className="font-bold text-slate-900">{hrDev > 0 ? `+${hrDev}` : hrDev} BPM ({hrDevPct > 0 ? `+${hrDevPct}` : hrDevPct}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full ${Math.abs(hrDev) < 10 ? 'bg-teal-600' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, Math.max(10, 50 + hrDev * 2))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Below Baseline</span>
              <span>Nominal Baseline ({baseline.baseline_hr || patient.baseline_hr || 70} BPM)</span>
              <span>Elevated Sympathetic</span>
            </div>
          </div>

          {/* Gauge 3: Autonomic Recovery (HRV) */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-700">Autonomic Recovery (HRV RMSSD)</span>
              <span className="font-bold text-slate-900">{dyn.hrv ?? '--'} ms ({hrvDev > 0 ? `+${hrvDev}` : hrvDev} ms)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full ${dyn.hrv > 35 ? 'bg-teal-600' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, (dyn.hrv / 70.0) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Blunted HRV (Vagal Withdrawal)</span>
              <span>Optimal Restorative Tone</span>
            </div>
          </div>
        </div>

        {/* Personalized Baseline vs Population Context */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center">
            <Zap className="w-4 h-4 mr-2 text-amber-500" />
            Population Norm vs Individual Baseline
          </h2>
          <p className="text-xs text-slate-500">
            A standard generic model treats 150 mg/dL identically for all patients. GlucoTwin explicitly anchors predictions in the patient's learned biological norm:
          </p>

          <div className="space-y-3 mt-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-900 block mb-1">1. Relative Glycemic Excursion:</span>
              <div className="flex items-center justify-between text-slate-700">
                <span>Current Glucose:</span>
                <span className="font-mono font-bold">{dyn.glucose ?? '--'} mg/dL</span>
              </div>
              <div className="flex items-center justify-between text-slate-700 mt-1">
                <span>Individual Fasting Baseline:</span>
                <span className="font-mono font-bold">{baseline.baseline_glucose || patient.baseline_glucose || 110} mg/dL</span>
              </div>
              <div className="flex items-center justify-between text-teal-700 font-semibold mt-1 pt-1 border-t border-slate-200">
                <span>Personalized Offset:</span>
                <span>{gDev > 0 ? `+${gDev}` : gDev} mg/dL ({gDevPct > 0 ? `+${gDevPct}` : gDevPct}%)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-900 block mb-1">2. Autonomic Stress Coupling:</span>
              <div className="text-slate-600">
                HR elevation of <strong>{hrDev > 0 ? `+${hrDev}` : hrDev} BPM</strong> alongside blunted HRV indicates postprandial sympathetic activation or delayed gastric emptying.
              </div>
            </div>

            <button
              onClick={() => navigate('whatif')}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-sm"
            >
              Simulate Counterfactual Interventions on This Twin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
