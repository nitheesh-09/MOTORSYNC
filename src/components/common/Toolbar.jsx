import React from 'react';
import { 
  Search, 
  RefreshCw, 
  Pause, 
  Play, 
  AlertTriangle, 
  Clock, 
  Cpu, 
  Zap,
  Radio,
  Server
} from 'lucide-react';
import { SIMULATION_MODES, telemetryService } from '../../services/telemetryService';
import { DATA_SOURCE_TYPES } from '../../services/dataIngestion/motorDataModel';
import { MOTOR_REGISTRY } from '../../services/motorRegistry';

export const Toolbar = ({ 
  searchTerm, 
  setSearchTerm, 
  snapshot, 
  onRefresh 
}) => {
  const timeRanges = ['Live (30s)', 'Last 5m', 'Last 15m', 'Last 1h', 'Last 24h'];

  const handleDataSourceChange = (e) => {
    telemetryService.setDataSource(e.target.value);
  };

  const handleModeChange = (e) => {
    telemetryService.setMode(e.target.value);
  };

  const handleTimeRangeChange = (range) => {
    telemetryService.setTimeRange(range);
  };

  const handleTogglePause = () => {
    telemetryService.togglePause();
  };

  const isExternal = snapshot?.dataSourceType === DATA_SOURCE_TYPES.EXTERNAL_LAPTOP;

  return (
    <div className="global-toolbar">
      <div className="toolbar-container">
        {/* Left Section: Search & Time Range */}
        <div className="toolbar-left">
          {/* Global Search */}
          <div className="search-box">
            <Search size={13} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Filter telemetry, sensors, components..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              id="global-search-input"
            />
            {searchTerm && (
              <button 
                className="clear-search" 
                onClick={() => setSearchTerm('')}
              >
                ×
              </button>
            )}
          </div>

          {/* Time Range Selector */}
          <div className="time-range-group">
            <span className="time-range-label">
              <Clock size={12} />
              <span>RANGE:</span>
            </span>
            <div className="range-pills">
              {timeRanges.map((range) => (
                <button
                  key={range}
                  className={`range-pill ${snapshot?.timeRange === range ? 'active' : ''}`}
                  onClick={() => handleTimeRangeChange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Section: Motor Selector, Data Source Selector, Simulation & Status */}
        <div className="toolbar-right">
          {/* Data Source Selector */}
          <div className="data-source-selector-wrapper" title="Select ingestion source: External Acquisition Laptop or Synthetic Simulator">
            <span className="data-source-label">
              <Server size={12} className={isExternal ? "text-emerald" : "text-blue"} />
              <span>DATA SOURCE:</span>
            </span>
            <select
              className="data-source-select font-mono font-bold"
              value={snapshot?.dataSourceType || DATA_SOURCE_TYPES.ESP32}
              onChange={handleDataSourceChange}
              id="global-data-source-select"
            >
              <option value={DATA_SOURCE_TYPES.ESP32}>ESP32 Real Hardware [ACTIVE]</option>
              <option value={DATA_SOURCE_TYPES.EXTERNAL_LAPTOP}>External Data Acquisition</option>
            </select>
          </div>

          {/* Single Monitored Real Motor (Requirement 6) */}
          <div className="motor-selector-wrapper">
            <span className="motor-selector-label">
              <Cpu size={12} className="text-blue" />
              <span>MOTOR:</span>
            </span>
            <div className="font-mono font-bold text-main px-8 py-3" style={{ fontSize: '12px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #cbd5e1', letterSpacing: '0.04em' }} id="global-motor-display">
              MTR-001
            </div>
            {snapshot?.metrics && (
              <span className={`badge badge-${snapshot.metrics.status === 'FAULT' ? 'fault' : snapshot.metrics.status === 'WARNING' ? 'warning' : snapshot.hasRealTelemetry ? 'healthy' : 'muted'} badge-sm font-mono`}>
                {snapshot.hasRealTelemetry ? (snapshot.metrics.status || 'ONLINE') : 'DISCONNECTED'}
              </span>
            )}
          </div>

          {/* Simulation Mode Selector for Live Evaluation */}
          {!isExternal && snapshot?.dataSourceType !== DATA_SOURCE_TYPES.ESP32 && (
            <div className="simulation-mode-wrapper">
              <span className="sim-label">
                <Zap size={12} className="text-amber" />
                <span>SIMULATION MODE:</span>
              </span>
              <select
                className="sim-select font-mono"
                value={snapshot?.simulationMode || SIMULATION_MODES.HEALTHY}
                onChange={handleModeChange}
                id="simulation-mode-select"
              >
                {Object.values(SIMULATION_MODES).map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Pause / Resume Button */}
          <button 
            className={`eng-btn eng-btn-secondary ${snapshot?.isPaused ? 'btn-paused' : ''}`}
            onClick={handleTogglePause}
            title={snapshot?.isPaused ? 'Resume live ingestion ticker' : 'Pause live ingestion ticker'}
            id="pause-simulation-btn"
          >
            {snapshot?.isPaused ? <Play size={12} /> : <Pause size={12} />}
            <span>{snapshot?.isPaused ? 'RESUME' : 'PAUSE'}</span>
          </button>

          {/* Refresh Button */}
          <button 
            className="eng-btn eng-btn-secondary"
            onClick={() => {
              telemetryService.refreshNow();
              if (onRefresh) onRefresh();
            }}
            title="Force immediate sample tick"
            id="refresh-telemetry-btn"
          >
            <RefreshCw size={12} />
            <span>REFRESH</span>
          </button>

          {/* Prominent Data Source Indicator (Section 12, 14, 29) */}
          {snapshot?.dataSourceType === DATA_SOURCE_TYPES.ESP32 ? (
            <div className={`esp32-data-badge ${snapshot?.esp32Connected === false ? 'badge-stale' : ''}`} title="Data Source: ESP32 Hardware Real-Time Ingestion">
              <span className="live-esp32-tag font-mono">LIVE MONITORING — SOURCE: ESP32 HARDWARE</span>
              <Radio size={12} className="esp32-icon" />
              <span className="esp32-text">
                {snapshot?.esp32Connected === false ? 'ESP32 HARDWARE: STALE / DISCONNECTED' : 'ESP32 HARDWARE: CONNECTED'}
              </span>
              {snapshot?.esp32LastPacketAt && (
                <span className="esp32-last-seen font-mono text-xs">
                  Last Data: {new Date(snapshot.esp32LastPacketAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          ) : isExternal ? (
            <div className="external-data-badge" title="Data Source: External Data Acquisition Laptop. Telemetry features calculated externally and received over data ingestion network.">
              <span className="live-external-tag font-mono">LIVE MONITORING — EXTERNAL DATA SOURCE</span>
              <Radio size={12} className="external-icon" />
              <span className="external-text">EXTERNAL ACQUISITION</span>
            </div>
          ) : (
            <div className="esp32-data-badge badge-stale" title="ESP32 hardware is disconnected or waiting for raw sensor telemetry.">
              <span className="live-esp32-tag font-mono">LIVE MONITORING — SOURCE: ESP32 HARDWARE</span>
              <AlertTriangle size={12} className="text-amber" />
              <span className="esp32-text font-bold text-amber">ESP32 DISCONNECTED</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .global-toolbar {
          background: #f8fafc;
          border-bottom: 1px solid var(--border-subtle);
          padding: 6px 20px;
        }

        .toolbar-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          max-width: 1720px;
          margin: 0 auto;
        }

        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
          min-width: 320px;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          width: 280px;
        }

        .search-icon {
          position: absolute;
          left: 9px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 5px 24px 5px 28px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          background: #ffffff;
          color: var(--text-main);
          font-size: 11.5px;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .search-input:focus {
          border-color: var(--border-focus);
        }

        .clear-search {
          position: absolute;
          right: 7px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 14px;
          cursor: pointer;
        }

        .time-range-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .time-range-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .range-pills {
          display: flex;
          background: #e2e8f0;
          padding: 2px;
          border-radius: var(--radius-sm);
          gap: 1px;
        }

        .range-pill {
          background: transparent;
          border: none;
          padding: 3px 8px;
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.12s ease;
        }

        .range-pill:hover {
          color: var(--text-main);
        }

        .range-pill.active {
          background: #ffffff;
          color: var(--primary-blue);
          box-shadow: 0 1px 2px rgba(0,0,0,0.06);
          font-weight: 700;
        }

        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .motor-selector-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 6px 2px 8px;
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
        }

        .motor-selector-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--primary-blue);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .motor-select {
          background: transparent;
          border: none;
          outline: none;
          font-size: 11px;
          color: var(--text-main);
          cursor: pointer;
        }

        .simulation-mode-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 6px 2px 8px;
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
        }

        .sim-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .text-amber {
          color: #d97706;
        }

        .sim-select {
          border: none;
          background: transparent;
          color: #0f172a;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          outline: none;
          padding: 2px;
        }

        .btn-paused {
          background: #fffbeb !important;
          color: #b45309 !important;
          border-color: #fde68a !important;
        }

        .synthetic-data-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 9px;
          background: #fefce8;
          border: 1px solid #fef08a;
          border-radius: var(--radius-sm);
          font-size: 10.5px;
          cursor: help;
        }

        .synthetic-icon {
          color: #b45309;
        }

        .live-sim-tag {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          padding: 1px 5px;
          border-radius: 2px;
          font-size: 9.5px;
          font-weight: 700;
          margin-right: 4px;
        }

        .synthetic-text {
          font-family: var(--font-mono);
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #854d0e;
        }

        .data-source-selector-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 6px 2px 8px;
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
        }

        .data-source-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .data-source-select {
          border: none;
          background: transparent;
          color: var(--text-main);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          outline: none;
          padding: 2px;
        }

        .esp32-data-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #eff6ff;
          border: 1px solid #93c5fd;
          border-radius: var(--radius-sm);
          font-size: 10.5px;
          cursor: help;
        }

        .esp32-data-badge.badge-stale {
          background: #fffbeb;
          border-color: #fde68a;
        }

        .live-esp32-tag {
          background: #1e40af;
          color: #ffffff;
          border: 1px solid #1d4ed8;
          padding: 1px 6px;
          border-radius: 2px;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .esp32-icon {
          color: #2563eb;
          animation: pulse 1.5s infinite ease-in-out;
        }

        .esp32-text {
          font-family: var(--font-mono);
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #1e3a8a;
        }

        .esp32-last-seen {
          color: #64748b;
          margin-left: 4px;
        }

        .external-data-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 9px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: var(--radius-sm);
          font-size: 10.5px;
          cursor: help;
        }

        .live-external-tag {
          background: #065f46;
          color: #ffffff;
          border: 1px solid #047857;
          padding: 1px 5px;
          border-radius: 2px;
          font-size: 9.5px;
          font-weight: 700;
          margin-right: 4px;
        }

        .external-icon {
          color: #059669;
        }

        .external-text {
          font-family: var(--font-mono);
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #065f46;
        }

        .text-emerald {
          color: #059669;
        }
      `}</style>
    </div>
  );
};
