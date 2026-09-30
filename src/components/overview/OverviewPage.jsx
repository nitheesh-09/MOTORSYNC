import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Thermometer, 
  Radio, 
  Zap, 
  AlertTriangle, 
  ChevronRight,
  Info,
  Clock,
  Cpu,
  Layers
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { TelemetryChart } from '../common/TelemetryChart';

export const OverviewPage = ({ 
  snapshot, 
  searchTerm = '', 
  onNavigate 
}) => {
  // Live dynamic browser time for user awareness
  const [currentBrowserTime, setCurrentBrowserTime] = useState(() => new Date().toLocaleTimeString());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBrowserTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hasReal = Boolean(snapshot?.hasRealTelemetry);
  const metrics = snapshot?.metrics || {};
  const diagnostic = snapshot?.diagnostic || {};
  const history = snapshot?.history || [];

  // Connection determination
  const connectionStatus = snapshot?.esp32Connected 
    ? 'CONNECTED' 
    : (hasReal ? 'STALE' : 'DISCONNECTED');

  const connectionColor = connectionStatus === 'CONNECTED' 
    ? 'text-emerald' 
    : connectionStatus === 'STALE' 
    ? 'text-amber' 
    : 'text-muted';

  // Last telemetry timestamp directly from real hardware telemetry
  const lastTelemetryTime = metrics.latestTimestamp || (hasReal && history.length > 0 ? history[history.length - 1].time : null);

  // Overall Condition
  const currentCondition = !hasReal 
    ? (connectionStatus === 'DISCONNECTED' ? 'DISCONNECTED' : 'INSUFFICIENT DATA')
    : (diagnostic.condition || diagnostic.status || 'HEALTHY');

  // Active alerts count
  const activeAlertsCount = snapshot?.activeEvents?.filter(e => e.status === 'ACTIVE').length || 0;

  // Dominant frequency
  const dominantFrequency = snapshot?.vibrationFeatures?.dominantFrequency != null
    ? `${snapshot.vibrationFeatures.dominantFrequency} Hz`
    : (hasReal ? 'Analyzing' : 'None');

  return (
    <div className="overview-page">
      {/* 1. OVERVIEW HEADER (Section 5) */}
      <div className="overview-header-card">
        <div className="header-meta-left">
          <div className="title-row">
            <h1 className="overview-title">MOTOR CONDITION MONITORING</h1>
            <span className="asset-pill font-mono">ASSET: MTR-001</span>
          </div>
          <div className="subtitle-text">
            Physical motor condition telemetry, electrical & vibration analysis
          </div>
        </div>

        <div className="header-meta-right font-mono">
          <div className="meta-stat">
            <span className="meta-label">DATA SOURCE</span>
            <span className="meta-val text-blue font-bold">ESP32 REAL HARDWARE</span>
          </div>
          <div className="meta-divider">|</div>
          <div className="meta-stat">
            <span className="meta-label">CONNECTION</span>
            <span className={`meta-val font-bold ${connectionColor}`}>
              <span className={`status-dot-inline ${connectionStatus === 'CONNECTED' ? 'dot-connected' : connectionStatus === 'STALE' ? 'dot-stale' : 'dot-disconnected'}`} />
              {connectionStatus}
            </span>
          </div>
          <div className="meta-divider">|</div>
          <div className="meta-stat">
            <span className="meta-label">LAST TELEMETRY</span>
            <span className="meta-val font-bold text-main">
              {lastTelemetryTime ? lastTelemetryTime : 'AWAITING DATA'}
            </span>
          </div>
          <div className="meta-divider">|</div>
          <div className="meta-stat">
            <span className="meta-label">SYSTEM TIME</span>
            <span className="meta-val text-muted">{currentBrowserTime}</span>
          </div>
        </div>
      </div>

      {/* Disconnected / Awaiting Telemetry Notice */}
      {!hasReal && (
        <div className="awaiting-data-banner">
          <AlertTriangle size={15} className="text-amber" />
          <div className="banner-text font-mono">
            <strong>WAITING FOR REAL MOTOR DATA:</strong> No operational sensor packets have been received for MTR-001 yet.
            The dashboard is in clean commissioning mode and will automatically update when real hardware telemetry arrives from the acquisition system.
          </div>
        </div>
      )}

      {/* 2. PRIMARY METRICS (Section 6) */}
      <div className="primary-metrics-grid">
        {/* Voltage */}
        <div className="primary-metric-card">
          <div className="metric-header">
            <span className="metric-title">VOLTAGE</span>
            <Zap size={13} className="text-muted" />
          </div>
          <div className="metric-body font-mono">
            <span className="metric-val">{hasReal && metrics.voltage != null ? metrics.voltage : '--'}</span>
            <span className="metric-unit">{hasReal && metrics.voltage != null ? 'V' : ''}</span>
          </div>
          <div className="metric-footer font-mono">
            {hasReal && metrics.voltage != null ? 'Transducer RMS Voltage' : 'Waiting for real telemetry'}
          </div>
        </div>

        {/* Current */}
        <div className="primary-metric-card">
          <div className="metric-header">
            <span className="metric-title">CURRENT</span>
            <Zap size={13} className="text-muted" />
          </div>
          <div className="metric-body font-mono">
            <span className="metric-val">{hasReal && metrics.current != null ? metrics.current : '--'}</span>
            <span className="metric-unit">{hasReal && metrics.current != null ? 'A' : ''}</span>
          </div>
          <div className="metric-footer font-mono">
            {hasReal && metrics.current != null ? 'Transducer RMS Current' : 'Waiting for real telemetry'}
          </div>
        </div>

        {/* Temperature */}
        <div className="primary-metric-card">
          <div className="metric-header">
            <span className="metric-title">TEMPERATURE</span>
            <Thermometer size={13} className="text-muted" />
          </div>
          <div className="metric-body font-mono">
            <span className="metric-val">{hasReal && metrics.temperature != null ? metrics.temperature : '--'}</span>
            <span className="metric-unit">{hasReal && metrics.temperature != null ? '°C' : ''}</span>
          </div>
          <div className="metric-footer font-mono">
            {hasReal && metrics.temperature != null ? 'Surface Temperature RTD' : 'Waiting for real telemetry'}
          </div>
        </div>

        {/* Vibration (Primary Magnitude) */}
        <div className="primary-metric-card metric-card-highlight">
          <div className="metric-header">
            <span className="metric-title text-blue">VIBRATION (MAGNITUDE)</span>
            <Radio size={13} className="text-blue" />
          </div>
          <div className="metric-body font-mono">
            <span className="metric-val text-blue">{hasReal && metrics.vibrationMagnitude != null ? metrics.vibrationMagnitude : '--'}</span>
            <span className="metric-unit">{hasReal && metrics.vibrationMagnitude != null ? 'mm/s' : ''}</span>
          </div>
          <div className="metric-footer font-mono text-blue">
            {hasReal && metrics.vibrationMagnitude != null ? 'Vector Sum: √(X² + Y² + Z²)' : 'Waiting for real telemetry'}
          </div>
        </div>
      </div>

      {/* 3. SECONDARY TRI-AXIAL VIBRATION & POWER (Section 7) */}
      <div className="secondary-sensor-strip">
        <div className="secondary-strip-title font-mono">
          <Radio size={12} className="text-blue" />
          <span>REAL-TIME SENSOR CHANNELS</span>
        </div>
        <div className="secondary-channels-row font-mono">
          <div className="channel-box">
            <span className="channel-tag">VIBRATION X</span>
            <span className="channel-val">{hasReal && metrics.vibrationX != null ? `${metrics.vibrationX} mm/s` : '--'}</span>
          </div>
          <div className="channel-box">
            <span className="channel-tag">VIBRATION Y</span>
            <span className="channel-val">{hasReal && metrics.vibrationY != null ? `${metrics.vibrationY} mm/s` : '--'}</span>
          </div>
          <div className="channel-box">
            <span className="channel-tag">VIBRATION Z</span>
            <span className="channel-val">{hasReal && metrics.vibrationZ != null ? `${metrics.vibrationZ} mm/s` : '--'}</span>
          </div>
          <div className="channel-box">
            <span className="channel-tag">CALCULATED POWER</span>
            <span className="channel-val text-blue">{hasReal && metrics.power != null ? `${metrics.power} kW` : '--'}</span>
          </div>
        </div>
      </div>

      {/* 4. CONDITION SECTION & 5. RECENT TECHNICAL STATUS (Section 8 & 10) */}
      <div className="condition-and-status-grid">
        {/* Condition Box */}
        <div className="condition-card">
          <div className="condition-card-header">
            <div className="condition-title-group">
              <ShieldCheck size={14} className="text-blue" />
              <span className="card-heading">CURRENT MOTOR CONDITION</span>
            </div>
            <Badge status={currentCondition} size="sm" />
          </div>
          <div className="condition-card-body">
            <div className="condition-banner">
              <div className="condition-status-label font-mono">ASSESSMENT:</div>
              <div className="condition-status-name font-mono">{currentCondition}</div>
            </div>
            <p className="condition-desc">
              {hasReal 
                ? (diagnostic.recommendation || 'Operational parameters are within configured limits.')
                : 'No sensor telemetry currently received. Condition evaluation will commence once real hardware packets arrive from MTR-001.'}
            </p>
            <div className="condition-actions">
              <button 
                className="eng-btn eng-btn-secondary eng-btn-sm font-mono"
                onClick={() => onNavigate && onNavigate('DIAGNOSTICS')}
                id="overview-inspect-diagnostics-btn"
              >
                <span>OPEN TECHNICAL DIAGNOSTICS</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Recent Status Box */}
        <div className="recent-status-card">
          <div className="recent-status-header">
            <div className="status-title-group">
              <Activity size={14} className="text-blue" />
              <span className="card-heading">RECENT STATUS SUMMARY</span>
            </div>
            <span className="font-mono text-xs text-muted">MTR-001 TELEMETRY SUMMARY</span>
          </div>
          <div className="status-items-list font-mono">
            <div className="status-item">
              <span className="status-label">LAST TELEMETRY RECEIVED:</span>
              <span className="status-val">{lastTelemetryTime || 'None'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">CURRENT CONDITION:</span>
              <span className="status-val">{currentCondition}</span>
            </div>
            <div className="status-item">
              <span className="status-label">DOMINANT VIBRATION FREQUENCY:</span>
              <span className="status-val">{dominantFrequency}</span>
            </div>
            <div className="status-item">
              <span className="status-label">CURRENT DIAGNOSTIC STATE:</span>
              <span className="status-val">{diagnostic.status || 'INSUFFICIENT DATA'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">ACTIVE ALERT COUNT:</span>
              <span className="status-val">{activeAlertsCount}</span>
            </div>
            <div className="status-item">
              <span className="status-label">COMMISSIONING BASELINE:</span>
              <span className="status-val text-amber">{snapshot?.baselineStatus || 'NOT ESTABLISHED'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. VIBRATION TREND SECTION (Section 9) */}
      <div className="vibration-trend-section">
        <div className="trend-section-header">
          <div className="trend-title-group">
            <Radio size={14} className="text-blue" />
            <span className="card-heading">REAL VIBRATION TREND</span>
          </div>
          <span className="font-mono text-xs text-muted">
            REAL TIME-SERIES MEASUREMENTS • AXES & MAGNITUDE
          </span>
        </div>
        <TelemetryChart 
          history={history} 
          timeRange={snapshot?.timeRange || 'Live (30s)'} 
        />
      </div>

      <style>{`
        .overview-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 1720px;
          margin: 0 auto;
        }

        .overview-header-card {
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .overview-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.01em;
          margin: 0;
        }

        .asset-pill {
          font-size: 11px;
          font-weight: 700;
          background: #eff6ff;
          color: var(--primary-blue);
          border: 1px solid #bfdbfe;
          padding: 2px 7px;
          border-radius: 3px;
          letter-spacing: 0.04em;
        }

        .subtitle-text {
          font-size: 11.5px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .header-meta-right {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 11px;
        }

        .meta-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .meta-label {
          font-size: 9.5px;
          color: var(--text-muted);
          font-weight: 600;
        }

        .meta-val {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .meta-divider {
          color: #cbd5e1;
          font-weight: 300;
        }

        .status-dot-inline {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
        }

        .dot-connected {
          background: #16a34a;
        }

        .dot-stale {
          background: #d97706;
        }

        .dot-disconnected {
          background: #94a3b8;
        }

        .text-emerald {
          color: #16a34a;
        }

        .awaiting-data-banner {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .banner-text {
          font-size: 11px;
          color: #92400e;
          line-height: 1.4;
        }

        .primary-metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        @media (max-width: 1024px) {
          .primary-metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .primary-metrics-grid {
            grid-template-columns: 1fr;
          }
        }

        .primary-metric-card {
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .metric-card-highlight {
          background: #f8fafc;
          border-color: #bfdbfe;
        }

        .metric-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .metric-title {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        .metric-body {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .metric-val {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-main);
        }

        .metric-unit {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .metric-footer {
          font-size: 9.5px;
          color: var(--text-muted);
        }

        .secondary-sensor-strip {
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .secondary-strip-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        .secondary-channels-row {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .channel-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 3px 8px;
          border-radius: 3px;
        }

        .channel-tag {
          font-size: 9.5px;
          color: var(--text-muted);
          font-weight: 700;
        }

        .channel-val {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-main);
        }

        .condition-and-status-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        @media (max-width: 900px) {
          .condition-and-status-grid {
            grid-template-columns: 1fr;
          }
        }

        .condition-card, .recent-status-card {
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          display: flex;
          flex-direction: column;
        }

        .condition-card-header, .recent-status-header {
          padding: 10px 14px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .condition-title-group, .status-title-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .card-heading {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: 0.03em;
        }

        .condition-card-body {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .condition-banner {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .condition-status-label {
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 700;
        }

        .condition-status-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--primary-blue);
        }

        .condition-desc {
          font-size: 11.5px;
          color: #334155;
          line-height: 1.5;
          margin: 0;
        }

        .condition-actions {
          margin-top: 4px;
        }

        .recent-status-card .status-items-list {
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .status-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          border-bottom: 1px dashed #f1f5f9;
          padding-bottom: 4px;
        }

        .status-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .status-label {
          color: var(--text-muted);
          font-weight: 600;
        }

        .status-val {
          color: var(--text-main);
          font-weight: 700;
        }

        .vibration-trend-section {
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 12px 14px;
        }

        .trend-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .trend-title-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
      `}</style>
    </div>
  );
};
