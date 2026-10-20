import React from 'react';
import { 
  HeartHandshake, ShieldAlert, Sparkles, BookOpen, 
  Layers, CheckCircle2, UserCheck, Stethoscope
} from 'lucide-react';

export default function AboutView() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold rounded-full uppercase tracking-wider">
            Happiest Health Digital Twin Challenge 2026
          </span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
          GlucoTwin — Personalized Metabolic Digital Twin
        </h1>
        <p className="text-base text-cyan-200/80 font-medium italic mt-2">
          "Anticipate metabolic risk. Understand the patient. Explore safer possibilities."
        </p>
        <p className="text-xs text-slate-300 mt-4 leading-relaxed max-w-3xl">
          GlucoTwin combines static Electronic Health Record (EHR) profiles with 5-minute dynamic wearable and Continuous Glucose Monitor (CGM) IoT telemetry into an evolving virtual replica of human metabolism. It predicts postprandial glucose spikes 60–120 minutes before onset, explains the risk drivers via Explainable AI, and enables doctors and patients to simulate counterfactual "What-If" lifestyle interventions in real time.
        </p>
      </div>

      {/* Digital Twin vs Standard ML Differentiation Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          The Fundamental Shift: Why GlucoTwin is a True Digital Twin
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-slate-950 p-5 rounded-xl border border-rose-900/40 space-y-2">
            <h3 className="text-sm font-bold text-rose-400">Traditional Machine Learning App</h3>
            <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
              <li>Stateless point-in-time classification.</li>
              <li>Generic population thresholds (e.g. "HR &gt; 90 is high").</li>
              <li>Ignores individual glycemic setpoints and baseline physiology.</li>
              <li>Fires alerts reactively when glucose already crosses 180 mg/dL.</li>
              <li>Passive prediction with zero counterfactual intervention capability.</li>
            </ul>
          </div>

          <div className="bg-slate-950 p-5 rounded-xl border border-emerald-900/40 space-y-2">
            <h3 className="text-sm font-bold text-emerald-400">GlucoTwin Virtual Digital Twin</h3>
            <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
              <li>Continuously synchronized state engine updating every 5 minutes.</li>
              <li>Calculates deviations from personalized multi-day baselines.</li>
              <li>Fuses EHR medical history with acute wearable and gut dynamics.</li>
              <li>Predicts threshold crossing 60–120 minutes ahead (median lead: 70 min).</li>
              <li>Interactive counterfactual "What-If" branch simulation in real-time.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Clinical Foundations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Stethoscope className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">The Clinical Problem</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Postprandial glycemic excursions (&ge;180 mg/dL) generate acute oxidative stress, endothelial dysfunction, and long-term microvascular complications (retinopathy, neuropathy, nephropathy). Standard commercial continuous glucose monitors (CGM) alert patients only after glucose has already spiked. By this time, vascular damage has already commenced.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            By predicting excursions 70 minutes ahead, GlucoTwin provides a decisive clinical window to execute a simple, non-pharmacological action (e.g. 15-minute walk or delayed carb ingestion) that suppresses peak glycemic excursion before it starts.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Responsible AI & Clinical Governance</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            GlucoTwin is designed under Software as a Medical Device (SaMD) principles as a Clinical Decision Support (CDS) system. 
          </p>
          <div className="space-y-2 pt-1 text-xs text-slate-400">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Human-in-the-Loop:</strong> All recommendations support, rather than override, clinician judgment.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Privacy-by-Design:</strong> Zero private Protected Health Information (PHI) required; operates locally.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Explainable Attributions:</strong> Every prediction surfaces top driving features to eliminate black-box risk.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Regulatory & Safety Disclaimer */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 text-[11px] leading-relaxed">
        <strong className="text-slate-300">Regulatory Disclaimer:</strong> GlucoTwin is a research prototype developed for the Happiest Health Digital Twin Challenge 2026. It is designed to demonstrate advanced multimodal physiological digital twinning techniques and is not currently cleared by the FDA or CE for direct diagnostic or therapeutic decision-making. All patient data presented in this demonstration is generated via mathematical simulation models (Bergman minimal model) and does not represent real individuals.
      </div>
    </div>
  );
}
