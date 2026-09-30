import React, { useEffect, useRef } from 'react';
import { Radio, AlertCircle, RotateCw } from 'lucide-react';
import { telemetryService } from '../../services/telemetryService';

export const VibrationAnalysisCard = ({ snapshot }) => {
  const waveformCanvasRef = useRef(null);
  const fftCanvasRef = useRef(null);

  const features = snapshot?.vibrationFeatures || {
    rms: 2.4,
    peak: 5.1,
    peakToPeak: 10.2,
    standardDeviation: 1.68,
    crestFactor: 2.12,
    dominantFreq: 25.0,
    freqAmplitude: 1.82,
    frequency1X: 25.0,
    estimatedRPM: 1500,
    isRpmReliable: true,
    harmonics: []
  };

  const harmonics = snapshot?.harmonics || features.harmonics || [];

  // Render Time-domain Waveform Canvas
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const waveform = telemetryService.generateVibrationWaveform(256);

    ctx.clearRect(0, 0, width, height);

    if (!waveform || waveform.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('NO RECENT ESP32 DATA', width / 2, height / 2);
      ctx.textAlign = 'left';
      return;
    }

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.strokeStyle = '#e2e8f0';
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const maxAmp = Math.max(10, ...waveform.map(p => Math.abs(p.amplitude))) * 1.15;

    ctx.beginPath();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';

    waveform.forEach((pt, i) => {
      const x = (i / (waveform.length - 1)) * width;
      const y = height / 2 - (pt.amplitude / maxAmp) * (height / 2 - 8);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px JetBrains Mono';
    ctx.fillText(`+${maxAmp.toFixed(1)} mm/s`, 6, 12);
    ctx.fillText(`-${maxAmp.toFixed(1)} mm/s`, 6, height - 4);
    ctx.fillText('0.0 ms', 6, height / 2 + 10);
    ctx.fillText('100.0 ms (2.56 kHz)', width - 110, height - 4);
  }, [snapshot]);

  // Render Frequency Spectrum (FFT) Canvas with 1X Identification
  useEffect(() => {
    const canvas = fftCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const spectrum = telemetryService.generateFFTSpectrum(120);

    ctx.clearRect(0, 0, width, height);

    if (!spectrum || spectrum.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('INSUFFICIENT DATA FOR FFT', width / 2, height / 2);
      ctx.textAlign = 'left';
      return;
    }

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const maxAmp = Math.max(6, ...spectrum.map(s => s.amplitude)) * 1.15;
    const barW = width / spectrum.length;

    // Detect 1X and 2X bins for visual annotations
    const bin1X = spectrum.find(s => s.is1X);
    const target2X = bin1X ? bin1X.frequency * 2 : null;
    const bin2X = target2X ? spectrum.find(s => Math.abs(s.frequency - target2X) < 2.0 && s.amplitude > 0.3) : null;

    spectrum.forEach((bin, i) => {
      const x = i * barW;
      const barH = (bin.amplitude / maxAmp) * (height - 24);
      const y = height - barH - 16;

      if (bin.is1X) {
        ctx.fillStyle = '#0284c7'; // Cyan/blue highlight for 1X running frequency
      } else if (bin2X && bin === bin2X) {
        ctx.fillStyle = '#f59e0b'; // Amber for 2X harmonic
      } else if (bin.isDominant) {
        ctx.fillStyle = '#dc2626'; // Red for dominant defect peak
      } else if (bin.amplitude > 2.0) {
        ctx.fillStyle = '#ea580c';
      } else {
        ctx.fillStyle = '#93c5fd';
      }

      ctx.fillRect(x, y, Math.max(1.8, barW - 1), barH);
    });

    // Axis markings
    ctx.fillStyle = '#64748b';
    ctx.font = '9px JetBrains Mono';
    ctx.fillText('0 Hz', 6, height - 4);
    ctx.fillText('100 Hz', width * 0.33, height - 4);
    ctx.fillText('200 Hz', width * 0.66, height - 4);
    ctx.fillText('300 Hz', width - 42, height - 4);

    // Marker for 1X Running Frequency (Derived speed component)
    if (bin1X && features.isRpmReliable) {
      const x1X = (spectrum.indexOf(bin1X) / spectrum.length) * width;
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 9px Inter';
      ctx.fillText(`▲ 1X: ${bin1X.frequency} Hz (${features.estimatedRPM} RPM)`, Math.min(width - 150, Math.max(10, x1X - 25)), height - 20);
    }

    // Marker for 2X harmonic
    if (bin2X && features.isRpmReliable) {
      const x2X = (spectrum.indexOf(bin2X) / spectrum.length) * width;
      ctx.fillStyle = '#d97706';
      ctx.font = 'bold 9px Inter';
      ctx.fillText(`▲ 2X: ${bin2X.frequency} Hz`, Math.min(width - 90, Math.max(10, x2X - 15)), height - 32);
    }

    // Callout on dominant frequency if different from 1X
    const domBin = spectrum.find(s => s.isDominant);
    if (domBin && (!bin1X || Math.abs(domBin.frequency - bin1X.frequency) > 3)) {
      const domX = (spectrum.indexOf(domBin) / spectrum.length) * width;
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 9px Inter';
      ctx.fillText(`▼ Peak: ${domBin.frequency} Hz (${domBin.amplitude.toFixed(2)} mm/s)`, Math.min(width - 140, Math.max(10, domX - 20)), 14);
    }
  }, [snapshot, features]);

  return (
    <div className="eng-card vibration-card">
      <div className="eng-card-header">
        <span className="eng-card-title">
          <Radio size={13} className="text-blue" />
          <span>VIBRATION ANALYSIS (TIME & FREQUENCY DOMAIN • PRIMARY SIGNAL)</span>
        </span>
        <div className="header-badges-row">
          <span className="badge badge-info badge-sm font-mono">1X FREQ: {features.frequency1X ? `${features.frequency1X} Hz` : 'N/A'}</span>
          <span className="badge badge-synthetic">
            {snapshot?.dataSourceType === 'ESP32' ? 'ESP32 3-AXIS' : snapshot?.isExternalSource ? 'EXTERNAL DAQ' : 'SYNTHETIC MODELS'}
          </span>
        </div>
      </div>

      <div className="eng-card-body">
        {/* 3-Axis Transducer Readout & Calculated Magnitude (Section 6, 7) */}
        <div className="axes-readout-row font-mono">
          <span className="axes-title font-bold">3-AXIS TRANSDUCER (RAW):</span>
          <div className="axes-pills-wrap">
            <span className="axis-pill">
              <strong className="text-blue">X:</strong> {features.vibrationX != null ? `${features.vibrationX} mm/s` : (features.axes?.x?.rms ? `RMS ${features.axes.x.rms} mm/s` : '—')}
            </span>
            <span className="axis-pill">
              <strong className="text-blue">Y:</strong> {features.vibrationY != null ? `${features.vibrationY} mm/s` : (features.axes?.y?.rms ? `RMS ${features.axes.y.rms} mm/s` : '—')}
            </span>
            <span className="axis-pill">
              <strong className="text-blue">Z:</strong> {features.vibrationZ != null ? `${features.vibrationZ} mm/s` : (features.axes?.z?.rms ? `RMS ${features.axes.z.rms} mm/s` : '—')}
            </span>
            <span className="axis-pill axis-mag">
              <strong>MAGNITUDE (CALCULATED):</strong> {features.magnitude != null ? `${features.magnitude} mm/s` : (features.rms != null ? `${features.rms} mm/s` : '—')}
            </span>
          </div>
        </div>

        {/* Dual Chart Row */}
        <div className="vib-charts-grid">
          {/* Left: Waveform */}
          <div className="vib-chart-col">
            <div className="vib-sub-header">
              <span className="vib-sub-title">REAL-TIME VIBRATION WAVEFORM</span>
              <span className="vib-sub-meta font-mono">IEPE CH-1 • 256 SAMPLES</span>
            </div>
            <div className="canvas-wrapper">
              <canvas 
                ref={waveformCanvasRef} 
                width={500} 
                height={160} 
                className="vib-canvas"
              />
            </div>
          </div>

          {/* Right: FFT Spectrum with 1X identification */}
          <div className="vib-chart-col">
            <div className="vib-sub-header">
              <span className="vib-sub-title">FREQUENCY SPECTRUM / FFT (1X & HARMONICS)</span>
              <span className="vib-sub-meta font-mono">0 – 300 HZ • 1X TRACKING</span>
            </div>
            <div className="canvas-wrapper">
              <canvas 
                ref={fftCanvasRef} 
                width={500} 
                height={160} 
                className="vib-canvas"
              />
            </div>
          </div>
        </div>

        {/* Feature Summary Bar with Time Domain & Derived RPM */}
        <div className="vib-features-grid">
          <div className="feature-item">
            <span className="feature-label">RMS</span>
            <span className="feature-value font-mono">{features.rms != null ? `${features.rms} mm/s` : '—'}</span>
          </div>
          <div className="feature-item">
            <span className="feature-label">PEAK</span>
            <span className="feature-value font-mono">{features.peak != null ? `${features.peak} mm/s` : '—'}</span>
          </div>
          <div className="feature-item">
            <span className="feature-label">PK-PK</span>
            <span className="feature-value font-mono">{features.peakToPeak != null ? `${features.peakToPeak} mm/s` : '—'}</span>
          </div>
          <div className="feature-item">
            <span className="feature-label">CREST FACTOR</span>
            <span className="feature-value font-mono">{features.crestFactor != null ? features.crestFactor : '—'}</span>
          </div>
          <div className="feature-item">
            <span className="feature-label">DOMINANT FREQ</span>
            <span className="feature-value font-mono text-red">{features.dominantFreq != null ? `${features.dominantFreq} Hz` : '—'}</span>
          </div>
          <div className="feature-item">
            <span className="feature-label">1X RUNNING FREQ</span>
            <span className="feature-value font-mono text-blue">{features.frequency1X != null ? `${features.frequency1X} Hz` : 'Not available'}</span>
          </div>
          <div className="feature-item derived-feature-item">
            <span className="feature-label derived-label">
              <RotateCw size={9} />
              <span>ESTIMATED RPM (DERIVED)</span>
            </span>
            <span className="feature-value font-mono text-primary font-bold">
              {features.isRpmReliable && features.estimatedRPM ? `${features.estimatedRPM} RPM` : 'Not available'}
            </span>
          </div>
        </div>

        {/* Harmonic Components (1X, 2X, 3X, 4X) Inspection Row - Requirement 8 */}
        <div className="harmonics-readout-row font-mono">
          <span className="harmonics-title font-bold">HARMONIC COMPONENTS (1X – 4X):</span>
          {harmonics && harmonics.length > 0 ? (
            <div className="harmonics-pills-wrap">
              {harmonics.map((h) => (
                <div key={h.order} className={`harmonic-pill ${h.isIdentified ? 'identified' : 'absent'}`}>
                  <span className="h-order font-bold">{h.order}</span>
                  <span className="h-freq">{h.targetFrequency} Hz</span>
                  {h.isIdentified ? (
                    <span className="h-amp font-bold text-blue">{h.amplitude.toFixed(2)} mm/s ({Math.round(h.amplitudeRatioTo1X * 100)}%)</span>
                  ) : (
                    <span className="h-amp text-muted">—</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted">Awaiting rotational speed lock for harmonic extraction</span>
          )}
        </div>

        {/* Disclaimer footer */}
        <div className="vib-disclaimer">
          <AlertCircle size={12} className="disclaimer-icon" />
          <span>
            1X running frequency identified from vibration FFT spectrum. Estimated RPM = f_1X × 60. Experimental derived parameter (not a hardware sensor input).
          </span>
        </div>
      </div>

      <style>{`
        .vibration-card {
          margin-bottom: 16px;
        }

        .header-badges-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .vib-charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 12px;
        }

        @media (max-width: 900px) {
          .vib-charts-grid {
            grid-template-columns: 1fr;
          }
        }

        .vib-chart-col {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          background: #ffffff;
          overflow: hidden;
        }

        .vib-sub-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          background: var(--bg-card-subtle);
          border-bottom: 1px solid var(--border-subtle);
        }

        .vib-sub-title {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        .vib-sub-meta {
          font-size: 9.5px;
          color: var(--text-muted);
        }

        .canvas-wrapper {
          padding: 8px;
          background: #ffffff;
          display: flex;
          justify-content: center;
        }

        .vib-canvas {
          width: 100%;
          height: 150px;
          display: block;
        }

        .vib-features-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
          padding: 10px 12px;
          background: var(--bg-card-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          margin-bottom: 10px;
        }

        @media (max-width: 1100px) {
          .vib-features-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 600px) {
          .vib-features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .feature-item {
          display: flex;
          flex-direction: column;
        }

        .derived-feature-item {
          background: #eff6ff;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          border: 1px solid #bfdbfe;
        }

        .derived-label {
          color: var(--primary-blue) !important;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .feature-label {
          font-size: 9px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .feature-value {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-main);
          margin-top: 2px;
        }

        .feature-unit {
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 400;
        }

        .text-blue {
          color: var(--primary-blue);
        }

        .text-red {
          color: #dc2626;
        }

        .text-primary {
          color: #1e40af;
        }

        .vib-disclaimer {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5px;
          color: #854d0e;
          background: #fefce8;
          border: 1px solid #fef08a;
          padding: 5px 10px;
          border-radius: var(--radius-sm);
        }

        .disclaimer-icon {
          flex-shrink: 0;
          color: #b45309;
        }

        .axes-readout-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 12px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: var(--radius-sm);
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .axes-title {
          font-size: 10px;
          letter-spacing: 0.04em;
          color: #166534;
          white-space: nowrap;
        }

        .axes-pills-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .axis-pill {
          font-size: 11px;
          color: #1e293b;
          background: #ffffff;
          padding: 2px 7px;
          border-radius: var(--radius-sm);
          border: 1px solid #cbd5e1;
        }

        .axis-mag {
          background: #eff6ff;
          border-color: #93c5fd;
          color: #1e40af;
        }

        .harmonics-readout-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: #f8fafc;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .harmonics-title {
          font-size: 10px;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .harmonics-pills-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .harmonic-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          font-size: 10.5px;
          background: #ffffff;
          border: 1px solid var(--border-subtle);
        }

        .harmonic-pill.identified {
          border-color: #93c5fd;
          background: #eff6ff;
        }

        .harmonic-pill .h-order {
          color: #1e3a8a;
        }

        .harmonic-pill .h-freq {
          color: var(--text-muted);
        }

        .harmonic-pill .h-amp {
          font-size: 10px;
        }
      `}</style>
    </div>
  );
};
