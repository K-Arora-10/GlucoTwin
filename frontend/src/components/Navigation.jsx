import React from 'react';
import {
  Activity,
  Users,
  Cpu,
  LineChart,
  AlertTriangle,
  Sliders,
  Award,
  Database,
  ShieldCheck,
  Info,
  Clock,
  Play,
  Pause,
  RotateCcw,
  FastForward
} from 'lucide-react';

export default function Navigation({
  currentView,
  setCurrentView,
  patients,
  selectedPatientId,
  setSelectedPatientId,
  twinState,
  isSimulating,
  setIsSimulating,
  onResetSimulation,
  onStepSimulation
}) {
  const selectedPatient = (patients || []).find((p) => p.patient_id === selectedPatientId);
  const spikeProb = twinState?.prediction?.spike_probability ?? 0.05;
  const riskTier = twinState?.prediction?.risk_tier || 'LOW';

  const getRiskBadge = (tier) => {
    switch (tier?.toUpperCase()) {
      case 'HIGH':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      case 'MODERATE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'patients', label: 'Patient Profiles', icon: Users },
    { id: 'twin', label: 'Digital Twin', icon: Cpu },
    { id: 'monitoring', label: 'Live Telemetry', icon: LineChart },
    { id: 'predictions', label: 'Spike Predictions', icon: AlertTriangle },
    { id: 'whatif', label: 'What-If Simulator', icon: Sliders },
    { id: 'evaluation', label: 'ML Evaluation', icon: Award },
    { id: 'data', label: 'Data Explorer', icon: Database },
    { id: 'health', label: 'System Health', icon: ShieldCheck },
    { id: 'about', label: 'Methodology & SaMD', icon: Info },
  ];

  return (
    <header className="bg-slate-950/95 border-b border-slate-800/80 sticky top-0 z-50 backdrop-blur-md shadow-2xl">
      {/* Top Clinical Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Product Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('overview')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-tight text-white">GlucoTwin</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  PoC 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Personalized Metabolic Digital Twin</p>
            </div>
          </div>

          {/* Center: Live Simulation Controls */}
          <div className="hidden md:flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 flex items-center mr-2">
              <Clock className="w-3.5 h-3.5 mr-1 text-cyan-400" />
              Temporal Engine:
            </span>
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                isSimulating ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isSimulating ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Stream</span>
                </>
              )}
            </button>
            <button
              onClick={onStepSimulation}
              disabled={isSimulating}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition"
              title="Advance timeline by 5 minutes"
            >
              +5 min
            </button>
            <button
              onClick={onResetSimulation}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Reset Timeline to step 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: Active Monitored Patient Selector & Dynamic Risk Badge */}
          <div className="flex items-center space-x-4">
            <div className="flex flex-col text-right">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Active Patient:</span>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="text-xs font-bold text-white bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                >
                  {(patients || []).map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.patient_id}: {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                HbA1c: <strong className="text-white">{selectedPatient?.hba1c}%</strong> | Baseline:{' '}
                <strong className="text-white">{Math.round(twinState?.personal_baseline?.mean_glucose || 115)} mg/dL</strong>
              </div>
            </div>

            {/* Dynamic Adverse Risk Badge */}
            <div
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border text-xs font-bold ${getRiskBadge(
                riskTier
              )}`}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              <span>{riskTier} RISK</span>
              <span>({Math.round(spikeProb * 100)}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <nav className="bg-slate-950/80 border-t border-slate-900 px-2 sm:px-4 lg:px-8">
        <div className="max-w-7xl mx-auto flex space-x-0.5 sm:space-x-1 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2 lg:px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
