import React, { useState } from 'react';
import { 
  Zap, 
  Thermometer, 
  Radio, 
  Activity, 
  AlertTriangle,
  Layers,
  ChevronDown
} from 'lucide-react';
import { Badge } from '../common/Badge';

/**
 * Clean Real-Time Sensor Chart Component
 * Renders real time-series data with dynamic scaling and proper empty states.
 */
const SensorSectionChart = ({ 
  history = [], 
  seriesConfig = [], 
  yUnit = '', 
  height = 160 
}) => {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!history || history.length < 2) {
    return (
      <div className="empty-chart-box font-mono">
        <Activity size={16} className="text-muted" />
        <span>NO DATA AVAILABLE — WAITING FOR REAL TELEMETRY STREAM</span>
      </div>
    );
  }

  // Calculate global min and max across all active series
  let allValues = [];
  seriesConfig.forEach(s => {
    history.forEach(h => {
      const v = h[s.key];
      if (v !== undefined && v !== null && !isNaN(v)) {
        allValues.push(v);
      }
    });
  });

  if (allValues.length === 0) {
    return (
      <div className="empty-chart-box font-mono">
        <Activity size={16} className="text-muted" />
        <span>NO DATA AVAILABLE</span>
      </div>
    );
  }

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const range = (rawMax - rawMin) || 1;
  const paddingY = 15;
  const w = 780;
  const h = height;
  const chartW = w - 60;
  const chartH = h - paddingY * 2;

  const getY = (val) => {
    const norm = (val - rawMin) / range;
    return paddingY + chartH - (norm * chartH);
  };

  const getX = (idx) => {
    return 45 + (idx / (history.length - 1)) * chartW;
  };

  return (
    <div className="sensor-chart-container">
      <svg 
        viewBox={`0 0 ${w} ${h}`} 
        className="sensor-timeseries-svg"
        preserveAspectRatio="none"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((ratio) => {
          const y = paddingY + chartH - ratio * chartH;
          const val = (rawMin + ratio * range).toFixed(1);
          return (
            <g key={ratio}>
              <line x1="45" y1={y} x2={w - 15} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x="40" y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="JetBrains Mono, monospace">
                {val}
              </text>
            </g>
          );
        })}

        {/* Series Paths */}
        {seriesConfig.map((s) => {
          let pathD = '';
          history.forEach((h, idx) => {
            const v = h[s.key];
            if (v !== undefined && v !== null && !isNaN(v)) {
              const x = getX(idx);
              const y = getY(v);
              pathD += (pathD === '' ? `M ${x} ${y}` : ` L ${x} ${y}`);
            }
          });

          return (
            <path
              key={s.key}
              d={pathD}
              fill="none"
              stroke={s.color}
              strokeWidth={s.strokeWidth || 1.8}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}

        {/* Hover inspection guide */}
        {hoverIndex !== null && hoverIndex >= 0 && hoverIndex < history.length && (
          <line
            x1={getX(hoverIndex)}
            y1={paddingY}
            x2={getX(hoverIndex)}
            y2={paddingY + chartH}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
        )}
      </svg>

      {/* Axis Footer */}
      <div className="sensor-chart-axis-footer font-mono">
        <span>{history[0]?.time || '0s'}</span>
        <span className="unit-label">UNIT: {yUnit}</span>
        <span>{history[history.length - 1]?.time || 'Now'}</span>
      </div>
    </div>
  );
};

export const SensorsPage = ({ snapshot }) => {
  const history = snapshot?.history || [];
  const metrics = snapshot?.metrics || {};
  const hasReal = Boolean(snapshot?.hasRealTelemetry);

  const electricalSeries = [
    { key: 'voltage', label: 'Voltage', color: '#7c3aed' },
    { key: 'current', label: 'Current', color: '#0891b2' }
  ];

  const thermalSeries = [
    { key: 'temperature', label: 'Temperature', color: '#ea580c' }
  ];

  const vibrationSeries = [
    { key: 'vibration', label: 'Magnitude', color: '#2563eb', strokeWidth: 2.2 },
    { key: 'vibrationX', label: 'Axis X', color: '#38bdf8', strokeWidth: 1.2 },
    { key: 'vibrationY', label: 'Axis Y', color: '#60a5fa', strokeWidth: 1.2 },
    { key: 'vibrationZ', label: 'Axis Z', color: '#1d4ed8', strokeWidth: 1.2 }
  ];

  return (
    <div className="sensors-page">
      {/* Page Header */}
      <div className="sensors-header-card">
        <div className="sensors-header-left">
          <h1 className="sensors-page-title">DETAILED SENSOR MONITORING</h1>
          <div className="sensors-page-subtitle">
            Calibrated electrical, thermal, and 3-axis vibration instrumentation for motor MTR-001
          </div>
        </div>
        <div className="sensors-header-right font-mono">
          <span className="asset-tag">ASSET: MTR-001</span>
          <span className="source-tag">DATA SOURCE: ESP32 HARDWARE</span>
        </div>
      </div>

      {/* 1. ELECTRICAL SECTION */}
      <div className="sensor-section-card">
        <div className="section-card-header">
          <div className="section-title-group">
            <Zap size={15} className="text-blue" />
            <h2 className="section-title">ELECTRICAL MEASUREMENTS</h2>
          </div>
          <span className="font-mono text-xs text-muted">VOLTAGE • CURRENT • POWER</span>
        </div>

        <div className="section-card-body">
          {/* Key Metrics Row */}
          <div className="metric-row-grid">
            <div className="sensor-stat-box">
              <span className="stat-label">VOLTAGE (RMS)</span>
              <div className="stat-val-group font-mono">
                <span className="stat-val">{hasReal && metrics.voltage != null ? metrics.voltage : '--'}</span>
                <span className="stat-unit">{hasReal && metrics.voltage != null ? 'V' : ''}</span>
              </div>
              <span className="stat-sub font-mono">Line Potential Transducer</span>
            </div>

            <div className="sensor-stat-box">
              <span className="stat-label">CURRENT (RMS)</span>
              <div className="stat-val-group font-mono">
                <span className="stat-val">{hasReal && metrics.current != null ? metrics.current : '--'}</span>
                <span className="stat-unit">{hasReal && metrics.current != null ? 'A' : ''}</span>
              </div>
              <span className="stat-sub font-mono">Hall Effect Current CT</span>
            </div>

            <div className="sensor-stat-box">
              <span className="stat-label">ACTIVE POWER</span>
              <div className="stat-val-group font-mono">
                <span className="stat-val text-blue">{hasReal && metrics.power != null ? metrics.power : '--'}</span>
                <span className="stat-unit">{hasReal && metrics.power != null ? 'kW' : ''}</span>
              </div>
              <span className="stat-sub font-mono">Derived: (V × I × √3 × PF)</span>
            </div>
          </div>

          {/* Electrical Chart */}
          <div className="chart-wrapper-block">
            <div className="chart-legend-row font-mono">
              <span className="legend-item"><span className="legend-dot" style={{ background: '#7c3aed' }} /> Voltage (V)</span>
              <span className="legend-item"><span className="legend-dot" style={{ background: '#0891b2' }} /> Current (A)</span>
            </div>
            <SensorSectionChart 
              history={history} 
              seriesConfig={electricalSeries} 
              yUnit="V / A" 
              height={140}
            />
          </div>
        </div>
      </div>

      {/* 2. THERMAL SECTION */}
      <div className="sensor-section-card">
        <div className="section-card-header">
          <div className="section-title-group">
            <Thermometer size={15} className="text-orange" />
            <h2 className="section-title">THERMAL MEASUREMENTS</h2>
          </div>
          <span className="font-mono text-xs text-muted">SURFACE RTD PROBE • THERMAL TREND</span>
        </div>

        <div className="section-card-body">
          <div className="metric-row-grid">
            <div className="sensor-stat-box">
              <span className="stat-label">SURFACE TEMPERATURE</span>
              <div className="stat-val-group font-mono">
                <span className="stat-val">{hasReal && metrics.temperature != null ? metrics.temperature : '--'}</span>
                <span className="stat-unit">{hasReal && metrics.temperature != null ? '°C' : ''}</span>
              </div>
              <span className="stat-sub font-mono">Motor Frame RTD Sensor</span>
            </div>

            <div className="sensor-stat-box">
              <span className="stat-label">TEMPERATURE RISE (ΔT)</span>
              <div className="stat-val-group font-mono">
                <span className="stat-val">{hasReal && metrics.tempRise != null ? `+${metrics.tempRise}` : '--'}</span>
                <span className="stat-unit">{hasReal && metrics.tempRise != null ? '°C' : ''}</span>
              </div>
              <span className="stat-sub font-mono">Baseline Delta (Awaiting Baseline)</span>
            </div>
          </div>

          {/* Thermal Chart */}
          <div className="chart-wrapper-block">
            <div className="chart-legend-row font-mono">
              <span className="legend-item"><span className="legend-dot" style={{ background: '#ea580c' }} /> Temperature (°C)</span>
            </div>
            <SensorSectionChart 
              history={history} 
              seriesConfig={thermalSeries} 
              yUnit="°C" 
              height={140}
            />
          </div>
        </div>
      </div>

      {/* 3. VIBRATION SECTION */}
      <div className="sensor-section-card">
        <div className="section-card-header">
          <div className="section-title-group">
            <Radio size={15} className="text-blue" />
            <h2 className="section-title">VIBRATION MEASUREMENTS</h2>
          </div>
          <span className="font-mono text-xs text-muted">TRIAXIAL ACCELEROMETER (X, Y, Z & MAGNITUDE)</span>
        </div>

        <div className="section-card-body">
          <div className="metric-row-grid">
            <div className="sensor-stat-box stat-highlight">
              <span className="stat-label text-blue">VIBRATION MAGNITUDE</span>
              <div className="stat-val-group font-mono">
                <span className="stat-val text-blue">{hasReal && metrics.vibrationMagnitude != null ? metrics.vibrationMagnitude : '--'}</span>
                <span className="stat-unit">{hasReal && metrics.vibrationMagnitude != null ? 'mm/s' : ''}</span>
              </div>
              <span className="stat-sub font-mono">Calculated 3D Vector Sum</span>
            </div>

            <div className="sensor-stat-box">
              <span className="stat-label">AXIS X (HORIZONTAL)</span>
              <div className="stat-val-group font-mono">
                <span className="stat-val">{hasReal && metrics.vibrationX != null ? metrics.vibrationX : '--'}</span>
                <span className="stat-unit">{hasReal && metrics.vibrationX != null ? 'mm/s' : ''}</span>
              </div>
              <span className="stat-sub font-mono">Raw Accelerometer X</span>
            </div>

            <div className="sensor-stat-box">
              <span className="stat-label">AXIS Y (VERTICAL)</span>
              <div className="stat-val-group font-mono">
                <span className="stat-val">{hasReal && metrics.vibrationY != null ? metrics.vibrationY : '--'}</span>
                <span className="stat-unit">{hasReal && metrics.vibrationY != null ? 'mm/s' : ''}</span>
              </div>
              <span className="stat-sub font-mono">Raw Accelerometer Y</span>
            </div>

            <div className="sensor-stat-box">
              <span className="stat-label">AXIS Z (AXIAL)</span>
              <div className="stat-val-group font-mono">
                <span className="stat-val">{hasReal && metrics.vibrationZ != null ? metrics.vibrationZ : '--'}</span>
                <span className="stat-unit">{hasReal && metrics.vibrationZ != null ? 'mm/s' : ''}</span>
              </div>
              <span className="stat-sub font-mono">Raw Accelerometer Z</span>
            </div>
          </div>

          {/* Vibration Chart */}
          <div className="chart-wrapper-block">
            <div className="chart-legend-row font-mono">
              <span className="legend-item"><span className="legend-dot" style={{ background: '#2563eb' }} /> Magnitude</span>
              <span className="legend-item"><span className="legend-dot" style={{ background: '#38bdf8' }} /> Axis X</span>
              <span className="legend-item"><span className="legend-dot" style={{ background: '#60a5fa' }} /> Axis Y</span>
              <span className="legend-item"><span className="legend-dot" style={{ background: '#1d4ed8' }} /> Axis Z</span>
            </div>
            <SensorSectionChart 
              history={history} 
              seriesConfig={vibrationSeries} 
              yUnit="mm/s" 
              height={160}
            />
          </div>
        </div>
      </div>

      <style>{`
        .sensors-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 1720px;
          margin: 0 auto;
        }

        .sensors-header-card {
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

        .sensors-page-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.01em;
          margin: 0;
        }

        .sensors-page-subtitle {
          font-size: 11.5px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .sensors-header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .asset-tag {
          font-size: 11px;
          font-weight: 700;
          background: #eff6ff;
          color: var(--primary-blue);
          border: 1px solid #bfdbfe;
          padding: 2px 7px;
          border-radius: 3px;
        }

        .source-tag {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 2px 7px;
          border-radius: 3px;
        }

        .sensor-section-card {
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          display: flex;
          flex-direction: column;
        }

        .section-card-header {
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .section-title-group {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .section-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: 0.03em;
          margin: 0;
        }

        .section-card-body {
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .metric-row-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }

        .sensor-stat-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-highlight {
          border-color: #bfdbfe;
          background: #eff6ff;
        }

        .stat-label {
          font-size: 9.5px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        .stat-val-group {
          display: flex;
          align-items: baseline;
          gap: 3px;
        }

        .stat-val {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-main);
        }

        .stat-unit {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .stat-sub {
          font-size: 9px;
          color: #64748b;
        }

        .chart-wrapper-block {
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: var(--radius-sm);
          padding: 10px 12px;
        }

        .chart-legend-row {
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 10px;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          display: inline-block;
        }

        .sensor-chart-container {
          width: 100%;
        }

        .sensor-timeseries-svg {
          width: 100%;
          height: auto;
          display: block;
        }

        .sensor-chart-axis-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 9px;
          color: #94a3b8;
          margin-top: 4px;
        }

        .unit-label {
          font-weight: 600;
        }

        .empty-chart-box {
          height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 11px;
          color: #94a3b8;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: var(--radius-sm);
        }
      `}</style>
    </div>
  );
};
