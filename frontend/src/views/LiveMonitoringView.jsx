import React, { useState } from 'react';
import { 
  Play, Pause, FastForward, RotateCcw, Activity, Heart, 
  Flame, Utensils, AlertTriangle, CheckCircle, TrendingUp, 
  TrendingDown, Minus, Clock, Eye
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  Tooltip, ReferenceLine, CartesianGrid, AreaChart, Area 
} from 'recharts';

export default function LiveMonitoringView({ 
  twinState, 
  patientHistory, 
  isSimulating, 
  onToggleSimulation, 
  onStepSimulation, 
  onResetSimulation,
  loading 
}) {
  const [timeWindow, setTimeWindow] = useState('8h'); // 4h, 8h, 24h
  const [activeSignal, setActiveSignal] = useState('all'); // all, glucose, heart, activity

  if (!twinState) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-900 border border-slate-800 rounded-xl">
        <p className="text-slate-400">Loading physiological stream...</p>
      </div>
    );
  }

  const { dynamic_state, personal_baseline, prediction, derived_state } = twinState;

  // Filter history based on time window
  const getWindowPoints = () => {
    const rawList = Array.isArray(patientHistory)
      ? patientHistory
      : Array.isArray(patientHistory?.history)
      ? patientHistory.history
      : [];
    if (rawList.length === 0) return [];
    const count = timeWindow === '4h' ? 48 : timeWindow === '8h' ? 96 : 288;
    return rawList.slice(-count);
  };

  const chartData = getWindowPoints().map(item => {
    const rawTs = item?.timestamp || '';
    const timeStr = rawTs.includes('T') ? rawTs.split('T')[1]?.slice(0, 5) : rawTs.slice(0, 5);
    return {
      time: timeStr || '--:--',
      glucose: typeof item?.glucose === 'number' ? Number(item.glucose.toFixed(1)) : 0,
      baseline: Number(personal_baseline?.mean_glucose?.toFixed(1) || 115),
      heartRate: Math.round(item?.heart_rate ?? item?.hr ?? 72),
      hrv: Math.round(item?.hrv ?? 45),
      steps: Math.round(item?.steps ?? 0),
      carbs: Math.round(item?.meal_carbs_g ?? item?.meal_carbs ?? 0),
      spikeThreshold: 180
    };
  });

  const getVelocityIcon = (vel) => {
    if (vel > 1.0) return <TrendingUp className="w-5 h-5 text-rose-500 animate-pulse" />;
    if (vel > 0.3) return <TrendingUp className="w-5 h-5 text-amber-500" />;
    if (vel < -1.0) return <TrendingDown className="w-5 h-5 text-emerald-500" />;
    if (vel < -0.3) return <TrendingDown className="w-5 h-5 text-cyan-500" />;
    return <Minus className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Stream Control & Live Telemetry Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSimulating ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isSimulating ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              </span>
              <h2 className="text-xl font-bold text-white tracking-wide">
                Live 5-Minute Telemetry Stream
              </h2>
              <span className="text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md text-slate-300 font-mono">
                {dynamic_state?.timestamp || 'Synchronizing...'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic temporal engine streaming 5-minute multimodal IoT signals into the virtual twin.
            </p>
          </div>

          {/* Interactive Player Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSimulation}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition shadow-md ${
                isSimulating 
                  ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              {isSimulating ? 'Pause Stream' : 'Live Stream'}
            </button>

            <button
              onClick={onStepSimulation}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition"
              title="Advance exactly one 5-minute observation"
            >
              <FastForward className="w-4 h-4 text-cyan-400" />
              <span>+5m Step</span>
            </button>

            <button
              onClick={onResetSimulation}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl border border-slate-700 transition"
              title="Reset simulation to patient step 0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>

            {/* Time Window Buttons */}
            <div className="ml-2 flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              {['4h', '8h', '24h'].map(w => (
                <button
                  key={w}
                  onClick={() => setTimeWindow(w)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    timeWindow === w 
                      ? 'bg-cyan-500 text-slate-950 shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time Telemetry Metrics Pill Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-slate-800">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>CGM Glucose</span>
              {getVelocityIcon(dynamic_state?.glucose_velocity)}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold font-mono ${
                dynamic_state?.glucose >= 180 ? 'text-rose-400' :
                dynamic_state?.glucose >= 140 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {dynamic_state?.glucose?.toFixed(1) || '--'}
              </span>
              <span className="text-xs text-slate-500">mg/dL</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Velocity:</span>
              <span className="font-mono text-slate-300">{dynamic_state?.glucose_velocity > 0 ? '+' : ''}{dynamic_state?.glucose_velocity?.toFixed(2)} mg/dL/m</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Heart Rate</span>
              <Heart className="w-4 h-4 text-rose-400 animate-pulse" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-white">
                {Math.round(dynamic_state?.heart_rate || 0)}
              </span>
              <span className="text-xs text-slate-500">BPM</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Deviation:</span>
              <span className="font-mono text-slate-300">
                {derived_state?.hr_deviation_pct > 0 ? '+' : ''}{derived_state?.hr_deviation_pct?.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>HRV (RMSSD)</span>
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-white">
                {Math.round(dynamic_state?.hrv || 0)}
              </span>
              <span className="text-xs text-slate-500">ms</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Baseline:</span>
              <span className="font-mono text-slate-300">{Math.round(personal_baseline?.mean_hrv || 0)} ms</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Step Count (5m)</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-white">
                {Math.round(dynamic_state?.steps || 0)}
              </span>
              <span className="text-xs text-slate-500">steps</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Intensity:</span>
              <span className="font-mono capitalize text-slate-300">{dynamic_state?.activity_intensity || 'rest'}</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Meal Ingestion</span>
              <Utensils className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold font-mono ${dynamic_state?.meal_carbs_g > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {Math.round(dynamic_state?.meal_carbs_g || 0)}
              </span>
              <span className="text-xs text-slate-500">g carbs</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Absorption:</span>
              <span className="font-mono text-slate-300">{dynamic_state?.meal_carbs_g > 0 ? 'Active' : 'Fasting'}</span>
            </div>
          </div>

          <div className={`p-3 rounded-xl border ${
            prediction?.spike_probability >= 0.5 
              ? 'bg-rose-950/40 border-rose-800' 
              : prediction?.spike_probability >= 0.25 
              ? 'bg-amber-950/40 border-amber-800' 
              : 'bg-emerald-950/40 border-emerald-800'
          }`}>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Spike Risk (60-120m)</span>
              {prediction?.spike_probability >= 0.5 ? (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold font-mono ${
                prediction?.spike_probability >= 0.5 ? 'text-rose-400' :
                prediction?.spike_probability >= 0.25 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {(prediction?.spike_probability * 100).toFixed(0)}%
              </span>
              <span className="text-xs uppercase font-semibold text-slate-400">
                {prediction?.risk_tier}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Expected Peak:</span>
              <span className="font-mono text-slate-200">~{prediction?.projected_peak_mgdl || 135} mg/dL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Signal Visualizer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Continuous Glucose Monitor (CGM) & Patient Baseline
            </h3>
            <p className="text-xs text-slate-400">
              Yellow dashed line = Patient's learned resting baseline ({Math.round(personal_baseline?.mean_glucose || 115)} mg/dL). 
              Red dashed line = Clinical excursion spike threshold (180 mg/dL).
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-3 h-0.5 bg-cyan-400 inline-block"></span> CGM Glucose
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-0.5 bg-amber-400 border-dashed inline-block"></span> Baseline
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-3 h-0.5 bg-rose-400 border-dashed inline-block"></span> 180 mg/dL Threshold
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cgmGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" domain={[60, 260]} tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                formatter={(val, name) => [`${val} mg/dL`, name === 'glucose' ? 'CGM Glucose' : name === 'baseline' ? 'Personal Baseline' : name]}
              />
              <ReferenceLine y={180} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'Spike Threshold (180 mg/dL)', fill: '#f43f5e', fontSize: 10, position: 'top' }} />
              <ReferenceLine y={personal_baseline?.mean_glucose || 115} stroke="#f59e0b" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="glucose" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#cgmGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Synchronized Wearable Sensor Streams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heart Rate & HRV Stream */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-rose-400" />
            Autonomic Stress Response (HR & HRV RMSSD)
          </h4>
          <p className="text-xs text-slate-400 mb-4">
            Correlated with sympathetic activation, acute cortisol spikes, and postprandial vascular response.
          </p>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" domain={[40, 130]} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px' }} />
                <Line type="monotone" dataKey="heartRate" stroke="#f43f5e" strokeWidth={1.5} dot={false} name="Heart Rate (BPM)" />
                <Line type="monotone" dataKey="hrv" stroke="#818cf8" strokeWidth={1.5} dot={false} name="HRV (ms)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Steps & Meal Carbs Stream */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
            <Utensils className="w-4 h-4 text-amber-400" />
            Behavioral Exogenous Ingestion & Steps Activity
          </h4>
          <p className="text-xs text-slate-400 mb-4">
            Exogenous carbohydrate influx into Bateman gut absorption model alongside muscular glucose uptake.
          </p>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px' }} />
                <Line type="step" dataKey="carbs" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3, fill: '#fbbf24' }} name="Meal Carbs (g)" />
                <Line type="monotone" dataKey="steps" stroke="#34d399" strokeWidth={1.5} dot={false} name="Steps (5m)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
