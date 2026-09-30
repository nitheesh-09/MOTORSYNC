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

        {/* Right Section: Motor Context, Connection Status & Actions */}
        <div className="toolbar-right">
          {/* Monitored Real Motor */}
          <div className="motor-selector-wrapper" title="Physical Motor Asset">
            <span className="motor-selector-label">
              <Cpu size={12} className="text-blue" />
              <span>MOTOR:</span>
            </span>
            <div className="font-mono font-bold text-main px-8 py-3" style={{ fontSize: '12px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #cbd5e1', letterSpacing: '0.04em' }} id="global-motor-display">
              MTR-001
            </div>
          </div>

          {/* Connection Status Indicator */}
          <div className="connection-pill-wrapper">
            <span className={`status-dot ${snapshot?.esp32Connected ? 'dot-connected' : snapshot?.hasRealTelemetry ? 'dot-stale' : 'dot-disconnected'}`} />
            <span className="connection-pill-text font-mono">
              {snapshot?.esp32Connected 
                ? 'ESP32 CONNECTED' 
                : snapshot?.hasRealTelemetry 
                ? 'ESP32 STALE' 
                : 'ESP32 WAITING'}
            </span>
          </div>

          {/* Pause / Resume Polling Button */}
          <button 
            className={`eng-btn eng-btn-secondary ${snapshot?.isPaused ? 'btn-paused' : ''}`}
            onClick={handleTogglePause}
            title={snapshot?.isPaused ? 'Resume live polling updates' : 'Pause live polling updates'}
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
            title="Fetch latest telemetry from backend"
            id="refresh-telemetry-btn"
          >
            <RefreshCw size={12} />
            <span>REFRESH</span>
          </button>
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

        .connection-pill-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .dot-connected {
          background: #16a34a;
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2);
        }

        .dot-stale {
          background: #d97706;
          box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.2);
        }

        .dot-disconnected {
          background: #94a3b8;
          box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.2);
        }

        .connection-pill-text {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: 0.03em;
        }

        .text-emerald {
          color: #059669;
        }
      `}</style>
    </div>
  );
};
