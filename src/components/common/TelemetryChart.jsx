import React, { useState, useRef } from 'react';
import { Activity, Radio } from 'lucide-react';

export const TelemetryChart = ({ history = [], timeRange = 'Live (30s)' }) => {
  const [selectedChannel, setSelectedChannel] = useState('vibration');
  const [hoverIndex, setHoverIndex] = useState(null);
  const containerRef = useRef(null);

  // 4 Primary Hardware Transducer Channels (Vibration is Primary)
  const channels = {
    vibration: {
      name: 'Vibration (Primary)',
      unit: 'mm/s RMS',
      key: 'vibration',
      color: '#2563eb',
      lightColor: '#dbeafe',
      threshold: 4.5,
      thresholdLabel: 'ISO 10816 Alarm (4.5 mm/s)',
      yMin: 0,
      yMax: 10,
      isPrimary: true
    },
    current: {
      name: 'Current',
      unit: 'A',
      key: 'current',
      color: '#0891b2',
      lightColor: '#cffafe',
      threshold: 3.5,
      thresholdLabel: 'Rated FLC (3.5 A)',
      yMin: 0,
      yMax: 6,
    },
    voltage: {
      name: 'Voltage',
      unit: 'V',
      key: 'voltage',
      color: '#7c3aed',
      lightColor: '#ede9fe',
      threshold: 242,
      thresholdLabel: 'High Limit (+5% 242 V)',
      thresholdLow: 218,
      thresholdLowLabel: 'Low Limit (-5% 218 V)',
      yMin: 200,
      yMax: 260,
    },
    temperature: {
      name: 'Temperature',
      unit: '°C',
      key: 'temperature',
      color: '#ea580c',
      lightColor: '#ffedd5',
      threshold: 75,
      thresholdLabel: 'Class B Warning (75 °C)',
      yMin: 20,
      yMax: 100,
    },
  };

  const active = channels[selectedChannel] || channels.vibration;
  const data = history.length > 0 ? history : [];

  const values = data.map(d => d[active.key]).filter(v => v !== undefined && !isNaN(v));
  const currentVal = values.length > 0 ? values[values.length - 1] : 0;
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 0;
  const avgVal = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 0;

  const width = 850;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 28, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const computedMin = Math.min(active.yMin, minVal * 0.95);
  const computedMax = Math.max(active.yMax, maxVal * 1.05);

  const getY = (val) => {
    const clamped = Math.max(computedMin, Math.min(computedMax, val));
    const normalized = (clamped - computedMin) / (computedMax - computedMin || 1);
    return padding.top + chartH - normalized * chartH;
  };

  const getX = (index) => {
    if (data.length <= 1) return padding.left;
    return padding.left + (index / (data.length - 1)) * chartW;
  };

  let pathD = '';
  let areaD = '';
  if (data.length > 0) {
    data.forEach((d, idx) => {
      const x = getX(idx);
      const y = getY(d[active.key]);
      if (idx === 0) {
        pathD = `M ${x} ${y}`;
        areaD = `M ${x} ${padding.top + chartH} L ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
        areaD += ` L ${x} ${y}`;
      }
    });
    areaD += ` L ${padding.left + chartW} ${padding.top + chartH} Z`;
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const val = computedMin + ratio * (computedMax - computedMin);
    return {
      value: val < 10 ? val.toFixed(1) : Math.round(val),
      y: padding.top + chartH - ratio * chartH,
    };
  });

  const thresholdY = active.threshold ? getY(active.threshold) : null;

  const handleMouseMove = (e) => {
    if (!containerRef.current || data.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (mouseX - padding.left) / chartW));
    const idx = Math.round(ratio * (data.length - 1));
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const hoveredItem = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null;

  return (
    <div className="eng-card telemetry-card">
      {/* Header bar */}
      <div className="eng-card-header">
        <div className="chart-header-left">
          <span className="eng-card-title">
            <Activity size={13} className="text-blue" />
            <span>PRIMARY TELEMETRY STREAMS</span>
          </span>
          <span className="telemetry-source-badge font-mono">
            {timeRange} • 4 TRANSDUCER CHANNELS
          </span>
        </div>

        {/* Channel Switcher (4 Channels) */}
        <div className="channel-switcher">
          {Object.entries(channels).map(([key, ch]) => (
            <button
              key={key}
              className={`channel-btn ${selectedChannel === key ? 'active' : ''} ${ch.isPrimary ? 'btn-primary-channel' : ''}`}
              onClick={() => setSelectedChannel(key)}
            >
              <span className="channel-indicator" style={{ backgroundColor: ch.color }} />
              <span>{ch.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Body: Stats Summary Bar + SVG Chart */}
      <div className="eng-card-body chart-body">
        <div className="chart-stats-bar">
          <div className="stat-group">
            <span className="stat-label">CURRENT</span>
            <span className="stat-value font-mono" style={{ color: active.color }}>
              {currentVal} <span className="stat-unit">{active.unit}</span>
            </span>
          </div>
          <div className="stat-divider" />
          <div className="stat-group">
            <span className="stat-label">AVG</span>
            <span className="stat-value font-mono">
              {avgVal} <span className="stat-unit">{active.unit}</span>
            </span>
          </div>
          <div className="stat-divider" />
          <div className="stat-group">
            <span className="stat-label">MIN</span>
            <span className="stat-value font-mono">
              {minVal} <span className="stat-unit">{active.unit}</span>
            </span>
          </div>
          <div className="stat-divider" />
          <div className="stat-group">
            <span className="stat-label">MAX</span>
            <span className="stat-value font-mono">
              {maxVal} <span className="stat-unit">{active.unit}</span>
            </span>
          </div>
          <div className="stat-divider" />
          <div className="stat-group threshold-stat">
            <span className="stat-label">THRESHOLD</span>
            <span className="stat-threshold-val font-mono">
              {active.threshold} {active.unit}
            </span>
          </div>
        </div>

        <div 
          className="svg-chart-container" 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="telemetry-svg"
            preserveAspectRatio="none"
          >
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={tick.y}
                  x2={padding.left + chartW}
                  y2={tick.y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={tick.y + 3.5}
                  textAnchor="end"
                  fontSize="9.5"
                  fill="#94a3b8"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {tick.value}
                </text>
              </g>
            ))}

            {thresholdY !== null && thresholdY >= padding.top && thresholdY <= padding.top + chartH && (
              <g>
                <line
                  x1={padding.left}
                  y1={thresholdY}
                  x2={padding.left + chartW}
                  y2={thresholdY}
                  stroke="#ef4444"
                  strokeWidth="1.2"
                  strokeDasharray="4 2"
                />
                <text
                  x={padding.left + chartW - 4}
                  y={thresholdY - 4}
                  textAnchor="end"
                  fontSize="8.5"
                  fill="#dc2626"
                  fontWeight="600"
                >
                  {active.thresholdLabel}
                </text>
              </g>
            )}

            <defs>
              <linearGradient id={`grad-${selectedChannel}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={active.color} stopOpacity="0.14" />
                <stop offset="100%" stopColor={active.color} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {areaD && (
              <path d={areaD} fill={`url(#grad-${selectedChannel})`} />
            )}

            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={active.color}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {data.length > 0 && [0, Math.floor(data.length / 2), data.length - 1].map((idx) => {
              const item = data[idx];
              if (!item) return null;
              return (
                <text
                  key={idx}
                  x={getX(idx)}
                  y={height - 8}
                  textAnchor={idx === 0 ? 'start' : idx === data.length - 1 ? 'end' : 'middle'}
                  fontSize="9"
                  fill="#94a3b8"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {item.time}
                </text>
              );
            })}

            {hoverIndex !== null && hoveredItem && (
              <g>
                <line
                  x1={getX(hoverIndex)}
                  y1={padding.top}
                  x2={getX(hoverIndex)}
                  y2={padding.top + chartH}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(hoveredItem[active.key])}
                  r="4"
                  fill={active.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>

          {hoverIndex !== null && hoveredItem && (
            <div 
              className="chart-tooltip font-mono"
              style={{
                left: `${(getX(hoverIndex) / width) * 100}%`,
                top: `${(getY(hoveredItem[active.key]) / height) * 100}%`
              }}
            >
              <div className="tooltip-time">{hoveredItem.time}</div>
              <div className="tooltip-val">
                {hoveredItem[active.key]} {active.unit}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .telemetry-card {
          margin-bottom: 16px;
        }

        .chart-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .telemetry-source-badge {
          font-size: 10px;
          color: var(--text-muted);
          background: #e2e8f0;
          padding: 2px 6px;
          border-radius: var(--radius-sm);
        }

        .channel-switcher {
          display: flex;
          background: #e2e8f0;
          padding: 2px;
          border-radius: var(--radius-sm);
          gap: 2px;
        }

        .channel-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border: none;
          background: transparent;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.12s ease;
        }

        .channel-btn:hover {
          color: var(--text-main);
        }

        .channel-btn.active {
          background: #ffffff;
          color: var(--text-main);
          box-shadow: 0 1px 2px rgba(0,0,0,0.06);
        }

        .channel-indicator {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .chart-body {
          padding: 10px 14px 14px;
        }

        .chart-stats-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding-bottom: 8px;
          margin-bottom: 6px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .stat-group {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .stat-label {
          font-size: 9.5px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-main);
        }

        .stat-unit {
          font-size: 10.5px;
          color: var(--text-muted);
          font-weight: 400;
        }

        .stat-divider {
          width: 1px;
          height: 12px;
          background: var(--border-subtle);
        }

        .threshold-stat {
          margin-left: auto;
        }

        .stat-threshold-val {
          font-size: 11.5px;
          font-weight: 600;
          color: #dc2626;
        }

        .svg-chart-container {
          position: relative;
          width: 100%;
          height: 200px;
        }

        .telemetry-svg {
          width: 100%;
          height: 100%;
          overflow: visible;
          cursor: crosshair;
        }

        .chart-tooltip {
          position: absolute;
          transform: translate(-50%, -120%);
          background: #0f172a;
          color: #ffffff;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          font-size: 10.5px;
          pointer-events: none;
          white-space: nowrap;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          z-index: 10;
        }

        .tooltip-time {
          font-size: 9px;
          color: #94a3b8;
        }

        .tooltip-val {
          font-weight: 600;
          color: #38bdf8;
        }
      `}</style>
    </div>
  );
};
