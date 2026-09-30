import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Cpu, 
  Server, 
  Database, 
  Radio, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Terminal,
  UploadCloud,
  FileSpreadsheet,
  Network,
  Activity,
  Zap,
  Thermometer,
  ShieldCheck,
  RotateCw
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { MOTOR_REGISTRY } from '../../services/motorRegistry';
import { DATA_SOURCE_TYPES } from '../../services/dataIngestion/motorDataModel';
import { apiClient } from '../../services/apiClient';

export const SystemPage = ({ snapshot }) => {
  const isExternal = snapshot?.dataSourceType === DATA_SOURCE_TYPES.EXTERNAL_LAPTOP;
  const [backendStatus, setBackendStatus] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const checkBackend = async () => {
      try {
        const data = await apiClient.getSystemStatus();
        if (isMounted) setBackendStatus(data);
      } catch (e) {
        if (isMounted) setBackendStatus({ backend: { status: 'STANDALONE_DEV' } });
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 4000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  const espStatus = backendStatus?.esp32Hardware?.status || (snapshot?.esp32Connected ? 'CONNECTED' : (snapshot?.hasRealTelemetry ? 'STALE' : 'DISCONNECTED'));
  const espColor = espStatus === 'CONNECTED' ? 'healthy' : espStatus === 'STALE' ? 'warning' : 'fault';

  const systemStatusItems = [
    {
      label: 'ESP32 DATA SOURCE (HARDWARE)',
      value: `ESP32 Active (${backendStatus?.esp32Hardware?.packetsReceived ?? (backendStatus?.rawTelemetryCount ?? 0)} Packets Ingested)`,
      status: espStatus,
      icon: Radio,
      details: backendStatus?.esp32Hardware?.lastPacketAt 
        ? `Last Hardware Packet: ${new Date(backendStatus.esp32Hardware.lastPacketAt).toLocaleString()} • Fs: ${backendStatus.esp32Hardware.samplingRate || 2560} Hz`
        : 'Awaiting raw sensor telemetry from ESP32 hardware on /api/v1/telemetry/raw',
      color: espColor
    },
    {
      label: 'PRIMARY TELEMETRY SOURCE',
      value: 'ESP32 Real Hardware Transducers',
      status: 'ESP32 REAL DATA',
      icon: Network,
      details: 'Physical ESP32 raw sensor streaming for voltage, current, temperature, and 3-axis vibration (X, Y, Z). Synthetic data disabled.',
      color: 'healthy'
    },
    {
      label: 'EXTERNAL ACQUISITION INTERFACE',
      value: 'DataIngestionService Abstraction',
      status: 'ONLINE',
      icon: Server,
      details: 'Decoupled transport adapter ready for REST API, WebSocket, MQTT, or TCP socket streaming.',
      color: 'healthy'
    },
    {
      label: 'OFFLINE DATA INGESTION',
      value: 'CSV / JSON / XML Parser Ready',
      status: 'ONLINE',
      icon: UploadCloud,
      details: 'Supports raw transducer waveforms and pre-extracted feature sets with automatic field mapping.',
      color: 'healthy'
    },
    {
      label: 'COMMON MOTOR DATA MODEL',
      value: 'Normalized Ingestion Schema',
      status: 'ONLINE',
      icon: Layers,
      details: 'Extensible schema encapsulating Electrical, Thermal, Vibration, Derived RPM, and Provenance metadata.',
      color: 'healthy'
    },
    {
      label: 'TRANSDUCER CHANNELS (DAQ)',
      value: '4 Physical Transducers',
      status: 'ONLINE',
      icon: Radio,
      details: 'Vibration (IEPE Accelerometer), Current (Hall CT), Voltage (PT), Temperature (RTD) sampled by External Laptop.',
      color: 'healthy'
    },
    {
      label: 'FEATURE PROVENANCE ENGINE',
      value: 'Active Tracking',
      status: 'ONLINE',
      icon: Activity,
      details: 'Differentiates Physical Transducers, External Features, MOTORSYNC Diagnostics, and Synthetic values.',
      color: 'healthy'
    },
    {
      label: 'MONITORED MOTOR ASSET',
      value: '1 Physical Unit (MTR-001)',
      status: 'ACTIVE',
      icon: Cpu,
      details: 'Dedicated real-time telemetry pipeline for connected motor MTR-001 via ESP32 Wi-Fi hardware stream.',
      color: 'healthy'
    },
    {
      label: 'AI DIAGNOSTIC ENGINE',
      value: 'Experimental Model v0.1-dev',
      status: 'EXPERIMENTAL',
      icon: Cpu,
      details: 'Rule-feature diagnostic fusion model (Not Trained). Ready for future ML classifier plugin via ModelRegistry.',
      color: 'warning'
    },
    {
      label: 'BASELINE MANAGEMENT SYSTEM',
      value: 'Per-Motor Commissioning Baselines',
      status: 'ONLINE',
      icon: ShieldCheck,
      details: 'Calculates thermal rise (ΔT), vibration rise, and current deviations against healthy operating baseline.',
      color: 'healthy'
    },
    {
      label: 'REST API BACKEND (/api/v1)',
      value: backendStatus?.backend?.status === 'ONLINE' ? 'ONLINE (Port 3001)' : 'STANDALONE / READY',
      status: backendStatus?.backend?.status === 'ONLINE' ? 'ONLINE' : 'ACTIVE',
      icon: Server,
      details: 'Express REST API with complete telemetry ingestion, CRUD, diagnostics, baselines, and alerts.',
      color: 'healthy'
    },
    {
      label: 'SQLITE PERSISTENT STORAGE',
      value: backendStatus?.database?.status === 'CONNECTED' ? 'SQLite3 Connected (WAL)' : 'Persistent Storage Active',
      status: 'ONLINE',
      icon: Database,
      details: 'Indexed storage for motors, telemetry, baselines, alerts, diagnostics, and offline analysis runs.',
      color: 'healthy'
    },
    {
      label: 'LOCAL STORAGE & HISTORY',
      value: 'Persistent Session Cache',
      status: 'ONLINE',
      icon: Database,
      details: 'Records historical telemetry runs with full source provenance tracking (SYNTHETIC, EXTERNAL_LAPTOP, OFFLINE_FILE).',
      color: 'healthy'
    }
  ];

  return (
    <div className="system-page">
      {/* Title */}
      <div className="page-header-block">
        <div>
          <h1 className="page-title">SYSTEM ARCHITECTURE & DATA INGESTION INFRASTRUCTURE</h1>
          <div className="page-subtitle">Real-world data acquisition topology, telemetry ingestion pipeline, and feature provenance specification.</div>
        </div>
        <div className="system-env-tag font-mono">
          MOTORSYNC CENTRAL PLATFORM • EXTERNAL DAQ INGESTION
        </div>
      </div>

      {/* Real-World Architecture Notice Banner */}
      <div className="hardware-limitation-banner">
        <Network size={18} className="banner-icon" />
        <div className="banner-content">
          <div className="banner-title">REAL-WORLD INGESTION TOPOLOGY: EXTERNAL DATA ACQUISITION & MONITORING</div>
          <div className="banner-text">
            <strong>MOTORSYNC is the central monitoring and diagnostic platform</strong> — it is NOT directly wired to microcontroller or sensor pins. 
            In the physical facility, an <strong>External Data Acquisition Laptop</strong> reads motor sensors, executes signal processing and feature extraction, and transmits the resulting <strong>Motor Data Payload</strong> to MOTORSYNC over the network.
          </div>
        </div>
      </div>

      {/* 3 Data Source Classifications Bar */}
      <div className="data-sources-legend-card eng-card">
        <div className="data-sources-legend-grid font-mono">
          <div className="source-legend-item">
            <span className="source-legend-badge badge-synthetic">SYNTHETIC DATA PROVIDER</span>
            <span className="source-legend-desc">Simulation harness generating multi-feature telemetry for UI and algorithm validation</span>
          </div>
          <div className="source-legend-item">
            <span className="source-legend-badge badge-hardware">EXTERNAL ACQUISITION LAPTOP</span>
            <span className="source-legend-desc">Production source: external laptop performs DAQ + feature extraction and streams payload</span>
          </div>
          <div className="source-legend-item">
            <span className="source-legend-badge badge-uploaded">OFFLINE DATASET INGESTION</span>
            <span className="source-legend-desc">Recorded motor test files containing raw transducer channels or pre-processed features</span>
          </div>
        </div>
      </div>

      {/* Real-World Data Flow Diagram (Requirement 1, 4) */}
      <div className="eng-card architecture-card">
        <div className="eng-card-header">
          <span className="eng-card-title">
            <Network size={13} className="text-blue" />
            <span>REAL-WORLD END-TO-END DATA-FLOW ARCHITECTURE</span>
          </span>
          <span className="badge badge-info badge-sm">EXTERNAL LAPTOP → MOTORSYNC</span>
        </div>
        <div className="eng-card-body">
          <div className="dataflow-diagram-container">
            <div className="flow-column">
              <div className="flow-box source-box">
                <div className="flow-box-title font-mono">1. PHYSICAL MOTOR</div>
                <div className="flow-box-desc">Industrial 3-Phase Induction Motor (e.g. MTR-001)</div>
              </div>
              <div className="flow-arrow-down font-mono">↓ Physical Sensing</div>
              <div className="flow-box source-box">
                <div className="flow-box-title font-mono">2. TRANSDUCERS (4 INPUTS)</div>
                <div className="flow-box-desc">Vibration (IEPE) • Current (CT) • Voltage (PT) • Temp (RTD)</div>
              </div>
              <div className="flow-arrow-down font-mono">↓ High-Rate Analog / Digital Capture</div>
              <div className="flow-box external-box">
                <div className="flow-box-title font-mono">3. EXTERNAL DAQ LAPTOP</div>
                <div className="flow-box-desc">Data Acquisition Hardware + Signal Processing + Feature Extraction</div>
              </div>
              <div className="flow-arrow-down font-mono">↓ Formatted Telemetry JSON Payload</div>
              <div className="flow-box network-box">
                <div className="flow-box-title font-mono">4. NETWORK / API RECEIVER</div>
                <div className="flow-box-desc">REST API / WebSocket / MQTT / TCP Data Ingestion Receiver</div>
              </div>
              <div className="flow-arrow-down font-mono">↓ Ingestion into Common Motor Data Model</div>
              <div className="flow-box motorsync-box">
                <div className="flow-box-title font-mono">5. MOTORSYNC CENTRAL PLATFORM</div>
                <div className="flow-box-desc">Data Storage • Fleet Overview • Live Dashboard • Diagnostics • History</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Facility Motor Registry */}
      <div className="eng-card status-grid-card">
        <div className="eng-card-header">
          <span className="eng-card-title">
            <Layers size={13} className="text-blue" />
            <span>FACILITY MOTOR FLEET REGISTRY & ASSET SPECIFICATIONS</span>
          </span>
          <span className="font-mono text-xs text-muted">5 ASSETS REGISTERED • COMMON DATA MODEL</span>
        </div>
        <div className="eng-table-container">
          <table className="eng-table">
            <thead>
              <tr>
                <th>MOTOR ID</th>
                <th>NAME & APPLICATION</th>
                <th>LOCATION</th>
                <th>TYPE</th>
                <th>RATED PWR</th>
                <th>RATED VOLT/CURR</th>
                <th>RATED RPM (1X FREQ)</th>
                <th>DEFAULT STATUS</th>
              </tr>
            </thead>
            <tbody>
              {MOTOR_REGISTRY.map((m) => (
                <tr key={m.motorId}>
                  <td className="font-mono font-bold text-blue">{m.motorId}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                    <div className="font-mono text-xs text-muted">{m.serialNumber}</div>
                  </td>
                  <td className="font-mono text-xs">{m.location} ({m.facilityArea})</td>
                  <td className="font-mono text-xs">{m.type}</td>
                  <td className="font-mono">{m.powerKw} kW</td>
                  <td className="font-mono">{m.ratedVoltage} • {m.ratedCurrent}</td>
                  <td className="font-mono">{m.ratedRPM} RPM ({m.nominalFreq1X} Hz)</td>
                  <td><Badge status={m.baseStatus} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Status Table */}
      <div className="eng-card status-grid-card">
        <div className="eng-card-header">
          <span className="eng-card-title">
            <Server size={13} className="text-blue" />
            <span>INGESTION & SUBSYSTEM STATUS</span>
          </span>
          <span className="font-mono text-xs text-muted">8 SUBSYSTEMS MONITORED</span>
        </div>
        <div className="eng-table-container">
          <table className="eng-table">
            <thead>
              <tr>
                <th>SUBSYSTEM</th>
                <th>CURRENT STATE</th>
                <th>CONNECTION STATUS</th>
                <th>OPERATIONAL NOTES</th>
              </tr>
            </thead>
            <tbody>
              {systemStatusItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <tr key={idx}>
                    <td className="font-mono font-bold">
                      <div className="subsystem-name-cell">
                        <Icon size={13} className="text-muted" />
                        <span>{item.label}</span>
                      </div>
                    </td>
                    <td className="font-mono">{item.value}</td>
                    <td><Badge status={item.status} size="sm" /></td>
                    <td className="font-mono text-muted text-xs">{item.details}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature Provenance Architecture (Requirement 3, 11) */}
      <div className="eng-card architecture-card">
        <div className="eng-card-header">
          <span className="eng-card-title">
            <Activity size={13} className="text-blue" />
            <span>FEATURE PROVENANCE & ARCHITECTURAL CLASSIFICATION</span>
          </span>
          <span className="badge badge-info badge-sm">CLEAR SEPARATION</span>
        </div>
        <div className="eng-card-body">
          <p className="arch-intro">
            MOTORSYNC clearly distinguishes physical transducer measurements from externally calculated features and platform-level diagnostic assessments:
          </p>

          <div className="provenance-grid font-mono">
            {/* 1. Physical Measurements */}
            <div className="provenance-card">
              <div className="prov-header text-blue">
                <Radio size={13} />
                <span>1. PHYSICAL MEASUREMENTS</span>
              </div>
              <div className="prov-source">Acquired by External DAQ Transducers</div>
              <ul className="prov-list">
                <li>• Voltage (Analog AC PT Channel)</li>
                <li>• Current (Hall Effect CT Channel)</li>
                <li>• Temperature (PT100 RTD Transducer)</li>
                <li>• Vibration (IEPE Accelerometer Stream)</li>
              </ul>
              <div className="prov-tag">Source: Physical Hardware Transducers</div>
            </div>

            {/* 2. Externally Processed Features */}
            <div className="provenance-card">
              <div className="prov-header text-purple">
                <Cpu size={13} />
                <span>2. EXTERNALLY EXTRACTED FEATURES</span>
              </div>
              <div className="prov-source">Calculated on External Acquisition Laptop</div>
              <ul className="prov-list">
                <li>• <strong>Electrical:</strong> Voltage/Current RMS, Peak, StdDev, Power (V×I)</li>
                <li>• <strong>Thermal:</strong> Temperature Rise (ΔT), Rise Rate, Variation</li>
                <li>• <strong>Vibration:</strong> RMS, Peak, Crest Factor, Kurtosis, Skewness, Dominant Freq, Band Energy, Harmonics</li>
                <li>• <strong>Speed:</strong> Validated RPM (if available from external DAQ)</li>
              </ul>
              <div className="prov-tag">Source: External Data Acquisition</div>
            </div>

            {/* 3. MOTORSYNC Calculated Values */}
            <div className="provenance-card">
              <div className="prov-header text-emerald">
                <ShieldCheck size={13} />
                <span>3. MOTORSYNC PLATFORM ANALYSIS</span>
              </div>
              <div className="prov-source">Evaluated within MOTORSYNC System</div>
              <ul className="prov-list">
                <li>• Estimated RPM (Derived from 1X rotational peak × 60)</li>
                <li>• Motor Health Score & Baseline Index (0–100)</li>
                <li>• Condition Classification (Healthy / Warning / Fault)</li>
                <li>• Candidate Section Mapping (Bearings, Rotor, Stator, Shaft, Cooling, Electrical)</li>
              </ul>
              <div className="prov-tag">Source: MOTORSYNC Platform</div>
            </div>
          </div>
        </div>
      </div>

      {/* Normalized Motor Data Payload Specification (Requirement 5) */}
      <div className="eng-card protocol-card">
        <div className="eng-card-header">
          <span className="eng-card-title">
            <Terminal size={13} className="text-blue" />
            <span>NORMALIZED MOTOR DATA PAYLOAD SPECIFICATION (EXTENSIBLE JSON SCHEMA)</span>
          </span>
          <span className="font-mono text-xs text-muted">DATA INGESTION FORMAT</span>
        </div>
        <div className="eng-card-body">
          <div className="code-spec-box font-mono">
            <div className="code-header">// Normalized Telemetry Payload received from External Laptop or Ingestion Service:</div>
            <pre className="payload-json-code">{`{
  "motorId": "MTR-001",
  "timestamp": "2026-09-30T10:00:00.000Z",
  "sourceType": "EXTERNAL_LAPTOP",

  "electrical": {
    "voltageRms": 230.4,
    "currentRms": 2.18,
    "currentStdDev": 0.052,
    "currentPeak": 3.08,
    "currentPeakToPeak": 6.16,
    "power": 1.25,
    "currentSpectralFeatures": { "fundamentalFrequency": 50.0, "thd": 2.1 }
  },

  "thermal": {
    "temperature": 42.6,
    "temperatureRiseFromBaseline": 4.6,
    "temperatureRiseRate": 0.038,
    "temperatureVariation": 0.32
  },

  "vibration": {
    "magnitude": 2.40,
    "rms": 2.40,
    "peak": 5.09,
    "peakToPeak": 10.18,
    "variance": 0.81,
    "standardDeviation": 0.90,
    "kurtosis": 3.08,
    "skewness": 0.14,
    "crestFactor": 2.12,
    "dominantFrequency": 25.0,
    "spectralEnergy": 37.9,
    "spectralEntropy": 0.71,
    "frequencyBandEnergy": { "lowBand": 1.63, "mediumBand": 0.53, "highBand": 0.24 },
    "harmonics": [
      { "order": "1X", "frequency": 25.0, "amplitude": 2.04 },
      { "order": "2X", "frequency": 50.0, "amplitude": 0.60 }
    ]
  },

  "rpm": null,
  "rpmMethod": "1X frequency * 60 (or null if unavailable)",
  "raw": {
    "vibrationWaveform": null,
    "fftSpectrum": null,
    "samplingRate": 2560
  }
}`}</pre>
          </div>
        </div>
      </div>

      <style>{`
        .system-env-tag {
          font-size: 10px;
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
        }

        .hardware-limitation-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          background: #fefce8;
          border: 1.5px solid #fef08a;
          border-radius: var(--radius-md);
          margin-bottom: 14px;
        }

        .banner-icon {
          color: #b45309;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .banner-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #854d0e;
          margin-bottom: 3px;
        }

        .banner-text {
          font-size: 11.5px;
          color: #713f12;
          line-height: 1.4;
        }

        .data-sources-legend-card {
          margin-bottom: 14px;
          padding: 10px 14px;
          background: #ffffff;
        }

        .data-sources-legend-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        @media (max-width: 900px) {
          .data-sources-legend-grid {
            grid-template-columns: 1fr;
          }
        }

        .source-legend-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .source-legend-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: var(--radius-sm);
          width: fit-content;
        }

        .badge-uploaded {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }

        .badge-hardware {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        .source-legend-desc {
          font-size: 10.5px;
          color: var(--text-muted);
        }

        .status-grid-card {
          margin-bottom: 16px;
        }

        .subsystem-name-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .architecture-card {
          margin-bottom: 16px;
        }

        .arch-intro {
          font-size: 12px;
          color: #334155;
          margin-bottom: 14px;
          line-height: 1.4;
        }

        .arch-intro code {
          background: #e2e8f0;
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          font-family: var(--font-mono);
          font-size: 11px;
        }

        .dataflow-diagram-container {
          background: #f8fafc;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 16px;
        }

        .flow-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          max-width: 720px;
          margin: 0 auto;
        }

        .flow-box {
          width: 100%;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          text-align: center;
          background: #ffffff;
        }

        .flow-box-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          margin-bottom: 2px;
        }

        .flow-box-desc {
          font-size: 11px;
          color: var(--text-muted);
        }

        .source-box {
          border-color: #cbd5e1;
        }
        .source-box .flow-box-title {
          color: #334155;
        }

        .external-box {
          background: #eff6ff;
          border-color: #93c5fd;
        }
        .external-box .flow-box-title {
          color: #1d4ed8;
        }

        .network-box {
          background: #f5f3ff;
          border-color: #c4b5fd;
        }
        .network-box .flow-box-title {
          color: #6d28d9;
        }

        .motorsync-box {
          background: #ecfdf5;
          border-color: #6ee7b7;
        }
        .motorsync-box .flow-box-title {
          color: #047857;
        }

        .flow-arrow-down {
          font-size: 10px;
          font-weight: 700;
          color: var(--primary-blue);
          padding: 2px 0;
        }

        .provenance-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        @media (max-width: 900px) {
          .provenance-grid {
            grid-template-columns: 1fr;
          }
        }

        .provenance-card {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          background: #ffffff;
          padding: 12px;
          display: flex;
          flex-direction: column;
        }

        .prov-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .prov-source {
          font-size: 10px;
          color: var(--text-muted);
          margin-bottom: 10px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 6px;
        }

        .prov-list {
          list-style: none;
          padding: 0;
          margin: 0 0 12px 0;
          font-size: 10.5px;
          color: #334155;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .prov-tag {
          margin-top: auto;
          font-size: 9.5px;
          font-weight: 700;
          background: #f8fafc;
          border: 1px solid var(--border-subtle);
          padding: 3px 6px;
          border-radius: 2px;
          color: var(--text-muted);
        }

        .text-purple {
          color: #7c3aed;
        }

        .text-emerald {
          color: #059669;
        }

        .code-spec-box {
          background: #0f172a;
          color: #f8fafc;
          padding: 12px 14px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          line-height: 1.5;
        }

        .code-header {
          color: #94a3b8;
          margin-bottom: 8px;
        }

        .payload-json-code {
          margin: 0;
          font-family: var(--font-mono);
          font-size: 11px;
          color: #38bdf8;
          overflow-x: auto;
          white-space: pre-wrap;
          max-height: 380px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
};
