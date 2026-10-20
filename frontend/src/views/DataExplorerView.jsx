import React, { useState } from 'react';
import { Database, Search, Filter, BookOpen, Layers, CheckCircle } from 'lucide-react';

export default function DataExplorerView({ patients, onSelectPatient, selectedPatientId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');

  const filteredPatients = (patients || []).filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.comorbidities?.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = riskFilter === 'ALL' || p.risk_category === riskFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                <Database className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white">
                Cohort Dataset Explorer & Physiological Architecture
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Generated via physiologically grounded differential equations (Bergman Minimal Model + Bateman 2-Compartment Gut Dynamics). 
              No private health data, zero privacy compliance barriers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-lg font-mono">
              Cohort: 100 Patients
            </span>
            <span className="text-xs px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg font-mono">
              Observations: 403,200 Steps
            </span>
          </div>
        </div>
      </div>

      {/* Physiological Model Foundations Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Layers className="w-4 h-4" />
            1. Bergman Minimal Model
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 mb-2">
            dG/dt = -(p1 + X)G + p1*Gb + Ra(t)<br/>
            dX/dt = -p2*X + p3*(I - Ib)
          </p>
          <p className="text-[11px] text-slate-400">
            Captures insulin-dependent and insulin-independent glucose disposal in systemic plasma.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
            <BookOpen className="w-4 h-4" />
            2. Bateman Gut Model
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 mb-2">
            Ra(t) = D * (ka * ke) / (ke - ka) * [exp(-ka*t) - exp(-ke*t)]
          </p>
          <p className="text-[11px] text-slate-400">
            Calculates dual-compartment gastric emptying and intestinal carbohydrate absorption flux.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <CheckCircle className="w-4 h-4" />
            3. Circadian & Autonomic
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 mb-2">
            Dawn Phenomenon: sin(2π(t-4)/24)<br/>
            HR Stress Proxy: 100 - (HRV/2)
          </p>
          <p className="text-[11px] text-slate-400">
            Simulates diurnal cortisol pulses, sleeping baselines, and sympathetic tone modulation.
          </p>
        </div>
      </div>

      {/* Cohort Explorer Filter & Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-base font-bold text-white">Cohort Registry ({filteredPatients.length} Active Profiles)</h3>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by ID, name, diagnosis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-64"
              />
            </div>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="Low">Low Risk</option>
              <option value="Moderate">Moderate Risk</option>
              <option value="High">High Risk</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-4 font-semibold">Patient ID</th>
                <th className="py-3 px-4 font-semibold">Demographics</th>
                <th className="py-3 px-4 font-semibold font-mono">HbA1c</th>
                <th className="py-3 px-4 font-semibold">Diabetes Duration</th>
                <th className="py-3 px-4 font-semibold">Primary Medications</th>
                <th className="py-3 px-4 font-semibold">Risk State</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredPatients.map(p => (
                <tr 
                  key={p.patient_id}
                  className={`hover:bg-slate-800/40 transition cursor-pointer ${
                    selectedPatientId === p.patient_id ? 'bg-cyan-950/20' : ''
                  }`}
                  onClick={() => onSelectPatient(p.patient_id)}
                >
                  <td className="py-3 px-4 font-mono font-bold text-cyan-400">{p.patient_id}</td>
                  <td className="py-3 px-4 text-slate-300">{p.age}y {p.sex}, BMI {p.bmi}</td>
                  <td className="py-3 px-4 font-mono font-bold text-white">{p.hba1c}%</td>
                  <td className="py-3 px-4 text-slate-400">{p.diabetes_duration_years} years</td>
                  <td className="py-3 px-4 text-slate-300">{p.medications?.join(', ') || 'None'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      p.risk_category === 'High' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      p.risk_category === 'Moderate' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {p.risk_category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onSelectPatient(p.patient_id); }}
                      className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/30 text-cyan-300 rounded text-xs transition"
                    >
                      Load Twin
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
