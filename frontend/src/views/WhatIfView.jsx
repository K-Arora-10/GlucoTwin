import React, { useState, useEffect } from 'react';
import { 
  Sliders, ArrowRight, CheckCircle2, AlertTriangle, 
  Sparkles, Footprints, Utensils, Moon, RefreshCw, Zap,
  AlertCircle
} from 'lucide-react';
import { runWhatIfSimulation } from '../api';

export default function WhatIfView({ twinState, patientId }) {
  const [walkMinutes, setWalkMinutes] = useState(20);
  const [carbReductionPct, setCarbReductionPct] = useState(30);
  const [sleepBonusHours, setSleepBonusHours] = useState(1.0);
  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Trigger what-if simulation when inputs change
  const executeSimulation = async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await runWhatIfSimulation(patientId, {
        walk_minutes: Number(walkMinutes),
        carb_reduction_percent: Number(carbReductionPct),
        carb_reduction_pct: Number(carbReductionPct),
        sleep_boost: Number(sleepBonusHours) > 0,
        sleep_bonus_hours: Number(sleepBonusHours)
      });
      setSimResult(res);
    } catch (err) {
      console.error('What-If simulation failed:', err);
      setError(err.message || 'Failed to execute counterfactual simulation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeSimulation();
  }, [patientId, walkMinutes, carbReductionPct, sleepBonusHours]);

  if (!twinState) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-900 border border-slate-800 rounded-xl">
        <p className="text-slate-400">Loading counterfactual simulator...</p>
      </div>
    );
  }

  // Model-driven baseline and simulated values strictly from backend inference
  const baselineProb = simResult?.baseline_risk ?? (twinState?.prediction?.spike_probability ?? 0.0);
  const simProb = simResult?.simulated_risk ?? null;
  const baselinePeak = simResult?.baseline_projected_peak_mgdl ?? (twinState?.prediction?.projected_peak_mgdl ?? Math.round(twinState?.dynamic_state?.glucose || 120));
  const simPeak = simResult?.simulated_projected_peak_mgdl ?? null;

  // Exact model-driven risk delta and direction (never clamped)
  const riskDelta = simResult?.risk_delta !== undefined 
    ? simResult.risk_delta 
    : (simProb !== null ? Number((simProb - baselineProb).toFixed(4)) : 0.0);

  const riskDirection = simResult?.risk_direction || (
    riskDelta < -0.0001 ? 'DECREASED' : (riskDelta > 0.0001 ? 'INCREASED' : 'UNCHANGED')
  );

  const relativePct = simResult?.relative_change_percent !== undefined
    ? Math.abs(simResult.relative_change_percent)
    : (baselineProb > 0 && simProb !== null ? Math.abs(Math.round(((simProb - baselineProb) / baselineProb) * 100)) : 0);

  return (
    <div className="space-y-6">
      {/* Simulation Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                <Sliders className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white">
                Counterfactual Intervention Simulator ("What-If" Engine)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Simulate preemptive lifestyle modifications before peak glucose absorption occurs. 
              The digital twin re-runs inference through the trained multimodal model to evaluate averted risk.
            </p>
          </div>
          <button
            onClick={executeSimulation}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-compute Twin</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 rounded-xl flex items-center justify-between text-rose-300 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-semibold">Inference Engine Error</p>
              <p className="text-xs text-rose-400/80">{error}</p>
            </div>
          </div>
          <button 
            onClick={executeSimulation}
            className="px-3 py-1 bg-rose-800/60 hover:bg-rose-700/80 rounded-lg text-xs font-semibold text-white transition"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Intervention Sliders */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Configurable Preemptive Actions
          </h3>

          {/* Slider 1: Post-Meal Walk */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300 font-medium flex items-center gap-2">
                <Footprints className="w-4 h-4 text-emerald-400" />
                Post-Meal Brisk Walk
              </span>
              <span className="text-emerald-400 font-mono font-bold">{walkMinutes} minutes</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="45" 
              step="5"
              value={walkMinutes}
              onChange={(e) => setWalkMinutes(e.target.value)}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0 min (Sedentary)</span>
              <span>15 min (Light)</span>
              <span>30 min (Moderate)</span>
              <span>45 min (Extended)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Increases immediate muscle GLUT4 translocation, dropping glucose rate of rise.
            </p>
          </div>

          {/* Slider 2: Carbohydrate Reduction */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300 font-medium flex items-center gap-2">
                <Utensils className="w-4 h-4 text-cyan-400" />
                Meal Carbohydrate Reduction
              </span>
              <span className="text-cyan-400 font-mono font-bold">{carbReductionPct}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="60" 
              step="5"
              value={carbReductionPct}
              onChange={(e) => setCarbReductionPct(e.target.value)}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0% (As Ingested)</span>
              <span>20% (Portion Control)</span>
              <span>40% (Low Glycemic)</span>
              <span>60% (Keto/Salad)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Directly attenuates the Bateman two-compartment intestinal glucose flux rate.
            </p>
          </div>

          {/* Slider 3: Sleep & Autonomic Recovery */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300 font-medium flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-400" />
                Sleep Optimization & Stress Relief
              </span>
              <span className="text-indigo-400 font-mono font-bold">+{sleepBonusHours}h Sleep</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="2.5" 
              step="0.5"
              value={sleepBonusHours}
              onChange={(e) => setSleepBonusHours(e.target.value)}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>+0h (Normal)</span>
              <span>+1h (Restorative)</span>
              <span>+2h (Full Recovery)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Lowers sympathetic tone (HRV increases, baseline cortisol resistance drops).
            </p>
          </div>

          {/* Model Modification Audit Log */}
          {simResult?.modified_features && simResult.modified_features.length > 0 && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Simulated Feature Perturbations
              </span>
              {simResult.modified_features.map((mod, idx) => (
                <div key={idx} className="text-slate-300 flex items-start gap-1.5">
                  <span className="text-cyan-400">&bull;</span>
                  <span>{mod}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Comparative Twin State: Actual vs Counterfactual */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Comparative Digital Twin Outcome
              </h3>
              {loading && (
                <span className="text-xs text-indigo-400 flex items-center gap-1.5 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Re-evaluating ML Model...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Baseline Branch */}
              <div className="bg-slate-950/80 border border-rose-900/40 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                    Current Baseline Trajectory
                  </span>
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold rounded">
                    Unintervened
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Predicted Spike Probability</p>
                  <p className="text-3xl font-bold font-mono text-rose-400">
                    {(baselineProb * 100).toFixed(1)}%
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Projected Peak:</span>
                    <span className="font-mono text-white font-bold">{baselinePeak} mg/dL</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Clinical Status:</span>
                    <span className="font-medium text-rose-400">
                      {baselinePeak >= 180 ? 'Excursion ≥180 Expected' : 'Sub-threshold Trajectory'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Counterfactual Branch */}
              <div className={`bg-slate-950/80 rounded-xl p-5 space-y-3 border transition-colors ${
                riskDirection === 'DECREASED'
                  ? 'border-emerald-900/60'
                  : riskDirection === 'INCREASED'
                  ? 'border-rose-900/60'
                  : 'border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${
                    riskDirection === 'DECREASED'
                      ? 'text-emerald-400'
                      : riskDirection === 'INCREASED'
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}>
                    Simulated Twin Scenario
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                    riskDirection === 'DECREASED'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : riskDirection === 'INCREASED'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {riskDirection === 'DECREASED' ? 'Risk Reduced' : (riskDirection === 'INCREASED' ? 'Risk Elevated' : 'Unchanged')}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Predicted Spike Probability</p>
                  <p className={`text-3xl font-bold font-mono ${
                    riskDirection === 'DECREASED'
                      ? 'text-emerald-400'
                      : riskDirection === 'INCREASED'
                      ? 'text-rose-400'
                      : 'text-slate-200'
                  }`}>
                    {simProb !== null ? `${(simProb * 100).toFixed(1)}%` : '--'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Projected Peak:</span>
                    <span className="font-mono text-white font-bold">
                      {simPeak !== null ? `${simPeak} mg/dL` : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Clinical Status:</span>
                    <span className={`font-medium ${
                      riskDirection === 'DECREASED'
                        ? 'text-emerald-400'
                        : riskDirection === 'INCREASED'
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}>
                      {riskDirection === 'DECREASED'
                        ? (simPeak !== null && simPeak < 180 ? 'Spike Averted (<180 mg/dL)' : 'Attenuated Severity')
                        : riskDirection === 'INCREASED'
                        ? (simPeak !== null && simPeak >= 180 ? 'Excursion Escalated (≥180 mg/dL)' : 'Elevated Risk Trajectory')
                        : (simPeak !== null && simPeak >= 180 ? 'Excursion Trajectory Unchanged' : 'Stable Glycemic Trajectory')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Impact Metric Banner (Never clamped, handles Decreased, Increased, and Unchanged) */}
            {riskDirection === 'DECREASED' && (
              <div className="mt-5 p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Counterfactual Efficacy: -{relativePct}% Relative Risk Reduction
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Model projects risk reduction from {(baselineProb * 100).toFixed(1)}% to {(simProb * 100).toFixed(1)}% (Δ {(riskDelta * 100).toFixed(1)}%).
                      {simPeak !== null && baselinePeak > simPeak
                        ? ` Projected peak lowered by ${Math.max(0, Math.round(baselinePeak - simPeak))} mg/dL.`
                        : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {riskDirection === 'INCREASED' && (
              <div className="mt-5 p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Elevated Excursion Risk: +{relativePct}% Relative Risk Increase
                    </h4>
                    <p className="text-xs text-rose-200 mt-0.5">
                      Simulated parameters elevate predicted spike risk from {(baselineProb * 100).toFixed(1)}% to {(simProb * 100).toFixed(1)}% (+{(riskDelta * 100).toFixed(1)}%).
                      {simPeak !== null && simPeak > baselinePeak
                        ? ` Projected peak rises by ${Math.max(0, Math.round(simPeak - baselinePeak))} mg/dL.`
                        : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {riskDirection === 'UNCHANGED' && (
              <div className="mt-5 p-4 bg-slate-800/60 border border-slate-700 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-700/60 rounded-lg text-slate-300">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Counterfactual Result: Risk Unchanged (0.0% Delta)
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Current simulated parameters produce an identical predicted risk score ({(baselineProb * 100).toFixed(1)}%). Adjust intervention sliders to simulate physiological impact.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Scientific & Clinical Disclaimer */}
            <div className="mt-4 p-3 bg-slate-950/80 border border-slate-800/70 rounded-xl text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-slate-300">Clinical Decision Support Note:</strong> Counterfactual predictions reflect outputs of the calibrated digital twin model given hypothetical physiological inputs. They are intended for lifestyle guidance exploration and do not constitute prescriptive clinical therapy or guaranteed biological outcomes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
