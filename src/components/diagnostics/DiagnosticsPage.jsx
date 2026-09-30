import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Cpu, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Layers, 
  Download, 
  ZoomIn,
  RefreshCw,
  Search,
  Crosshair,
  GitBranch,
  Info,
  ShieldCheck,
  Zap,
  Thermometer,
  Radio,
  Sliders
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { telemetryService, SIMULATION_MODES } from '../../services/telemetryService';
import { inferenceService } from '../../services/ai/inferenceService';
import { baselineService } from '../../services/baselineService';
import { alertService } from '../../services/alertService';
import { DATA_SOURCE_TYPES } from '../../services/dataIngestion/motorDataModel';

export const DiagnosticsPage = ({ snapshot }) => {
  const [selectedPeak, setSelectedPeak] = useState(null);
  const waveformRef = useRef(null);
  const fftRef = useRef(null);

  const motorId = snapshot?.selectedMotorId || 'MTR-001';
  const vib = snapshot?.vibrationFeatures || {};
  const metrics = snapshot?.metrics || {};

  // Run AI Inference Service
  const diagnosticResult = useMemo(() => {
    return inferenceService.diagnose(snapshot || {});
  }, [snapshot]);

  // Baseline deviations
  const baselineInfo = diagnosticResult.baselineDeviations || {};
  const compAssess = diagnosticResult.componentAssessment || {};

  // Active alerts for this motor
  const motorAlerts = useMemo(() => {
    alertService.evaluate(snapshot || {}, diagnosticResult);
    return alertService.getAlertsForMotor(motorId).slice(0, 4);
  }, [snapshot, diagnosticResult, motorId]);

  // Component breakdown for the 6 candidate sections (Section 33)
  const componentsList = [
    { key: 'BEARINGS', name: 'BEARINGS & RACEWAYS', data: compAssess.BEARINGS || { status: 'NORMAL', indicator: 'Nominal kinematic operation', evidence: [] } },
    { key: 'ROTOR', name: 'ROTOR & DYNAMIC BALANCE', data: compAssess.ROTOR || { status: 'NORMAL', indicator: 'Nominal rotor dynamic balance', evidence: [] } },
    { key: 'STATOR', name: 'STATOR & WINDINGS', data: compAssess.STATOR || { status: 'NORMAL', indicator: 'Nominal winding current balance', evidence: [] } },
    { key: 'SHAFT', name: 'SHAFT & MECHANICAL COUPLING', data: compAssess.SHAFT || { status: 'NORMAL', indicator: 'Nominal shaft alignment and coupling', evidence: [] } },
    { key: 'COOLING', name: 'COOLING & HEAT DISSIPATION', data: compAssess.COOLING || { status: 'NORMAL', indicator: 'Nominal thermal dissipation', evidence: [] } },
    { key: 'ELECTRICAL', name: 'ELECTRICAL POWER SUPPLY', data: compAssess.ELECTRICAL || { status: 'NORMAL', indicator: 'Nominal power supply balance', evidence: [] } }
  ];

  // Draw high-resolution interactive waveform
  useEffect(() => {
    const canvas = waveformRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const waveform = telemetryService.generateVibrationWaveform(384);
    ctx.clearRect(0, 0, w, h);

    if (!waveform || waveform.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('NO RECENT ESP32 DATA', w / 2, h / 2);
      ctx.textAlign = 'left';
      return;
    }

    // Subtle grid
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Zero-line
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    const maxAmp = Math.max(12, ...waveform.map(p => Math.abs(p.amplitude))) * 1.1;

    // Draw trace
    ctx.beginPath();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.8;
    waveform.forEach((pt, i) => {
      const x = (i / (waveform.length - 1)) * w;
      const y = h / 2 - (pt.amplitude / maxAmp) * (h / 2 - 10);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Scale text
    ctx.fillStyle = '#64748b';
    ctx.font = '9px JetBrains Mono';
    ctx.fillText(`+${maxAmp.toFixed(1)} mm/s`, 8, 14);
    ctx.fillText(`-${maxAmp.toFixed(1)} mm/s`, 8, h - 6);
    ctx.fillText('0 ms', 8, h / 2 - 4);
    ctx.fillText('150 ms (Time Window)', w - 120, h / 2 - 4);
  }, [snapshot]);

  // Draw high-resolution interactive FFT Spectrum
  useEffect(() => {
    const canvas = fftRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const spectrum = telemetryService.generateFFTSpectrum(160);
    ctx.clearRect(0, 0, w, h);

    if (!spectrum || spectrum.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('INSUFFICIENT DATA FOR FFT', w / 2, h / 2);
      ctx.textAlign = 'left';
      return;
    }

    // Grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const maxAmp = Math.max(7, ...spectrum.map(s => s.amplitude)) * 1.15;
    const barW = w / spectrum.length;

    spectrum.forEach((bin, i) => {
      const x = i * barW;
      const barH = (bin.amplitude / maxAmp) * (h - 26);
      const y = h - barH - 18;

      if (bin.isDominant) {
        ctx.fillStyle = '#dc2626';
      } else if (bin.amplitude > 2.0) {
        ctx.fillStyle = '#d97706';
      } else {
        ctx.fillStyle = '#3b82f6';
      }
      ctx.fillRect(x, y, Math.max(1.8, barW - 1), barH);
    });

    // Freq markers
    ctx.fillStyle = '#64748b';
    ctx.font = '9px JetBrains Mono';
    ctx.fillText('0 Hz', 6, h - 4);
    ctx.fillText('75 Hz', w * 0.25, h - 4);
    ctx.fillText('150 Hz', w * 0.5, h - 4);
    ctx.fillText('225 Hz', w * 0.75, h - 4);
    ctx.fillText('300 Hz', w - 42, h - 4);

    // Highlight dominant frequency flag
    const dom = spectrum.find(s => s.isDominant);
    if (dom) {
      const domX = (spectrum.indexOf(dom) / spectrum.length) * w;
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 9.5px Inter';
      ctx.fillText(`▼ Peak: ${dom.frequency} Hz (${dom.amplitude.toFixed(2)} mm/s)`, Math.min(w - 140, Math.max(10, domX - 40)), 14);
    }
  }, [snapshot]);

  return (
    <div className="diagnostics-page">
      {/* Title */}
      <div className="page-header-block">
        <div>
          <h1 className="page-title">DIAGNOSTICS & FAULT ASSESSMENT WORKBENCH</h1>
          <div className="page-subtitle">Signal decomposition, baseline comparison, and AI-assisted fault indication engine.</div>
        </div>
        <div className="diag-mode-tag font-mono">
          MODEL: {diagnosticResult.modelMetadata.modelName} ({diagnosticResult.modelMetadata.modelVersion}) • {diagnosticResult.modelMetadata.status}
        </div>
      </div>

      {/* Selected Motor Context Header (Req 18) */}
      <div className="selected-motor-section-header mb-16">
        <div className="selected-motor-header-left">
          <div className="selected-motor-title-row">
            <Cpu size={15} className="text-blue" />
            <h2 className="selected-motor-title">
              DIAGNOSTIC WORKBENCH: <span className="text-blue">MTR-001</span>
            </h2>
            <Badge status={diagnosticResult.condition} size="sm" />
          </div>
          <div className="selected-motor-meta-row font-mono">
            <span>MOTOR ID: <strong>MTR-001</strong></span>
            <span>•</span>
            <span>DATA SOURCE: <strong className="text-blue">ESP32 REAL HARDWARE</strong></span>
            <span>•</span>
            <span>LOCATION: <strong>Physical Hardware Testbed</strong></span>
            <span>•</span>
            <span>EVALUATION: <strong>REAL SENSOR PACKETS</strong></span>
          </div>
        </div>
        <div className="selected-motor-header-right">
          <span className="synthetic-badge-tag font-mono">
            MONITORED UNIT: MTR-001
          </span>
        </div>
      </div>

      {/* AI Diagnostic Assessment Card (Master Spec Section 30, 31, 52) */}
      <div className="eng-card diag-summary-card">
        <div className="eng-card-header">
          <span className="eng-card-title">
            <ShieldAlert size={13} className="text-blue" />
            <span>AI-ASSISTED FAULT DIAGNOSTIC ASSESSMENT</span>
          </span>
          <div className="header-badges">
            <span className="badge badge-info">EXPERIMENTAL MODEL</span>
            <Badge status={diagnosticResult.condition} />
          </div>
        </div>
        <div className="eng-card-body">
          <div className="summary-columns-grid">
            <div className="summary-main-col">
              <div className="summary-title-line">
                <span className="summary-target-label">PRIMARY SUSPECTED FAULT:</span>
                <span className="summary-target-fault font-mono">{diagnosticResult.faultType}</span>
              </div>
              <p className="summary-narrative">
                {diagnosticResult.explanation?.modelDisclaimer || 'Diagnostic assessment derived from multi-signal feature thresholding and spectral analysis.'}
              </p>
              <div className="summary-sub-badges font-mono">
                <span>AFFECTED SECTION: <strong>{diagnosticResult.affectedSection}</strong></span>
                <span>•</span>
                <span>SEVERITY: <strong className={diagnosticResult.severity === 'CRITICAL' ? 'text-red' : diagnosticResult.severity === 'HIGH' ? 'text-amber' : ''}>{diagnosticResult.severity}</strong></span>
                <span>•</span>
                <span>CONFIDENCE: <strong>{diagnosticResult.confidenceLabel}</strong></span>
                <span>•</span>
                <span>ISO 10816 TRIP: <strong>4.5 mm/s</strong></span>
              </div>
            </div>

            <div className="summary-score-col">
              <div className="score-ring-box">
                <div className="score-ring-val font-mono">
                  {diagnosticResult.condition === 'HEALTHY' ? '96' : diagnosticResult.condition === 'WARNING' ? '68' : '34'}
                </div>
                <div className="score-ring-label">HEALTH SCORE</div>
              </div>
              <div className="score-bar-sub">
                <Badge status={diagnosticResult.severity} size="sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostic Fusion & Explainability (Master Spec Section 31, 52) */}
      <div className="eng-card mb-16">
        <div className="eng-card-header">
          <span className="eng-card-title">
            <GitBranch size={13} className="text-blue" />
            <span>DIAGNOSTIC FUSION & EXPLAINABILITY (SIGNAL EVIDENCE + BASELINE DEVIATIONS)</span>
          </span>
          <span className="font-mono text-xs text-muted">TRANSPARENT REASONING TRACE</span>
        </div>
        <div className="eng-card-body">
          <div className="explainability-grid font-mono">
            {/* 1. Observed Signal Evidence */}
            <div className="explain-col">
              <div className="explain-col-title text-blue">
                <Activity size={13} />
                <span>1. OBSERVED EVIDENCE</span>
              </div>
              <ul className="explain-list">
                {diagnosticResult.evidence.length > 0 ? (
                  diagnosticResult.evidence.map((ev, i) => (
                    <li key={i}>• {ev}</li>
                  ))
                ) : (
                  <li className="text-muted">• No anomalous indicators detected</li>
                )}
              </ul>
            </div>

            {/* 2. Baseline Deviations (Section 23) */}
            <div className="explain-col">
              <div className="explain-col-title text-purple">
                <Sliders size={13} />
                <span>2. BASELINE DEVIATIONS</span>
              </div>
              <div className="baseline-status-note">
                STATUS: <strong>{baselineInfo.baselineStatus || 'NOT_AVAILABLE'}</strong>
              </div>
              <ul className="explain-list">
                <li>• Temp Rise: <strong>{baselineInfo.temperatureRiseLabel || 'Baseline: Not available'}</strong></li>
                <li>• Vib Rise: <strong>{baselineInfo.vibrationRiseLabel || 'Baseline: Not available'}</strong></li>
                <li>• Current Dev: <strong>{baselineInfo.currentDeviationLabel || 'Baseline: Not available'}</strong></li>
                <li>• Summary: <span className="text-muted">{baselineInfo.summary || 'Baseline not established'}</span></li>
              </ul>
            </div>

            {/* 3. Diagnostic Reasoning */}
            <div className="explain-col">
              <div className="explain-col-title text-emerald">
                <ShieldCheck size={13} />
                <span>3. MODEL ASSESSMENT</span>
              </div>
              <ul className="explain-list">
                <li>• Condition: <strong>{diagnosticResult.condition}</strong></li>
                <li>• Candidate Section: <strong>{diagnosticResult.affectedSection}</strong></li>
                <li>• Indication: <span className="text-muted">Suspected component degradation based on feature vector matching</span></li>
                <li className="text-amber">• <em>Experimental heuristic model — lab validation pending</em></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Waveform & FFT Analytics */}
      <div className="diagnostics-charts-grid">
        {/* Left: Waveform */}
        <div className="eng-card">
          <div className="eng-card-header">
            <span className="eng-card-title">
              <Activity size={13} className="text-blue" />
              <span>TIME-DOMAIN ACCELEROMETER TRACE (RAW WAVEFORM)</span>
            </span>
            <span className="font-mono text-muted text-xs">FS: 2560 HZ • ACC-X</span>
          </div>
          <div className="eng-card-body">
            <div className="canvas-wrapper">
              <canvas ref={waveformRef} width={620} height={180} className="diag-canvas" />
            </div>
            <div className="chart-footer-metrics font-mono">
              <span>PEAK: <strong>{vib.peak} mm/s</strong></span>
              <span>•</span>
              <span>RMS: <strong>{vib.rms} mm/s</strong></span>
              <span>•</span>
              <span>CREST FACTOR: <strong>{vib.crestFactor}</strong></span>
            </div>
          </div>
        </div>

        {/* Right: FFT Spectrum */}
        <div className="eng-card">
          <div className="eng-card-header">
            <span className="eng-card-title">
              <Cpu size={13} className="text-blue" />
              <span>FREQUENCY SPECTRUM & HARMONIC DECOMPOSITION (FFT)</span>
            </span>
            <span className="font-mono text-muted text-xs">0 - 300 HZ • RES: 1.87 HZ</span>
          </div>
          <div className="eng-card-body">
            <div className="canvas-wrapper">
              <canvas ref={fftRef} width={620} height={180} className="diag-canvas" />
            </div>
            <div className="chart-footer-metrics font-mono">
              <span>DOMINANT PEAK: <strong className="text-red">{vib.dominantFreq} Hz</strong></span>
              <span>•</span>
              <span>AMP: <strong>{vib.freqAmplitude} mm/s</strong></span>
              <span>•</span>
              <span>1X SPEED: <strong>24.7 Hz</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Extraction Table & Component Health Assessment Grid (Section 33) */}
      <div className="dashboard-grid-2col diag-details-grid">
        {/* Feature Extraction Table */}
        <div className="eng-card">
          <div className="eng-card-header">
            <span className="eng-card-title">
              <FileText size={13} className="text-blue" />
              <span>EXTRACTED STATISTICAL & SPECTRAL FEATURES</span>
            </span>
            <span className="font-mono text-muted text-xs">MATHEMATICAL DESCRIPTORS</span>
          </div>
          <div className="eng-table-container">
            <table className="eng-table">
              <thead>
                <tr>
                  <th>FEATURE PARAMETER</th>
                  <th>CALCULATED VALUE</th>
                  <th>NORMAL BASELINE</th>
                  <th>EVALUATION</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-mono">RMS Velocity</td>
                  <td className="font-mono font-bold">{vib.rms} mm/s</td>
                  <td className="font-mono text-muted">&lt; 2.8 mm/s</td>
                  <td><Badge status={vib.rms > 4.5 ? 'FAULT' : vib.rms > 2.8 ? 'WARNING' : 'HEALTHY'} size="sm" /></td>
                </tr>
                <tr>
                  <td className="font-mono">Peak Amplitude</td>
                  <td className="font-mono font-bold">{vib.peak} mm/s</td>
                  <td className="font-mono text-muted">&lt; 5.5 mm/s</td>
                  <td><Badge status={vib.peak > 10.0 ? 'FAULT' : 'HEALTHY'} size="sm" /></td>
                </tr>
                <tr>
                  <td className="font-mono">Crest Factor (Peak/RMS)</td>
                  <td className="font-mono font-bold">{vib.crestFactor}</td>
                  <td className="font-mono text-muted">2.0 - 2.5</td>
                  <td><Badge status={vib.crestFactor > 3.0 ? 'WARNING' : 'HEALTHY'} size="sm" /></td>
                </tr>
                <tr>
                  <td className="font-mono">Kurtosis (Impulsiveness)</td>
                  <td className="font-mono font-bold">{vib.kurtosis}</td>
                  <td className="font-mono text-muted">~ 3.0 (Gaussian)</td>
                  <td><Badge status={vib.kurtosis > 4.5 ? 'FAULT' : 'HEALTHY'} size="sm" /></td>
                </tr>
                <tr>
                  <td className="font-mono">Skewness (Asymmetry)</td>
                  <td className="font-mono font-bold">{vib.skewness}</td>
                  <td className="font-mono text-muted">0.0 ± 0.2</td>
                  <td><Badge status="HEALTHY" size="sm" /></td>
                </tr>
                <tr>
                  <td className="font-mono">Total Harmonic Distortion (THD)</td>
                  <td className="font-mono font-bold">{vib.thd}%</td>
                  <td className="font-mono text-muted">&lt; 3.0%</td>
                  <td><Badge status={vib.thd > 5.0 ? 'FAULT' : 'HEALTHY'} size="sm" /></td>
                </tr>
                <tr>
                  <td className="font-mono">1X Fundamental Energy</td>
                  <td className="font-mono font-bold">{vib.dominantFreq === 24.7 ? 'HIGH (Dominant)' : 'NOMINAL'}</td>
                  <td className="font-mono text-muted">Moderate</td>
                  <td><Badge status={vib.dominantFreq === 24.7 && vib.rms > 4 ? 'WARNING' : 'HEALTHY'} size="sm" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Component Health Assessment Grid (Section 33) */}
        <div className="eng-card">
          <div className="eng-card-header">
            <span className="eng-card-title">
              <Layers size={13} className="text-blue" />
              <span>COMPONENT HEALTH ASSESSMENT (6 TARGET SECTIONS)</span>
            </span>
            <span className="font-mono text-muted text-xs">SECTION 33 SPECIFICATION</span>
          </div>
          <div className="eng-card-body">
            <div className="component-health-list font-mono">
              {componentsList.map((comp) => (
                <div key={comp.key} className="comp-item-row">
                  <div className="comp-item-header">
                    <span className="comp-name">{comp.name}</span>
                    <Badge status={comp.data.status} size="sm" />
                  </div>
                  <div className="comp-indicator text-xs text-muted">
                    {comp.data.indicator}
                  </div>
                  {comp.data.evidence && comp.data.evidence.length > 0 && (
                    <div className="comp-evidence text-xs text-red">
                      {comp.data.evidence.join(' • ')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Note box */}
            <div className="diag-phase-note">
              <strong>MODEL DISCLAIMER:</strong> Diagnostics are produced by the Experimental Rule-Feature Model (v0.1-dev). MOTORSYNC decouples model inference so that a production-trained ML classifier (Random Forest, XGBoost, or Neural Net) can be registered without rewriting the user interface.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .diag-mode-tag {
          font-size: 10px;
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
        }

        .diag-summary-card {
          margin-bottom: 16px;
        }

        .header-badges {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .summary-columns-grid {
          display: grid;
          grid-template-columns: 1fr 140px;
          gap: 16px;
          align-items: center;
        }

        @media (max-width: 768px) {
          .summary-columns-grid {
            grid-template-columns: 1fr;
          }
        }

        .summary-title-line {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }

        .summary-target-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        .summary-target-fault {
          font-size: 14px;
          font-weight: 700;
          color: #b91c1c;
        }

        .summary-narrative {
          font-size: 12px;
          color: #334155;
          line-height: 1.45;
          margin-bottom: 8px;
        }

        .summary-sub-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: var(--text-muted);
          flex-wrap: wrap;
        }

        .score-ring-box {
          text-align: center;
          padding: 12px;
          background: #f8fafc;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          margin-bottom: 6px;
        }

        .score-ring-val {
          font-size: 26px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1;
        }

        .score-ring-label {
          font-size: 9px;
          font-weight: 700;
          color: var(--text-muted);
          margin-top: 4px;
          letter-spacing: 0.05em;
        }

        .score-bar-sub {
          display: flex;
          justify-content: center;
        }

        .explainability-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        @media (max-width: 900px) {
          .explainability-grid {
            grid-template-columns: 1fr;
          }
        }

        .explain-col {
          background: #f8fafc;
          border: 1px solid var(--border-subtle);
          padding: 12px;
          border-radius: var(--radius-sm);
        }

        .explain-col-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .baseline-status-note {
          font-size: 10px;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .explain-list {
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 11px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .component-health-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .comp-item-row {
          background: #f8fafc;
          border: 1px solid var(--border-subtle);
          padding: 8px 10px;
          border-radius: var(--radius-sm);
        }

        .comp-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .comp-name {
          font-size: 11px;
          font-weight: 700;
          color: #1e293b;
        }

        .comp-indicator {
          font-size: 10px;
        }

        .comp-evidence {
          margin-top: 3px;
          font-weight: 600;
        }

        .diagnostics-charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        @media (max-width: 1024px) {
          .diagnostics-charts-grid {
            grid-template-columns: 1fr;
          }
        }

        .canvas-wrapper {
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          padding: 8px;
          margin-bottom: 8px;
          overflow: hidden;
        }

        .diag-canvas {
          width: 100%;
          height: auto;
          display: block;
        }

        .chart-footer-metrics {
          display: flex;
          gap: 10px;
          font-size: 11px;
          color: var(--text-muted);
          flex-wrap: wrap;
        }

        .diag-details-grid {
          margin-bottom: 16px;
        }

        .diag-phase-note {
          margin-top: 12px;
          padding: 8px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: var(--radius-sm);
          font-size: 10.5px;
          color: #92400e;
          line-height: 1.4;
        }

        .text-purple { color: #7c3aed; }
        .text-emerald { color: #059669; }
        .text-amber { color: #d97706; }
      `}</style>
    </div>
  );
};
