import React from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Thermometer, 
  Radio, 
  Zap, 
  AlertTriangle, 
  Eye, 
  CheckCircle2, 
  CheckCircle,
  Sliders,
  ChevronRight,
  Info,
  RotateCw,
  Cpu
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { TelemetryChart } from '../common/TelemetryChart';
import { VibrationAnalysisCard } from '../common/VibrationAnalysisCard';
import { telemetryService } from '../../services/telemetryService';

export const OverviewPage = ({ 
  snapshot, 
  searchTerm = '', 
  onViewTest,
  onNavigate 
}) => {
  const fleet = snapshot?.fleet || [];
  const fleetStats = snapshot?.fleetStats || {
    totalMotors: 5,
    healthy: 3,
    warning: 1,
    fault: 1,
    offline: 0
  };
  const selectedMotor = snapshot?.selectedMotor || {
    motorId: 'MTR-001',
    name: 'Motor MTR-001',
    shortName: 'MTR-001',
    location: 'Physical Hardware Testbed',
    facilityArea: 'Hardware Laboratory',
    type: '3-Phase Induction Motor',
    powerKw: 1.5,
    ratedRPM: 1500,
    ratedVoltage: '230 V',
    ratedCurrent: '3.50 A RMS'
  };

  const metrics = snapshot?.metrics || {
    status: 'NO RECENT ESP32 DATA',
    healthScore: null,
    temperature: null,
    vibration: null,
    current: null,
    voltage: null,
    activeWarnings: 0,
    estimatedRPM: null,
    estimatedRPMLabel: 'Not available',
    frequency1X: null,
    rpmReliable: false,
    rpmSubtext: 'Awaiting ESP32 hardware telemetry'
  };

  const diagnostic = snapshot?.diagnostic || {
    status: 'NO DATA',
    healthScore: null,
    suspectedSection: 'NONE',
    faultType: 'NO RECENT ESP32 DATA',
    severity: 'NONE',
    confidence: null,
    recommendation: 'Awaiting real ESP32 sensor telemetry from physical motor setup.',
  };

  const sensors = snapshot?.sensors || [];
  const components = snapshot?.components || [];
  const recentTests = snapshot?.recentTests || [];
  const activeEvents = snapshot?.activeEvents || [];

  const term = searchTerm.toLowerCase();
  const filteredSensors = sensors.filter(s => s.name.toLowerCase().includes(term) || s.type.toLowerCase().includes(term));
  const filteredComponents = components.filter(c => c.component.toLowerCase().includes(term) || c.observation.toLowerCase().includes(term));
  const filteredEvents = activeEvents.filter(e => e.event.toLowerCase().includes(term) || e.sensor.toLowerCase().includes(term));
  const filteredTests = recentTests
    .filter(t => !t.motorId || t.motorId === 'MTR-001' || (t.motor && t.motor.includes('MTR-001')))
    .filter(t => t.testId.toLowerCase().includes(term) || (t.motor && t.motor.toLowerCase().includes(term)));

  const connectionStatus = snapshot?.esp32Connected 
    ? 'CONNECTED' 
    : (snapshot?.hasRealTelemetry ? 'STALE' : 'DISCONNECTED');
  const latestTs = metrics.latestTimestamp;
  const hasReal = snapshot?.hasRealTelemetry;

  return (
    <div className="overview-page">
      {/* Page Title & Subtitle */}
      <div className="page-header-block">
        <div>
          <h1 className="page-title">MOTOR CONDITION MONITORING</h1>
          <div className="page-subtitle">Real-time condition monitoring, telemetry analysis, and fault diagnosis for connected motor MTR-001.</div>
        </div>
        <div className="synthetic-badge-tag font-mono">
          <span className="live-esp32-badge">LIVE MONITORING — SOURCE: ESP32 REAL HARDWARE</span>
          <span>
            CONNECTION: {connectionStatus}
            {latestTs ? ` • LAST DATA: ${latestTs}` : ''}
          </span>
        </div>
      </div>

      {/* SINGLE MOTOR CONDITION MONITORING HEADER (Requirements 1, 2, 3) */}
      <div className="selected-motor-section-header mb-16" id="single-motor-dashboard">
        <div className="selected-motor-header-left">
          <div className="selected-motor-title-row">
            <Cpu size={16} className="text-blue" />
            <h2 className="selected-motor-title">
              MONITORED MOTOR: <span className="text-blue">MTR-001</span>
            </h2>
            <Badge status={hasReal ? (metrics.status || 'HEALTHY') : 'NO DATA'} size="sm" />
          </div>
          <div className="selected-motor-meta-row font-mono">
            <span>MOTOR ID: <strong>MTR-001</strong></span>
            <span>•</span>
            <span>DATA SOURCE: <strong className="text-blue">ESP32 REAL HARDWARE</strong></span>
            <span>•</span>
            <span>CONNECTION: <strong className={connectionStatus === 'CONNECTED' ? 'text-green' : connectionStatus === 'STALE' ? 'text-amber' : 'text-danger'}>{connectionStatus}</strong></span>
            <span>•</span>
            <span>LATEST TIMESTAMP: <strong>{latestTs || 'AWAITING ESP32 PACKETS'}</strong></span>
          </div>
        </div>
        <div className="selected-motor-header-right">
          <div className="motor-spec-tag font-mono">
            ESP32 REAL HARDWARE • 7 TELEMETRY CHANNELS
          </div>
        </div>
      </div>

      {/* No Real Data Banner */}
      {!hasReal && (
        <div className="eng-card mb-16 p-16" style={{ background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} className="text-amber" />
          <div className="font-mono text-xs">
            <strong className="text-amber">NO RECENT ESP32 DATA:</strong> No real hardware sensor packets have been received for MTR-001. Awaiting incoming ESP32 packets on /api/v1/telemetry/raw.
          </div>
        </div>
      )}

      {/* REAL SENSOR CARDS (Requirement 4) */}
      <div className="primary-measurements-grid" id="real-sensor-cards">
        {/* 1. VOLTAGE */}
        <div className="metric-card accent-blue">
          <div className="metric-card-label">
            <span>VOLTAGE</span>
            <Zap size={12} className="text-muted" />
          </div>
          <div className="metric-card-value font-mono">
            {hasReal && metrics.voltage != null ? metrics.voltage : '--'} <span className="metric-card-unit">{hasReal && metrics.voltage != null ? 'V' : ''}</span>
          </div>
          <div className="metric-card-sub font-mono">
            {hasReal && metrics.voltage != null ? 'RAW ESP32 VOLTAGE INPUT' : 'WAITING FOR REAL DATA'}
          </div>
        </div>

        {/* 2. CURRENT */}
        <div className={`metric-card accent-${(metrics.current || 0) > 3.5 ? 'warning' : 'blue'}`}>
          <div className="metric-card-label">
            <span>CURRENT</span>
            <Zap size={12} className="text-muted" />
          </div>
          <div className="metric-card-value font-mono">
            {hasReal && metrics.current != null ? metrics.current : '--'} <span className="metric-card-unit">{hasReal && metrics.current != null ? 'A' : ''}</span>
          </div>
          <div className="metric-card-sub font-mono">
            {hasReal && metrics.current != null ? 'RAW ESP32 CURRENT INPUT' : 'WAITING FOR REAL DATA'}
          </div>
        </div>

        {/* 3. TEMPERATURE */}
        <div className={`metric-card accent-${(metrics.temperature || 0) > 75 ? 'fault' : (metrics.temperature || 0) > 55 ? 'warning' : 'healthy'}`}>
          <div className="metric-card-label">
            <span>TEMPERATURE</span>
            <Thermometer size={12} className="text-muted" />
          </div>
          <div className="metric-card-value font-mono">
            {hasReal && metrics.temperature != null ? metrics.temperature : '--'} <span className="metric-card-unit">{hasReal && metrics.temperature != null ? '°C' : ''}</span>
          </div>
          <div className="metric-card-sub font-mono">
            {hasReal && metrics.temperature != null ? 'RAW ESP32 TEMPERATURE INPUT' : 'WAITING FOR REAL DATA'}
          </div>
        </div>

        {/* 4. VIBRATION X */}
        <div className="metric-card accent-blue">
          <div className="metric-card-label">
            <span>VIBRATION X</span>
            <Radio size={12} className="text-muted" />
          </div>
          <div className="metric-card-value font-mono">
            {hasReal && metrics.vibrationX != null ? metrics.vibrationX : '--'} <span className="metric-card-unit">{hasReal && metrics.vibrationX != null ? 'mm/s' : ''}</span>
          </div>
          <div className="metric-card-sub font-mono">
            {hasReal && metrics.vibrationX != null ? 'RAW AXIS X ACCELEROMETER' : 'WAITING FOR REAL DATA'}
          </div>
        </div>

        {/* 5. VIBRATION Y */}
        <div className="metric-card accent-blue">
          <div className="metric-card-label">
            <span>VIBRATION Y</span>
            <Radio size={12} className="text-muted" />
          </div>
          <div className="metric-card-value font-mono">
            {hasReal && metrics.vibrationY != null ? metrics.vibrationY : '--'} <span className="metric-card-unit">{hasReal && metrics.vibrationY != null ? 'mm/s' : ''}</span>
          </div>
          <div className="metric-card-sub font-mono">
            {hasReal && metrics.vibrationY != null ? 'RAW AXIS Y ACCELEROMETER' : 'WAITING FOR REAL DATA'}
          </div>
        </div>

        {/* 6. VIBRATION Z */}
        <div className="metric-card accent-blue">
          <div className="metric-card-label">
            <span>VIBRATION Z</span>
            <Radio size={12} className="text-muted" />
          </div>
          <div className="metric-card-value font-mono">
            {hasReal && metrics.vibrationZ != null ? metrics.vibrationZ : '--'} <span className="metric-card-unit">{hasReal && metrics.vibrationZ != null ? 'mm/s' : ''}</span>
          </div>
          <div className="metric-card-sub font-mono">
            {hasReal && metrics.vibrationZ != null ? 'RAW AXIS Z ACCELEROMETER' : 'WAITING FOR REAL DATA'}
          </div>
        </div>

        {/* 7. VIBRATION MAGNITUDE (CALCULATED: sqrt(x² + y² + z²)) */}
        <div className={`metric-card primary-vibration-card accent-${(metrics.vibrationMagnitude || 0) > 4.5 ? 'fault' : (metrics.vibrationMagnitude || 0) > 2.8 ? 'warning' : 'healthy'}`}>
          <div className="metric-card-label">
            <span className="primary-signal-tag">
              <Radio size={12} className="text-blue" />
              <span>VIBRATION MAGNITUDE</span>
            </span>
            <span className="badge badge-info badge-sm">CALCULATED</span>
          </div>
          <div className="primary-vibration-body">
            <div className="metric-card-value font-mono vibration-highlight-val">
              {hasReal && metrics.vibrationMagnitude != null ? metrics.vibrationMagnitude : '--'} <span className="metric-card-unit">{hasReal && metrics.vibrationMagnitude != null ? 'mm/s' : ''}</span>
            </div>
            <div className="primary-vibration-stats font-mono">
              {hasReal ? (
                <>
                  <span>X: {metrics.vibrationX ?? '--'}</span>
                  <span>•</span>
                  <span>Y: {metrics.vibrationY ?? '--'}</span>
                  <span>•</span>
                  <span>Z: {metrics.vibrationZ ?? '--'}</span>
                </>
              ) : (
                <span className="text-muted">WAITING FOR TELEMETRY</span>
              )}
            </div>
          </div>
          <div className="metric-card-sub font-mono">
            {hasReal ? 'sqrt(X² + Y² + Z²) FROM REAL SAMPLES' : 'NO ACTIVE DATA STREAM'}
          </div>
        </div>

        {/* 8. MOTOR STATUS & HEALTH */}
        <div className={`metric-card accent-${hasReal ? metrics.status.toLowerCase() : 'muted'}`}>
          <div className="metric-card-label">
            <span>MOTOR STATUS</span>
            <Activity size={12} className="text-muted" />
          </div>
          <div className="metric-card-value">
            {hasReal ? (
              <Badge status={metrics.status} size="sm" />
            ) : (
              <Badge status="NO DATA" size="sm" />
            )}
          </div>
          <div className="metric-card-sub font-mono">
            {hasReal 
              ? (metrics.status === 'HEALTHY' ? 'NORMAL LIMITS' : 'ANOMALY DETECTED')
              : 'NO RECENT ESP32 DATA'}
          </div>
        </div>
      </div>

      {/* Processed Ingestion Telemetry & Feature Payload Strip (Section 2, 3, 11) */}
      <div className="eng-card processed-features-strip">
        <div className="eng-card-header">
          <div className="pfs-title-group">
            <Cpu size={13} className="text-blue" />
            <span className="eng-card-title">PROCESSED TELEMETRY & EXTRACTED FEATURE PAYLOAD</span>
            <span className="badge badge-info badge-sm font-mono">
              {snapshot?.dataSourceType === 'ESP32' 
                ? 'SOURCE: ESP32 HARDWARE' 
                : snapshot?.isExternalSource 
                ? 'SOURCE: EXTERNAL DAQ LAPTOP' 
                : 'SOURCE: SYNTHETIC HARNESS'}
            </span>
          </div>
          <span className="font-mono text-xs text-muted">
            COMMON MOTOR DATA MODEL • EXTENDED FEATURES
          </span>
        </div>
        <div className="pfs-grid font-mono">
          <div className="pfs-item">
            <span className="pfs-label">REAL POWER (V × I)</span>
            <span className="pfs-val text-blue">{metrics.power != null ? `${metrics.power} kW` : '—'}</span>
            <span className="pfs-prov">Electrical Feature • Extracted</span>
          </div>
          <div className="pfs-item">
            <span className="pfs-label">TEMP RISE (ΔT FROM BASELINE)</span>
            <span className="pfs-val text-orange">{metrics.tempRise != null ? `+${metrics.tempRise} °C` : 'NOT ESTABLISHED'}</span>
            <span className="pfs-prov">{metrics.tempRise != null ? 'Thermal Feature • Real Baseline' : 'BASELINE: NOT ESTABLISHED'}</span>
          </div>
          <div className="pfs-item">
            <span className="pfs-label">VIBRATION CREST FACTOR</span>
            <span className="pfs-val">{snapshot?.vibrationFeatures?.crestFactor != null ? snapshot.vibrationFeatures.crestFactor : '—'}</span>
            <span className="pfs-prov">Vibration Feature • Extracted</span>
          </div>
          <div className="pfs-item">
            <span className="pfs-label">STATISTICAL KURTOSIS</span>
            <span className="pfs-val">{snapshot?.vibrationFeatures?.kurtosis != null ? snapshot.vibrationFeatures.kurtosis : '—'}</span>
            <span className="pfs-prov">Vibration Feature • Moment 4</span>
          </div>
          <div className="pfs-item">
            <span className="pfs-label">CURRENT PEAK / PK-PK</span>
            <span className="pfs-val">{metrics.current != null ? `${(metrics.current * 1.414).toFixed(2)} / ${(metrics.current * 2.828).toFixed(2)} A` : '—'}</span>
            <span className="pfs-prov">Electrical Feature • Extracted</span>
          </div>
          <div className="pfs-item">
            <span className="pfs-label">ESTIMATED RPM</span>
            <span className="pfs-val text-emerald">
              {metrics.rpmReliable ? `${metrics.estimatedRPM} RPM` : 'Not available'}
            </span>
            <span className="pfs-prov">{metrics.rpmReliable ? 'Derived from 1X Peak' : '1X Peak Unresolved'}</span>
          </div>
        </div>
      </div>

      {/* Main Telemetry Chart (4 Transducer Channels) */}
      <TelemetryChart history={snapshot?.history || []} timeRange={snapshot?.timeRange} />

      {/* Vibration Analysis (Primary Diagnostic Section with 1X Tracking) */}
      <VibrationAnalysisCard snapshot={snapshot} />

      {/* Two-Column Mid Section: Motor Condition Panel + Sensor Status */}
      <div className="dashboard-grid-2col">
        {/* Motor Health / Diagnostic Panel */}
        <div className="eng-card diagnostic-panel-card">
          <div className="eng-card-header">
            <span className="eng-card-title">
              <ShieldCheck size={13} className="text-blue" />
              <span>MOTOR CONDITION & CANDIDATE SECTION EVALUATION</span>
            </span>
            <Badge status={diagnostic.status} />
          </div>
          <div className="eng-card-body">
            <div className="diagnostic-summary-grid">
              <div className="diag-field">
                <span className="diag-label">OVERALL STATUS</span>
                <span className="diag-val font-mono">
                  <Badge status={diagnostic.status} size="sm" />
                </span>
              </div>
              <div className="diag-field">
                <span className="diag-label">HEALTH SCORE</span>
                <span className="diag-val font-mono text-large">
                  {diagnostic.healthScore} <span className="text-muted text-sm">/ 100</span>
                </span>
              </div>
              <div className="diag-field">
                <span className="diag-label">CANDIDATE AFFECTED SECTION</span>
                <span className="diag-val font-mono highlight-section">
                  {diagnostic.suspectedSection}
                </span>
              </div>
              <div className="diag-field">
                <span className="diag-label">FAULT CLASSIFICATION</span>
                <span className="diag-val font-mono fault-text">
                  {diagnostic.faultType}
                </span>
              </div>
              <div className="diag-field">
                <span className="diag-label">SEVERITY LEVEL</span>
                <span className="diag-val">
                  <Badge status={diagnostic.severity} size="sm" />
                </span>
              </div>
              <div className="diag-field">
                <span className="diag-label">DIAGNOSTIC CONFIDENCE</span>
                <span className="diag-val font-mono">
                  {diagnostic.confidence}%
                </span>
              </div>
            </div>

            {/* Engineering Recommendation */}
            <div className="recommendation-box">
              <div className="rec-header">
                <Info size={13} className="text-blue" />
                <span className="rec-title">ECE LABORATORY RECOMMENDATION</span>
              </div>
              <p className="rec-body">{diagnostic.recommendation}</p>
            </div>

            {/* Diagnostic simulated notice */}
            <div className="sim-diagnostic-notice font-mono">
              [DIAGNOSTICS ARCHITECTURE]: MOTORSYNC receives external feature payloads and evaluates 6 candidate motor sections: Bearings, Rotor, Stator/Windings, Shaft, Cooling System, and Electrical Supply. (Final AI/ML diagnosis scheduled for subsequent phase).
            </div>
          </div>
        </div>

        {/* Sensor Status (4 Physical Transducers - NO RPM) */}
        <div className="eng-card sensors-card">
          <div className="eng-card-header">
            <span className="eng-card-title">
              <Radio size={13} className="text-blue" />
              <span>SENSOR STATUS (4 PHYSICAL TRANSDUCERS)</span>
            </span>
            <button 
              className="eng-btn eng-btn-secondary eng-btn-sm"
              onClick={() => onNavigate && onNavigate('SENSORS')}
            >
              <span>TELEMETRY VIEW</span>
              <ChevronRight size={11} />
            </button>
          </div>
          <div className="eng-card-body p-0">
            <div className="sensor-rows-list">
              {filteredSensors.map((sensor) => (
                <div key={sensor.id} className="sensor-row-item">
                  <div className="sensor-row-info">
                    <div className="sensor-row-name font-mono">
                      {sensor.name}
                      {sensor.isPrimary && <span className="primary-pill">CORE SIGNAL</span>}
                    </div>
                    <div className="sensor-row-sub">{sensor.type} • {sensor.samplingRate}</div>
                  </div>
                  <div className="sensor-row-reading">
                    <div className="sensor-reading-val font-mono">
                      {sensor.value} <span className="sensor-reading-unit">{sensor.unit}</span>
                    </div>
                    <div className="sensor-reading-update">{sensor.lastUpdate}</div>
                  </div>
                  <div className="sensor-row-status">
                    <Badge status={sensor.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Motor Component Health */}
      <div className="eng-card component-health-card">
        <div className="eng-card-header">
          <span className="eng-card-title">
            <Sliders size={13} className="text-blue" />
            <span>MOTOR COMPONENT HEALTH</span>
          </span>
          <span className="section-meta-text">6 CRITICAL SUB-ASSEMBLIES MONITORED</span>
        </div>
        <div className="eng-table-container">
          <table className="eng-table">
            <thead>
              <tr>
                <th>COMPONENT</th>
                <th>STATUS</th>
                <th>HEALTH INDEX</th>
                <th>LAST CHECK</th>
                <th>ENGINEERING OBSERVATION</th>
              </tr>
            </thead>
            <tbody>
              {filteredComponents.map((comp, idx) => (
                <tr key={idx}>
                  <td className="font-mono font-bold">{comp.component}</td>
                  <td><Badge status={comp.status} size="sm" /></td>
                  <td>
                    <div className="health-bar-cell">
                      <span className="font-mono">{comp.health}%</span>
                      <div className="cell-progress">
                        <div 
                          className="cell-progress-bar"
                          style={{ 
                            width: `${comp.health}%`,
                            backgroundColor: comp.health > 80 ? '#16a34a' : comp.health > 60 ? '#d97706' : '#dc2626'
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-muted">{comp.lastCheck}</td>
                  <td className="observation-cell">{comp.observation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-Column Bottom Section: Recent Telemetry Records + Active Diagnostic Events */}
      <div className="dashboard-grid-2col bottom-tables-grid">
        <div className="eng-card recent-tests-card">
          <div className="eng-card-header">
            <span className="eng-card-title">
              <CheckCircle2 size={13} className="text-blue" />
              <span>RECENT TELEMETRY & ANALYSIS RECORDS</span>
            </span>
            <button 
              className="eng-btn eng-btn-secondary eng-btn-sm"
              onClick={() => onNavigate && onNavigate('HISTORY')}
            >
              <span>VIEW FULL HISTORY</span>
              <ChevronRight size={11} />
            </button>
          </div>
          <div className="eng-table-container">
            <table className="eng-table">
              <thead>
                <tr>
                  <th>RECORD ID</th>
                  <th>TIME</th>
                  <th>MOTOR</th>
                  <th>STATUS</th>
                  <th>HEALTH</th>
                  <th>SUSPECTED FAULT</th>
                  <th>SEVERITY</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredTests.map((test) => (
                  <tr key={test.testId || test.recordId}>
                    <td className="font-mono font-bold text-blue">{test.testId || test.recordId}</td>
                    <td className="font-mono text-muted">{test.time}</td>
                    <td className="font-mono">{test.motor.split(' ')[0]}</td>
                    <td><Badge status={test.status} size="sm" /></td>
                    <td className="font-mono">{test.health}</td>
                    <td className="font-mono">{test.suspectedFault}</td>
                    <td>{test.severity !== '—' ? <Badge status={test.severity} size="sm" /> : '—'}</td>
                    <td>
                      <button 
                        className="eng-btn eng-btn-secondary eng-btn-sm font-mono"
                        onClick={() => onNavigate && onNavigate('HISTORY')}
                      >
                        <Eye size={11} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="eng-card diagnostic-events-card">
          <div className="eng-card-header">
            <span className="eng-card-title">
              <AlertTriangle size={13} className="text-blue" />
              <span>ACTIVE DIAGNOSTIC EVENTS</span>
            </span>
            <span className="badge badge-info badge-sm">ESP32 REAL-TIME ALERTS</span>
          </div>
          <div className="eng-table-container">
            <table className="eng-table">
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>EVENT</th>
                  <th>SENSOR</th>
                  <th>VALUE</th>
                  <th>SEVERITY</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((evt) => (
                  <tr key={evt.id}>
                    <td className="font-mono text-muted">{evt.time}</td>
                    <td className="font-mono font-bold">{evt.event}</td>
                    <td className="font-mono">{evt.sensor}</td>
                    <td className="font-mono">{evt.value}</td>
                    <td><Badge status={evt.severity} size="sm" /></td>
                    <td>
                      <span className="event-status-pill font-mono">
                        {evt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .page-header-block {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 14px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .motor-spec-tag {
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-muted);
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
        }

        .synthetic-badge-tag {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10.5px;
          color: var(--text-muted);
        }

        .live-sim-badge {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          padding: 2px 7px;
          border-radius: var(--radius-sm);
          font-weight: 700;
        }

        .live-esp32-badge {
          background: #1e40af;
          color: #ffffff;
          border: 1px solid #1d4ed8;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .live-external-badge {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
          padding: 2px 7px;
          border-radius: var(--radius-sm);
          font-weight: 700;
        }

        .processed-features-strip {
          margin-bottom: 16px;
        }

        .pfs-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pfs-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
          padding: 12px 14px;
          background: #ffffff;
        }

        @media (max-width: 1200px) {
          .pfs-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .pfs-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .pfs-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          border-right: 1px solid #f1f5f9;
          padding-right: 8px;
        }

        .pfs-item:last-child {
          border-right: none;
        }

        .pfs-label {
          font-size: 9px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        .pfs-val {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-main);
        }

        .pfs-unit {
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 600;
        }

        .pfs-prov {
          font-size: 9px;
          color: #64748b;
        }

        .primary-measurements-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        @media (max-width: 1200px) {
          .primary-measurements-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .primary-measurements-grid {
            grid-template-columns: 1fr;
          }
        }

        .primary-vibration-card {
          background: #f8fafc;
          border-color: #bfdbfe;
        }

        .primary-signal-tag {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 700;
          color: var(--primary-blue);
        }

        .vibration-highlight-val {
          font-size: 24px !important;
          color: var(--primary-blue) !important;
          font-weight: 700 !important;
        }

        .primary-vibration-stats {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          color: #334155;
          margin-top: 2px;
        }

        .derived-rpm-card {
          background: #f8fafc;
          border: 1px dashed #93c5fd;
        }

        .derived-card-header {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #1e40af;
          font-weight: 700;
        }

        .derived-rpm-val {
          color: #1e40af !important;
        }

        .derived-rpm-sub {
          color: #3b82f6 !important;
          font-size: 9.5px !important;
        }

        .primary-pill {
          font-size: 9px;
          font-weight: 700;
          background: #eff6ff;
          color: var(--primary-blue);
          border: 1px solid #bfdbfe;
          padding: 1px 4px;
          border-radius: 2px;
          margin-left: 6px;
        }

        .dashboard-grid-2col {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 14px;
          margin-bottom: 16px;
        }

        @media (max-width: 1024px) {
          .dashboard-grid-2col {
            grid-template-columns: 1fr;
          }
        }

        .diagnostic-summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
          background: var(--bg-card-subtle);
          padding: 12px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
        }

        .diag-field {
          display: flex;
          flex-direction: column;
        }

        .diag-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 2px;
        }

        .diag-val {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
        }

        .text-large {
          font-size: 18px;
        }

        .text-sm {
          font-size: 11px;
        }

        .highlight-section {
          color: var(--primary-blue);
          font-weight: 700;
        }

        .fault-text {
          font-size: 11.5px;
          color: #b91c1c;
        }

        .recommendation-box {
          border-left: 3px solid var(--primary-blue);
          background: #eff6ff;
          padding: 10px 12px;
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
          margin-bottom: 10px;
        }

        .rec-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }

        .rec-title {
          font-size: 10px;
          font-weight: 700;
          color: var(--primary-blue);
          letter-spacing: 0.05em;
        }

        .rec-body {
          font-size: 11.5px;
          color: #1e3a8a;
          line-height: 1.4;
        }

        .sim-diagnostic-notice {
          font-size: 9.5px;
          color: #854d0e;
          background: #fefce8;
          border: 1px solid #fef08a;
          padding: 5px 8px;
          border-radius: var(--radius-sm);
        }

        .p-0 {
          padding: 0 !important;
        }

        .sensor-rows-list {
          display: flex;
          flex-direction: column;
        }

        .sensor-row-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 14px;
          border-bottom: 1px solid var(--border-subtle);
          transition: background 0.12s ease;
        }

        .sensor-row-item:last-child {
          border-bottom: none;
        }

        .sensor-row-item:hover {
          background: var(--bg-card-subtle);
        }

        .sensor-row-name {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-main);
          display: flex;
          align-items: center;
        }

        .sensor-row-sub {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 1px;
        }

        .sensor-row-reading {
          text-align: right;
        }

        .sensor-reading-val {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-main);
        }

        .sensor-reading-unit {
          font-size: 10.5px;
          color: var(--text-muted);
          font-weight: 400;
        }

        .sensor-reading-update {
          font-size: 9.5px;
          color: var(--text-muted);
        }

        .component-health-card {
          margin-bottom: 16px;
        }

        .section-meta-text {
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 600;
        }

        .font-bold {
          font-weight: 700;
        }

        .text-blue {
          color: var(--primary-blue);
        }

        .observation-cell {
          font-size: 11.5px;
          color: #334155;
          max-width: 400px;
          white-space: normal !important;
        }

        .health-bar-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 110px;
        }

        .cell-progress {
          flex: 1;
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        }

        .cell-progress-bar {
          height: 100%;
          border-radius: 3px;
        }

        .progress-track {
          width: 100%;
          height: 4px;
          background: #e2e8f0;
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 2px;
        }

        .event-status-pill {
          font-size: 9.5px;
          color: #475569;
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 2px;
        }

        /* Plant Fleet Overview Styles */
        .plant-fleet-section {
          margin-bottom: 24px;
        }

        .fleet-kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .fleet-kpi-card {
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }

        .fleet-kpi-card.kpi-healthy {
          border-left: 3px solid #16a34a;
        }

        .fleet-kpi-card.kpi-warning {
          border-left: 3px solid #f59e0b;
        }

        .fleet-kpi-card.kpi-fault {
          border-left: 3px solid #dc2626;
        }

        .fleet-kpi-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .fleet-kpi-val {
          font-size: 22px;
          font-weight: 700;
          margin-top: 4px;
          color: var(--text-main);
        }

        .fleet-kpi-unit {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .fleet-kpi-sub {
          font-size: 9.5px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .fleet-row:hover {
          background: #f8fafc;
        }

        .fleet-row-selected {
          background: #eff6ff !important;
          border-left: 3px solid var(--primary-blue);
        }

        .mb-16 {
          margin-bottom: 16px;
        }

        /* Selected Motor Section Header */
        .selected-motor-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f8fafc;
          border: 1px solid var(--border-subtle);
          border-left: 4px solid var(--primary-blue);
          border-radius: var(--radius-sm);
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .selected-motor-header-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .selected-motor-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .selected-motor-title {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: var(--text-main);
          margin: 0;
        }

        .selected-motor-meta-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10.5px;
          color: var(--text-muted);
        }

        .selected-motor-header-right {
          display: flex;
          align-items: center;
        }
      `}</style>
    </div>
  );
};
