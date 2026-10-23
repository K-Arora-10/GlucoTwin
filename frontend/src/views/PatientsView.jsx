import React, { useState } from 'react';
import { Users, Search, CheckCircle2, Shield, Heart, Activity, AlertTriangle, Pill } from 'lucide-react';

export default function PatientsView({ patients = [], selectedPatientId, setSelectedPatientId, onSelectPatient }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArchetype, setSelectedArchetype] = useState('ALL');

  const handleSelect = onSelectPatient || setSelectedPatientId || (() => {});
  const patientList = Array.isArray(patients) ? patients : (patients?.patients || []);

  const archetypes = ['ALL', 'Stable Diabetic', 'High-Risk Diabetic', 'Sleep-Deprived & Stress-Reactive', 'High Activity / Well-Compensated', 'Complex Multi-Morbidity & Sensor Dropout'];

  const filteredPatients = patientList.filter((p) => {
    const matchesSearch =
      (p?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p?.patient_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p?.archetype || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArch = selectedArchetype === 'ALL' || p?.archetype === selectedArchetype;
    return matchesSearch && matchesArch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center">
              <Users className="w-5 h-5 mr-2 text-teal-600" />
              Synthetic Patient Directory (100 Cohort Profiles)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Select any patient to instantly bind the live Digital Twin state engine, physiological timeline, and What-If simulator.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient ID, name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50"
              />
            </div>

            {/* Archetype Filter */}
            <select
              value={selectedArchetype}
              onChange={(e) => setSelectedArchetype(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 w-full sm:w-auto"
            >
              {archetypes.map((a) => (
                <option key={a} value={a}>
                  {a === 'ALL' ? 'All Clinical Archetypes' : a}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Patient Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPatients.map((p) => {
          const isSelected = p.patient_id === selectedPatientId;
          return (
            <div
              key={p.patient_id}
              className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between shadow-sm ${
                isSelected
                  ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {p.patient_id}
                      </span>
                      <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                        {p.archetype}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-1">{p.name}</h2>
                  </div>

                  {isSelected && (
                    <span className="flex items-center text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                  {p.description}
                </p>

                {/* Clinical Biometric Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-slate-50 rounded-xl text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">HbA1c</span>
                    <span className={`font-bold text-sm ${p.HbA1c >= 8.0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {p.HbA1c}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">BMI</span>
                    <span className="font-bold text-sm text-slate-800">{p.BMI}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Duration</span>
                    <span className="font-bold text-sm text-slate-800">{p.diabetes_duration_years} yrs</span>
                  </div>
                </div>

                {/* Baseline Vitals */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600 px-1">
                  <div className="flex items-center">
                    <Activity className="w-3.5 h-3.5 mr-1 text-teal-600" />
                    <span>Base G: <strong>{p.baseline_glucose} mg/dL</strong></span>
                  </div>
                  <div className="flex items-center">
                    <Heart className="w-3.5 h-3.5 mr-1 text-rose-500" />
                    <span>Base HR: <strong>{p.baseline_hr} BPM</strong></span>
                  </div>
                </div>

                {/* Medications List */}
                <div className="mt-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center">
                    <Pill className="w-3 h-3 mr-1" />
                    Medications:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(p.medications || []).map((med, mIdx) => (
                      <span key={mIdx} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {med}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleSelect(p.patient_id)}
                  disabled={isSelected}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                    isSelected
                      ? 'bg-teal-50 text-teal-700 cursor-default'
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Monitored in Digital Twin</span>
                    </>
                  ) : (
                    <span>Select for Virtual Twin Monitoring</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
