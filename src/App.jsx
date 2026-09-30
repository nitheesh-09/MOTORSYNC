import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { Toolbar } from './components/common/Toolbar';
import { OverviewPage } from './components/overview/OverviewPage';
import { DiagnosticsPage } from './components/diagnostics/DiagnosticsPage';
import { OfflineAnalysisPage } from './components/offline/OfflineAnalysisPage';
import { SensorsPage } from './components/sensors/SensorsPage';
import { HistoryPage } from './components/history/HistoryPage';
import { SystemPage } from './components/system/SystemPage';
import { telemetryService } from './services/telemetryService';

if (typeof window !== 'undefined') {
  window.telemetryService = telemetryService;
}

export function App() {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [searchTerm, setSearchTerm] = useState('');
  const [snapshot, setSnapshot] = useState(null);

  // Subscribe to real-time decoupled synthetic telemetry provider
  useEffect(() => {
    const unsubscribe = telemetryService.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="app-container">
      {/* Top Industrial Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        snapshot={snapshot}
        onSelectEvent={(evt) => {
          setActiveTab('OVERVIEW');
        }}
      />

      {/* Global Toolbar */}
      <Toolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        snapshot={snapshot}
        onRefresh={() => {}}
      />

      {/* Main Workspace Area (6 Clean Navigation Sections) */}
      <main className="main-content">
        {activeTab === 'OVERVIEW' && (
          <OverviewPage
            snapshot={snapshot}
            searchTerm={searchTerm}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'DIAGNOSTICS' && (
          <DiagnosticsPage
            snapshot={snapshot}
            searchTerm={searchTerm}
          />
        )}

        {activeTab === 'OFFLINE_ANALYSIS' && (
          <OfflineAnalysisPage />
        )}

        {activeTab === 'SENSORS' && (
          <SensorsPage
            snapshot={snapshot}
            searchTerm={searchTerm}
          />
        )}

        {activeTab === 'HISTORY' && (
          <HistoryPage
            snapshot={snapshot}
          />
        )}

        {activeTab === 'SYSTEM' && (
          <SystemPage
            snapshot={snapshot}
          />
        )}
      </main>
    </div>
  );
}

export default App;
