import React, { useState, useEffect, useRef } from 'react';
import Navigation from './components/Navigation';
import OverviewView from './views/OverviewView';
import PatientsView from './views/PatientsView';
import DigitalTwinView from './views/DigitalTwinView';
import LiveMonitoringView from './views/LiveMonitoringView';
import PredictionsView from './views/PredictionsView';
import WhatIfView from './views/WhatIfView';
import EvaluationView from './views/EvaluationView';
import DataExplorerView from './views/DataExplorerView';
import SystemHealthView from './views/SystemHealthView';
import AboutView from './views/AboutView';
import { 
  getPatients, 
  getDigitalTwinState, 
  getPatientHistory, 
  tickSimulation,
  resetPatientSimulation,
  getCohortStats 
} from './api';

export default function App() {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [twinState, setTwinState] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);
  const [cohortStats, setCohortStats] = useState(null);
  const [currentView, setCurrentView] = useState('overview');
  const [isSimulating, setIsSimulating] = useState(false);
  const [loading, setLoading] = useState(true);

  const simulationRef = useRef(null);

  // Initial load: Fetch patients and cohort stats
  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);
        const [patientsData, statsData] = await Promise.all([
          getPatients(),
          getCohortStats().catch(() => null)
        ]);

        if (patientsData && patientsData.patients) {
          setPatients(patientsData.patients);
          if (patientsData.patients.length > 0) {
            setSelectedPatientId(patientsData.patients[0].patient_id);
          }
        }
        setCohortStats(statsData);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  // When selectedPatientId changes, fetch their twin state and historical stream
  useEffect(() => {
    if (!selectedPatientId) return;

    async function loadPatientTwin() {
      try {
        const [state, history] = await Promise.all([
          getDigitalTwinState(selectedPatientId),
          getPatientHistory(selectedPatientId, 288) // last 24 hours of 5-min steps
        ]);
        setTwinState(state);
        setPatientHistory(history);
      } catch (err) {
        console.error(`Failed to load twin for ${selectedPatientId}:`, err);
      }
    }
    loadPatientTwin();
  }, [selectedPatientId]);

  // Live simulation tick handler
  const handleStep = async () => {
    if (!selectedPatientId) return;
    try {
      const updatedState = await tickSimulation(selectedPatientId);
      setTwinState(updatedState);
      // Refresh rolling history
      const history = await getPatientHistory(selectedPatientId, 288);
      setPatientHistory(history);
    } catch (err) {
      console.error('Tick simulation failed:', err);
    }
  };

  // Reset simulation handler
  const handleReset = async () => {
    if (!selectedPatientId) return;
    try {
      setIsSimulating(false);
      await resetPatientSimulation(selectedPatientId);
      const [state, history] = await Promise.all([
        getDigitalTwinState(selectedPatientId),
        getPatientHistory(selectedPatientId, 288)
      ]);
      setTwinState(state);
      setPatientHistory(history);
    } catch (err) {
      console.error('Reset simulation failed:', err);
    }
  };

  // Continuous simulation timer loop
  useEffect(() => {
    if (isSimulating) {
      simulationRef.current = setInterval(() => {
        handleStep();
      }, 2000); // Step every 2 seconds
    } else {
      if (simulationRef.current) clearInterval(simulationRef.current);
    }

    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current);
    };
  }, [isSimulating, selectedPatientId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navigation
        currentView={currentView}
        setCurrentView={setCurrentView}
        patients={patients}
        selectedPatientId={selectedPatientId}
        setSelectedPatientId={setSelectedPatientId}
        twinState={twinState}
        isSimulating={isSimulating}
        setIsSimulating={setIsSimulating}
        onResetSimulation={handleReset}
        onStepSimulation={handleStep}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && !twinState ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-400 font-mono">Synchronizing Digital Twin State...</p>
          </div>
        ) : (
          <>
            {currentView === 'overview' && (
              <OverviewView
                twinState={twinState}
                patientHistory={patientHistory}
                cohortStats={cohortStats}
                setCurrentView={setCurrentView}
              />
            )}

            {currentView === 'patients' && (
              <PatientsView
                patients={patients}
                selectedPatientId={selectedPatientId}
                onSelectPatient={(pid) => {
                  setSelectedPatientId(pid);
                  setCurrentView('twin');
                }}
              />
            )}

            {currentView === 'twin' && (
              <DigitalTwinView
                twinState={twinState}
                onSimulateWhatIf={() => setCurrentView('whatif')}
              />
            )}

            {currentView === 'monitoring' && (
              <LiveMonitoringView
                twinState={twinState}
                patientHistory={patientHistory}
                isSimulating={isSimulating}
                onToggleSimulation={() => setIsSimulating(!isSimulating)}
                onStepSimulation={handleStep}
                onResetSimulation={handleReset}
                loading={loading}
              />
            )}

            {currentView === 'predictions' && (
              <PredictionsView
                twinState={twinState}
              />
            )}

            {currentView === 'whatif' && (
              <WhatIfView
                twinState={twinState}
                patientId={selectedPatientId}
              />
            )}

            {currentView === 'evaluation' && (
              <EvaluationView />
            )}

            {currentView === 'data' && (
              <DataExplorerView
                patients={patients}
                selectedPatientId={selectedPatientId}
                onSelectPatient={(pid) => setSelectedPatientId(pid)}
              />
            )}

            {currentView === 'health' && (
              <SystemHealthView />
            )}

            {currentView === 'about' && (
              <AboutView />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-mono">
            GlucoTwin v2.6 | Happiest Health Digital Twin Challenge 2026 PoC
          </p>
          <p className="text-slate-400">
            Multimodal EHR-Wearable Fusion &bull; 70-Min Early Action Runway &bull; 100% Local Execution
          </p>
        </div>
      </footer>
    </div>
  );
}
