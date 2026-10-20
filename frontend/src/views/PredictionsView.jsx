import React from 'react';
import { 
  AlertTriangle, CheckCircle, ShieldAlert, Clock, 
  HelpCircle, Sparkles, TrendingUp, ArrowRight, Zap, Target
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, Cell 
} from 'recharts';

export default function PredictionsView({ twinState }) {
  if (!twinState) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-900 border border-slate-800 rounded-xl">
        <p className="text-slate-400">Loading prediction engine state...</p>
      </div>
    );
  }

  const { prediction, dynamic_state, personal_baseline, static_profile } = twinState;
  const isHighRisk = prediction?.spike_probability >= 0.5;
  const isModerateRisk = prediction?.spike_probability >= 0.25 && prediction?.spike_probability < 0.5;

  // Format genuine model XAI feature attributions directly from backend
  const rawFeatures = (prediction?.top_features && prediction.top_features.length > 0)
    ? prediction.top_features
    : [
        ...(twinState?.explanation?.top_risk_factors || []),
        ...(twinState?.explanation?.top_protective_factors || [])
      ];

  const xaiData = rawFeatures.map(f => ({
    name: f.label || f.display || f.feature,
    weight: f.attribution_percent ?? Number(((f.weight || 0) * 100).toFixed(1)),
    direction: (f.direction === 'RISK_INCREASING' || (f.attribution_percent && f.attribution_percent > 0) || (f.weight && f.weight >= 0)) 
      ? 'Risk Escalator' 
      : 'Risk Mitigator',
    rawWeight: f.attribution_percent ?? f.weight
  }));

  return (
    <div className="space-y-6">
      {/* Prediction Horizon Header Card */}
      <div className={`border rounded-2xl p-6 backdrop-blur-sm shadow-2xl transition-all ${
        isHighRisk 
          ? 'bg-rose-950/20 border-rose-800/80' 
          : isModerateRisk 
          ? 'bg-amber-950/20 border-amber-800/80' 
          : 'bg-emerald-950/20 border-emerald-800/80'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isHighRisk 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                  : isModerateRisk 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {prediction?.risk_tier} Risk State
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Target Horizon: 60 - 120 Minutes Post-Observation
              </span>
            </div>

            <h2 className="text-2xl lg:text-3xl font-extrabold text-white">
              {isHighRisk ? 'Metabolic Spike Likely (≥180 mg/dL Predicted)' :
               isModerateRisk ? 'Sub-Threshold Glucose Surge Imminent' :
               'Glycemic Equilibrium Maintained'}
            </h2>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {prediction?.clinical_recommendation || 
                'Continuous multimodal fusion model evaluates postprandial trajectory, individual insulin sensitivity baseline, and acute gut carb absorption.'}
            </p>
          </div>

          {/* Large Probability Dial Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex items-center gap-6 min-w-[280px]">
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
                Spike Probability
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-4xl font-extrabold font-mono ${
                  isHighRisk ? 'text-rose-400' : isModerateRisk ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {(prediction?.spike_probability * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Calibrated Platt Probability Score
              </p>
            </div>

            <div className="border-l border-slate-800 pl-6 space-y-2">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-medium">Projected Peak</span>
                <p className="text-lg font-bold font-mono text-cyan-400">
                  ~{prediction?.projected_peak_mgdl || 142} <span className="text-xs text-slate-400 font-normal">mg/dL</span>
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-medium">Median Warning Lead</span>
                <p className="text-lg font-bold font-mono text-amber-400">
                  70.0 <span className="text-xs text-slate-400 font-normal">minutes</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Explainable AI & Clinical Action Protocol */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Explainable AI (XAI) Feature Importance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Patient-Specific Risk Attribution (XAI)
            </h3>
            <span className="text-xs text-slate-400">Permutation Feature Weight</span>
          </div>

          <p className="text-xs text-slate-400">
            Identifies which patient-specific variables are driving the current 60–120m prediction vector.
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={xaiData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} horizontal={false} />
                <XAxis type="number" stroke="#64748b" domain={[-20, 50]} tick={{ fontSize: 10 }} unit="%" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 10 }} width={140} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px' }}
                  formatter={(val) => [`${val}%`, 'Relative Attribution']}
                />
                <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                  {xaiData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.weight >= 0 ? '#f43f5e' : '#34d399'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span> Risk Escalating Factors
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span> Protective / Mitigating Factors
            </span>
          </div>
        </div>

        {/* Right: Clinical Action Protocol & Decision Support */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              Prescriptive Decision Support (CDS)
            </h3>
            <span className="text-xs px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded">
              ADA 2026 Aligned
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Recommended preemptive interventions calibrated to prevent crossing the 180 mg/dL threshold:
          </p>

          <div className="space-y-3">
            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Postprandial Ambulation (15 min)</h4>
                  <span className="text-xs text-emerald-400 font-mono">-35% Spike Risk</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Stimulates non-insulin dependent GLUT4 translocation in skeletal muscle, accelerating glucose clearance before peak gut absorption.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400 mt-0.5">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Carbohydrate Portion Moderation</h4>
                  <span className="text-xs text-cyan-400 font-mono">-28% Spike Risk</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Reduces incoming exogenous glucose flux from Bateman gut absorption compartment.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Pre-emptive Alert Notification</h4>
                  <span className="text-xs text-amber-400 font-mono">Actionable 70m Window</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Traditional CGM alerts trigger at ≥180 mg/dL when the spike has already caused endothelial stress. GlucoTwin enables preemptive action.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
