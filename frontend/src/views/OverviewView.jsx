import React from 'react';
import {
  Activity,
  Heart,
  TrendingUp,
  AlertCircle,
  Shield,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronRight,
  Sliders
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

export default function OverviewView({ twinState, patientHistory, onNavigate, setCurrentView, onStepSimulation }) {
  const navigate = onNavigate || setCurrentView || (() => {});

  if (!twinState) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 font-medium">
        Loading Digital Twin State...
      </div>
    );
  }

  const patient = twinState.static || twinState.static_profile || {};
  const dyn = twinState.dynamic || twinState.dynamic_state || {};
  const derived = twinState.derived || twinState.derived_state || {};
  const prediction = twinState.prediction || {};
  const explanation = twinState.explanation || {};

  const isSpike = (dyn?.glucose ?? 0) >= 180.0;
  const vel = dyn?.glucose_velocity_15m ?? dyn?.glucose_velocity ?? 0.0;
  const risk = prediction?.risk_score ?? prediction?.spike_probability ?? 0.0;
  const stability = derived?.metabolic_stability ?? 100.0;
  const gDev = derived?.glucose_dev_base ?? 0.0;

  // Chart data formatting: safely extract array whether passed directly or wrapped in { history: [...] }
  const historyList = Array.isArray(patientHistory)
    ? patientHistory
    : Array.isArray(patientHistory?.history)
    ? patientHistory.history
    : [];

  const chartData = historyList.slice(-36).map((item) => {
    const rawTs = item?.timestamp || '';
    const timeStr = rawTs.includes('T') ? rawTs.split('T')[1]?.substring(0, 5) : rawTs.substring(0, 5);
    const glucoseVal = typeof item?.glucose === 'number' ? Number(item.glucose.toFixed(1)) : (Number(item?.glucose) || 0);
    const hrVal = typeof item?.hr === 'number' ? Math.round(item.hr) : (typeof item?.heart_rate === 'number' ? Math.round(item.heart_rate) : 72);

    return {
      time: timeStr || '--:--',
      glucose: glucoseVal,
      hr: hrVal,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Clinical Digital Twin Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Active Digital Twin Session
              </span>
              <span className="text-xs text-slate-400">
                ID: <strong className="text-white">{patient?.patient_id || 'PT-001'}</strong> | {patient?.name || 'Patient'} ({patient?.archetype || 'Standard'})
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1.5 tracking-tight">
              Clinical Decision Support Dashboard
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Anticipating adverse metabolic events 60–120 minutes ahead via continuous multimodal fusion of EHR context, continuous glucose monitoring, and wearable autonomic biometrics.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('whatif')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition shadow-sm"
            >
              <Sliders className="w-4 h-4" />
              <span>Explore What-If Interventions</span>
            </button>
            <button
              onClick={() => navigate('twin')}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs transition"
            >
              <span>Inspect Virtual Twin</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Current Glucose */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current CGM</span>
            <span className={`p-1.5 rounded-lg ${isSpike ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700'}`}>
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {typeof dyn?.glucose === 'number' ? dyn.glucose.toFixed(1) : (dyn?.glucose ?? '--')}
            </span>
            <span className="text-xs font-semibold text-slate-500">mg/dL</span>
          </div>
          <div className="mt-2 flex items-center text-xs">
            <span className={`font-semibold flex items-center mr-1.5 ${gDev >= 0 ? 'text-amber-600' : 'text-teal-600'}`}>
              {gDev >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {gDev > 0 ? `+${gDev}` : gDev} mg/dL
            </span>
            <span className="text-slate-500">vs personal baseline</span>
          </div>
        </div>

        {/* Metric 2: Glycemic Velocity */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate of Change</span>
            <span className={`p-1.5 rounded-lg ${vel > 1.0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-3xl font-bold tracking-tight ${vel > 1.0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {vel > 0 ? `+${vel}` : vel}
            </span>
            <span className="text-xs font-semibold text-slate-500">mg/dL/min</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Acceleration: <strong className="text-slate-700">{dyn?.glucose_acceleration_30m ?? dyn?.glucose_acc_30m ?? 0} mg/dL/min²</strong>
          </div>
        </div>

        {/* Metric 3: Metabolic Stability */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Homeostasis Score</span>
            <span className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
              <Shield className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">{stability}%</span>
            <span className="text-xs font-semibold text-slate-500">Stability</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${stability > 70 ? 'bg-teal-600' : stability > 45 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${stability}%` }}
            />
          </div>
        </div>

        {/* Metric 4: Autonomic Biometrics */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Autonomic State</span>
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Heart className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-3">
            <div>
              <span className="text-2xl font-bold text-slate-900">{typeof dyn?.hr === 'number' ? Math.round(dyn.hr) : (dyn?.heart_rate ?? 72)}</span>
              <span className="text-[10px] text-slate-500 ml-1">BPM</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-slate-900">{typeof dyn?.hrv === 'number' ? Math.round(dyn.hrv) : (dyn?.hrv ?? 45)}</span>
              <span className="text-[10px] text-slate-500 ml-1">ms HRV</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Stress proxy: <strong className="text-slate-700">{derived?.stress_proxy ?? 0.0}</strong>
          </div>
        </div>

        {/* Metric 5: Excursion Forecast */}
        <div className={`rounded-xl border p-4 shadow-sm ${
          prediction?.risk_category === 'CRITICAL' ? 'bg-rose-50 border-rose-300' :
          prediction?.risk_category === 'HIGH' ? 'bg-orange-50 border-orange-300' :
          prediction?.risk_category === 'MEDIUM' ? 'bg-amber-50 border-amber-300' :
          'bg-emerald-50 border-emerald-300'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">60-120m Spike Risk</span>
            <span className="p-1.5 rounded-lg bg-white/80 shadow-sm text-slate-700">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {Math.round(risk * 100)}%
            </span>
            <span className="text-xs font-bold uppercase text-slate-700">{prediction?.risk_category || 'LOW'}</span>
          </div>
          <div className="mt-2 text-xs font-medium text-slate-700 flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1" />
            {prediction?.eta_minutes ? `ETA Spike: ~${prediction.eta_minutes} min` : 'Normal glycemic window'}
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Clinical Decision Support */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live CGM Trajectory Preview */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center">
                <Activity className="w-4 h-4 mr-2 text-teal-600" />
                Live Continuous Glucose Timeline (CGM)
              </h2>
              <p className="text-xs text-slate-500">
                Real-time 5-minute sampling trajectory compared against patient baseline ({patient?.baseline_glucose ?? 115} mg/dL) & acute clinical threshold (180 mg/dL).
              </p>
            </div>
            <button
              onClick={() => navigate('monitoring')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center"
            >
              Full Timeline <ChevronRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <Activity className="w-6 h-6 mb-2 text-slate-400 animate-pulse" />
                <span>Loading continuous glucose telemetry...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <ReferenceLine y={180} stroke="#e11d48" strokeDasharray="4 4" label={{ value: 'Hyperglycemia Threshold (180 mg/dL)', fill: '#e11d48', fontSize: 10, position: 'top' }} />
                  <ReferenceLine y={patient?.baseline_glucose ?? 115} stroke="#0d9488" strokeDasharray="2 2" label={{ value: `Personal Baseline (${patient?.baseline_glucose ?? 115})`, fill: '#0d9488', fontSize: 10, position: 'insideBottomRight' }} />
                  <Line type="monotone" dataKey="glucose" stroke="#0f766e" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right 1 Col: Explainable AI & CDS Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div>
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Explainable AI</span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">Why This Prediction?</h3>
            <p className="text-xs text-slate-500">
              Live tree-based attribution model contributions computed for this observation.
            </p>
          </div>

          {/* Top Risk Factors */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">Key Risk Drivers</span>
            {(explanation?.top_risk_factors || []).map((rf, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-lg bg-rose-50/70 border border-rose-100">
                <span className="font-medium text-slate-800">{rf.label}</span>
                <span className="font-bold text-rose-700">+{rf.attribution_percent}%</span>
              </div>
            ))}
          </div>

          {/* Protective Factors */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wide">Protective Factors</span>
            {(explanation?.top_protective_factors || []).map((pf, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-lg bg-teal-50/70 border border-teal-100">
                <span className="font-medium text-slate-800">{pf.label}</span>
                <span className="font-bold text-teal-700">{pf.attribution_percent}%</span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <div className="font-semibold text-slate-800 mb-0.5 flex items-center">
              <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" />
              Clinical Insight
            </div>
            {explanation?.clinical_interpretation}
          </div>
        </div>
      </div>
    </div>
  );
}
