import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Layers, 
  Activity, 
  Radio, 
  Zap, 
  Thermometer, 
  Play, 
  RefreshCw, 
  FileSpreadsheet, 
  FileCode, 
  Download, 
  History as HistoryIcon,
  ChevronRight,
  Eye,
  Info,
  Cpu,
  Clock,
  Sliders,
  BookmarkCheck
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { fileAnalysisService, STANDARD_CHANNELS } from '../../services/fileAnalysisService';
import { MOTOR_REGISTRY, getMotorById } from '../../services/motorRegistry';

const TimeSeriesChart = ({ data, unit, color = '#2563eb', height = 80 }) => {
  if (!data || data.length === 0) {
    return <div className="no-data-notice font-mono text-muted text-xs">No waveform recorded in dataset</div>;
  }
  const minVal = Math.min(...data.map(d => d.value));
  const maxVal = Math.max(...data.map(d => d.value));
  const range = (maxVal - minVal) || 1;
  const paddingY = 8;
  const h = height;
  const w = 320;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - paddingY - ((d.value - minVal) / range) * (h - paddingY * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className="mini-chart-wrapper font-mono">
      <svg viewBox={`0 0 ${w} ${h}`} className="mini-timeseries-svg" preserveAspectRatio="none">
        <line x1="0" y1={paddingY} x2={w} y2={paddingY} stroke="#f1f5f9" strokeWidth="1" />
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="#f1f5f9" strokeWidth="1" />
        <line x1="0" y1={h - paddingY} x2={w} y2={h - paddingY} stroke="#f1f5f9" strokeWidth="1" />
        <polyline fill="none" stroke={color} strokeWidth="1.6" points={points} />
      </svg>
      <div className="mini-chart-axis-labels">
        <span>{data[0]?.timeMs || 0} ms</span>
        <span className="font-bold text-main">{minVal.toFixed(1)} – {maxVal.toFixed(1)} {unit}</span>
        <span>{data[data.length - 1]?.timeMs || 0} ms</span>
      </div>
    </div>
  );
};

export const OfflineAnalysisPage = () => {
  // Workflow step: 'UPLOAD' | 'MAP_PREVIEW' | 'ANALYSIS'
  const [currentStep, setCurrentStep] = useState('UPLOAD');
  const [pipelineState, setPipelineState] = useState('READY');
  const [targetMotorId, setTargetMotorId] = useState('MTR-001');
  const [fileData, setFileData] = useState(null);
  const [mapping, setMapping] = useState({});
  const [validation, setValidation] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [customFsInput, setCustomFsInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [savedRecords, setSavedRecords] = useState([]);
  const fileInputRef = useRef(null);

  const waveformCanvasRef = useRef(null);
  const fftCanvasRef = useRef(null);

  const workflowSteps = [
    'UPLOAD DATASET',
    'VALIDATE DATASET',
    'MAP CHANNELS',
    'PREVIEW RAW DATA',
    'CONFIGURE ANALYSIS',
    'SIGNAL PROCESSING',
    'FFT SPECTRUM',
    '1X DETECTION',
    'ESTIMATED RPM',
    'FEATURE EXTRACTION',
    'RESULTS & GRAPHS'
  ];

  useEffect(() => {
    setSavedRecords(fileAnalysisService.getSavedRecords());
  }, []);

  // Handle file drop/selection
  const handleFileProcess = async (file) => {
    if (!file) return;
    setErrorMsg(null);
    setSaveSuccessMsg(null);
    setPipelineState('READ FILE');

    try {
      const parsed = await fileAnalysisService.parseFile(file);
      setPipelineState('VALIDATE DATASET');
      const val = parsed.validation || fileAnalysisService.validateMappedData(parsed.rows, parsed.mapping, parsed.metadata);
      
      // Auto-associate Motor ID if detected in file metadata
      if (parsed.fileInfo.motorId && parsed.fileInfo.motorId !== 'Not available') {
        const match = MOTOR_REGISTRY.find(m => 
          m.motorId.toLowerCase() === parsed.fileInfo.motorId.toLowerCase() || 
          parsed.fileInfo.motorId.toLowerCase().includes(m.motorId.toLowerCase())
        );
        if (match) setTargetMotorId(match.motorId);
      }

      setFileData(parsed);
      setMapping(parsed.mapping);
      setValidation(val);
      setCustomFsInput(val.stats.calculatedFs || parsed.fileInfo.rawSamplingRate || '');
      setPipelineState('MAP CHANNELS');
      setCurrentStep('MAP_PREVIEW');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to process file.');
      setPipelineState('READY');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Load built-in sample file for quick demonstration
  const handleLoadSample = async (format) => {
    const blob = fileAnalysisService.generateSampleFile(format);
    const file = new File([blob], `SAMPLE_MOTOR_DATASET_${format.toUpperCase()}.${format}`, { type: blob.type });
    await handleFileProcess(file);
  };

  // Update a column mapping
  const handleMappingChange = (targetKey, selectedCol) => {
    const updated = { ...mapping, [targetKey]: selectedCol === 'NONE' ? null : selectedCol };
    setMapping(updated);
    const val = fileAnalysisService.validateMappedData(fileData.rows, updated, fileData.metadata);
    setValidation(val);
    if (val.stats.calculatedFs) {
      setCustomFsInput(val.stats.calculatedFs);
    }
  };

  // Run full analysis sequence
  const handleStartAnalysis = () => {
    setPipelineState('SIGNAL PROCESSING');

    setTimeout(() => {
      setPipelineState('FFT SPECTRUM');
      setTimeout(() => {
        setPipelineState('1X DETECTION');
        setTimeout(() => {
          setPipelineState('ESTIMATED RPM');
          setTimeout(() => {
            setPipelineState('FEATURE EXTRACTION');
            setTimeout(() => {
              const res = fileAnalysisService.processOfflineData(
                fileData.rows, 
                mapping, 
                fileData.fileInfo, 
                targetMotorId, 
                customFsInput ? parseFloat(customFsInput) : null
              );
              setAnalysisResult(res);
              fileAnalysisService.saveRecord(res);
              setSavedRecords(fileAnalysisService.getSavedRecords());
              setPipelineState('RESULTS & GRAPHS');
              setCurrentStep('ANALYSIS');
            }, 300);
          }, 300);
        }, 300);
      }, 300);
    }, 300);
  };

  // Manual save to history button in results
  const handleSaveToHistory = () => {
    if (!analysisResult) return;
    fileAnalysisService.saveRecord(analysisResult);
    setSavedRecords(fileAnalysisService.getSavedRecords());
    setSaveSuccessMsg(`Analysis record for ${analysisResult.motorId} successfully logged to local history.`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Reopen saved record
  const handleReopenRecord = (rec) => {
    if (rec.analysisData) {
      setAnalysisResult(rec.analysisData);
      setTargetMotorId(rec.motorId);
      setCurrentStep('ANALYSIS');
      setPipelineState('RESULTS & GRAPHS');
    } else {
      handleLoadSample('csv');
    }
  };

  // Render Vibration Waveform in Results
  useEffect(() => {
    if (currentStep !== 'ANALYSIS' || !analysisResult || !waveformCanvasRef.current) return;
    const canvas = waveformCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const wf = analysisResult.vibrationWaveform || [];

    ctx.clearRect(0, 0, w, h);

    // Subtle grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    // Center baseline
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (wf.length === 0) return;
    const maxAmp = Math.max(3, ...wf.map(p => Math.abs(p.amplitude))) * 1.15;

    ctx.beginPath();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.6;
    wf.forEach((pt, i) => {
      const x = (i / (wf.length - 1)) * w;
      const y = h / 2 - (pt.amplitude / maxAmp) * (h / 2 - 8);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.fillText(`+${maxAmp.toFixed(1)} mm/s`, 8, 12);
    ctx.fillText(`-${maxAmp.toFixed(1)} mm/s`, 8, h - 4);
    ctx.fillText(`${wf[0]?.timeMs || 0} ms`, 8, h / 2 + 10);
    ctx.fillText(`${wf[wf.length - 1]?.timeMs || 0} ms`, w - 65, h / 2 + 10);
  }, [currentStep, analysisResult]);

  // Render FFT in Results
  useEffect(() => {
    if (currentStep !== 'ANALYSIS' || !analysisResult || !fftCanvasRef.current) return;
    const canvas = fftCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const spectrum = analysisResult.vibrationSpectrum || [];

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (spectrum.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText('FFT spectrum unavailable (Sampling rate not established or vibration unmapped)', 20, h / 2);
      return;
    }

    const maxAmp = Math.max(1.5, ...spectrum.map(s => s.amplitude)) * 1.15;
    const barW = w / spectrum.length;

    const rpmObj = analysisResult.estimatedRPM;
    let bin1X = null;
    if (rpmObj && rpmObj.isReliable && rpmObj.frequency1X) {
      bin1X = spectrum.reduce((closest, curr) => 
        Math.abs(curr.frequency - rpmObj.frequency1X) < Math.abs(closest.frequency - rpmObj.frequency1X) ? curr : closest
      , spectrum[0]);
    }

    spectrum.forEach((bin, i) => {
      const x = i * barW;
      const barH = (bin.amplitude / maxAmp) * (h - 26);
      const y = h - barH - 14;

      if (bin.isDominant) {
        ctx.fillStyle = '#dc2626'; // Red for dominant peak
      } else if (bin1X && Math.abs(bin.frequency - bin1X.frequency) < 0.6) {
        ctx.fillStyle = '#d97706'; // Amber for 1X rotational peak
      } else {
        ctx.fillStyle = '#3b82f6';
      }
      ctx.fillRect(x, y, Math.max(1.8, barW - 1), barH);
    });

    const maxFreq = spectrum[spectrum.length - 1]?.frequency || 300;
    ctx.fillStyle = '#64748b';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.fillText('0 Hz', 6, h - 3);
    ctx.fillText(`${(maxFreq / 2).toFixed(0)} Hz`, w / 2 - 15, h - 3);
    ctx.fillText(`${maxFreq.toFixed(0)} Hz`, w - 45, h - 3);

    const dom = spectrum.find(s => s.isDominant);
    if (dom) {
      const domX = (spectrum.indexOf(dom) / spectrum.length) * w;
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.fillText(`Dominant: ${dom.frequency} Hz (${dom.amplitude.toFixed(2)} mm/s)`, Math.min(w - 150, Math.max(10, domX - 20)), 12);
    }

    if (bin1X && rpmObj && rpmObj.isReliable) {
      const x1 = (spectrum.indexOf(bin1X) / spectrum.length) * w;
      ctx.fillStyle = '#d97706';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.fillText(`▲ 1X Peak: ${rpmObj.frequency1X} Hz (${rpmObj.estimatedRPM} RPM)`, Math.min(w - 160, Math.max(10, x1 - 15)), 25);
    }
  }, [currentStep, analysisResult]);

  return (
    <div className="offline-analysis-page">
      {/* Page Title & Mode Tag */}
      <div className="page-header-block">
        <div>
          <h1 className="page-title">OFFLINE DATASET ANALYSIS</h1>
          <div className="page-subtitle">Import recorded industrial motor datasets (CSV, JSON, XML) and run offline signal processing on actual physical waveforms.</div>
        </div>
        <div className="source-tag font-mono">
          OPERATING MODE: <strong>OFFLINE ANALYSIS</strong> • DATA SOURCE: <strong>UPLOADED RECORDING</strong>
        </div>
      </div>

      {/* Workflow Stepper Bar */}
      <div className="eng-card stepper-card">
        <div className="eng-card-header">
          <span className="eng-card-title">
            <Layers size={13} className="text-blue" />
            <span>OFFLINE PROCESSING PIPELINE WORKFLOW</span>
          </span>
          <span className="font-mono text-xs text-muted">
            STAGE: <strong>{pipelineState}</strong>
          </span>
        </div>
        <div className="eng-card-body">
          <div className="offline-pipeline-steps">
            {workflowSteps.map((stg, i) => {
              const activeIndex = workflowSteps.indexOf(pipelineState);
              const isCurrent = pipelineState === stg;
              const isPast = activeIndex > i;
              return (
                <div key={stg} className={`pipeline-step-mini ${isCurrent ? 'active' : ''} ${isPast ? 'completed' : ''}`}>
                  <div className="step-circle-mini font-mono">
                    {isPast ? '✓' : i + 1}
                  </div>
                  <div className="step-label-mini font-mono">{stg}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* STEP 1: UPLOAD AREA */}
      {currentStep === 'UPLOAD' && (
        <div className="upload-container-grid">
          {/* Main Drag-and-Drop Card */}
          <div className="eng-card upload-main-card">
            <div className="eng-card-header">
              <span className="eng-card-title">
                <UploadCloud size={13} className="text-blue" />
                <span>UPLOAD MOTOR DATASET FILE</span>
              </span>
              <span className="font-mono text-xs text-muted">SUPPORTED: CSV · JSON · XML</span>
            </div>
            <div className="eng-card-body">
              <div 
                className={`dropzone-box ${isDragging ? 'dragging' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept=".csv,.json,.xml"
                  onChange={(e) => e.target.files && handleFileProcess(e.target.files[0])}
                />
                <div className="dropzone-icon">
                  <UploadCloud size={36} className="text-blue" />
                </div>
                <div className="dropzone-title">DRAG AND DROP MOTOR DATASET FILE HERE</div>
                <div className="dropzone-subtitle">or click to browse from your engineering workstation</div>
                <div className="dropzone-meta font-mono">
                  <span>ACCEPTED FORMATS: .CSV, .JSON, .XML</span>
                  <span>•</span>
                  <span>100% OFFLINE LOCAL PARSING</span>
                  <span>•</span>
                  <span>NO CLOUD DEPENDENCIES</span>
                </div>
                <button className="eng-btn eng-btn-primary dropzone-browse-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  Browse Workstation Files
                </button>
              </div>

              {errorMsg && (
                <div className="upload-error-banner font-mono">
                  <AlertCircle size={14} className="text-red flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Sample Files Provider for Instant Evaluation */}
              <div className="sample-files-box">
                <div className="sample-files-label font-mono">
                  <span>PRE-PACKAGED BENCHMARK MOTOR DATASETS:</span>
                </div>
                <div className="sample-buttons-row">
                  <button className="eng-btn eng-btn-secondary eng-btn-sm font-mono" onClick={() => handleLoadSample('csv')}>
                    <FileSpreadsheet size={12} className="text-blue" />
                    <span>LOAD CSV (MTR-001 • NOMINAL BASELINE)</span>
                  </button>
                  <button className="eng-btn eng-btn-secondary eng-btn-sm font-mono" onClick={() => handleLoadSample('json')}>
                    <FileCode size={12} className="text-blue" />
                    <span>LOAD JSON (MTR-002 • BEARING IMPACT HARMONICS)</span>
                  </button>
                  <button className="eng-btn eng-btn-secondary eng-btn-sm font-mono" onClick={() => handleLoadSample('xml')}>
                    <FileText size={12} className="text-blue" />
                    <span>LOAD XML (MTR-003 • MASS UNBALANCE)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Previous Analyzed Records / History Drawer */}
          <div className="eng-card previous-records-card">
            <div className="eng-card-header">
              <span className="eng-card-title">
                <HistoryIcon size={13} className="text-blue" />
                <span>SAVED OFFLINE DATASETS ({savedRecords.length})</span>
              </span>
              <span className="font-mono text-xs text-muted">LOCAL REPOSITORY</span>
            </div>
            <div className="eng-card-body p-0">
              <div className="saved-records-list">
                {savedRecords.map((rec) => (
                  <div key={rec.id} className="saved-record-item">
                    <div className="record-top">
                      <span className="record-id font-mono text-blue font-bold">{rec.id}</span>
                      <span className="record-date font-mono text-muted">{rec.date}</span>
                    </div>
                    <div className="record-name font-mono">{rec.fileName}</div>
                    <div className="record-meta font-mono text-xs text-muted">
                      {rec.fileType} • {rec.motorId} • {rec.samples ? `${rec.samples.toLocaleString()} samples` : ''}
                    </div>
                    {rec.referenceDatasetLabel && rec.referenceDatasetLabel !== 'None' && (
                      <div className="record-label-tag font-mono text-xs">
                        Ref Label: <strong>{rec.referenceDatasetLabel}</strong>
                      </div>
                    )}
                    <div className="record-footer">
                      <span className="record-channels font-mono">{rec.channels}</span>
                      <button 
                        className="eng-btn eng-btn-secondary eng-btn-sm font-mono"
                        onClick={() => handleReopenRecord(rec)}
                      >
                        <Eye size={11} />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: FILE INFORMATION, MAPPING, VALIDATION & CONFIGURATION */}
      {currentStep === 'MAP_PREVIEW' && fileData && (
        <div className="map-preview-container">
          {/* Target Motor Selection Card */}
          <div className="eng-card mb-12">
            <div className="eng-card-header">
              <span className="eng-card-title">
                <Cpu size={13} className="text-blue" />
                <span>TARGET MOTOR ASSOCIATION (PLANT FLEET)</span>
              </span>
              <span className="font-mono text-xs text-muted">ASSOCIATE INGESTED DATASET WITH MOTOR ID</span>
            </div>
            <div className="eng-card-body">
              <div className="target-motor-selector-box" style={{ maxWidth: '520px' }}>
                <label className="form-label font-mono">FACILITY MOTOR IDENTIFIER</label>
                <select 
                  className="eng-select font-mono font-bold"
                  value={targetMotorId}
                  onChange={(e) => setTargetMotorId(e.target.value)}
                  id="offline-target-motor-select"
                >
                  {MOTOR_REGISTRY.map((m) => (
                    <option key={m.motorId} value={m.motorId}>
                      {m.motorId} — {m.name} ({m.location})
                    </option>
                  ))}
                </select>
                <div className="font-mono text-xs text-muted mt-4">
                  {fileData?.fileInfo?.motorId && fileData.fileInfo.motorId !== 'Not available' ? (
                    <span>Metadata header identified Motor ID: <strong className="text-blue">{fileData.fileInfo.motorId}</strong></span>
                  ) : (
                    <span>Dataset did not specify a Motor ID in metadata; associated with <strong>{targetMotorId}</strong>.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 10: Ingestion Field & Feature Availability Matrix (Requirement 9, 10) */}
          <div className="eng-card mb-12 feature-matrix-card">
            <div className="eng-card-header">
              <span className="eng-card-title">
                <Layers size={13} className="text-blue" />
                <span>DATASET INGESTION & FEATURE AVAILABILITY MATRIX</span>
              </span>
              <span className="badge badge-info badge-sm font-mono">SECTION 10 COMPLIANT</span>
            </div>
            <div className="eng-card-body">
              <p className="font-mono text-xs text-muted mb-8">
                Distinguishes required identity fields, physical measurements, and processed features. Missing optional features do not reject the dataset.
              </p>
              <div className="eng-table-container">
                <table className="eng-table font-mono">
                  <thead>
                    <tr>
                      <th>CATEGORY</th>
                      <th>FIELD / FEATURE</th>
                      <th>STATUS</th>
                      <th>CLASSIFICATION</th>
                      <th>SOURCE / DETAILS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Identity Fields */}
                    {validation?.featureAvailability?.identity?.map((f, idx) => (
                      <tr key={`id-${idx}`}>
                        <td className="font-bold text-blue">IDENTITY</td>
                        <td className="font-bold">{f.field}</td>
                        <td>
                          <span className={`badge ${f.status === 'Available' ? 'badge-healthy' : 'badge-muted'} badge-sm`}>
                            {f.status}
                          </span>
                        </td>
                        <td>Required Identity</td>
                        <td className="text-muted text-xs">{f.details}</td>
                      </tr>
                    ))}

                    {/* Electrical Fields */}
                    {validation?.featureAvailability?.electrical?.map((f, idx) => (
                      <tr key={`elec-${idx}`}>
                        <td className="font-bold text-amber">ELECTRICAL</td>
                        <td className="font-bold">{f.field}</td>
                        <td>
                          <span className={`badge ${f.status === 'Available' ? 'badge-healthy' : f.status === 'Not available' ? 'badge-warning' : 'badge-muted'} badge-sm`}>
                            {f.status}
                          </span>
                        </td>
                        <td>Electrical Telemetry</td>
                        <td className="text-muted text-xs">{f.details}</td>
                      </tr>
                    ))}

                    {/* Thermal Fields */}
                    {validation?.featureAvailability?.thermal?.map((f, idx) => (
                      <tr key={`therm-${idx}`}>
                        <td className="font-bold text-orange">THERMAL</td>
                        <td className="font-bold">{f.field}</td>
                        <td>
                          <span className={`badge ${f.status === 'Available' ? 'badge-healthy' : f.status === 'Not available' ? 'badge-warning' : 'badge-muted'} badge-sm`}>
                            {f.status}
                          </span>
                        </td>
                        <td>Thermal Telemetry</td>
                        <td className="text-muted text-xs">{f.details}</td>
                      </tr>
                    ))}

                    {/* Vibration Fields */}
                    {validation?.featureAvailability?.vibration?.map((f, idx) => (
                      <tr key={`vib-${idx}`}>
                        <td className="font-bold text-blue">VIBRATION</td>
                        <td className="font-bold">{f.field}</td>
                        <td>
                          <span className={`badge ${f.status === 'Available' ? 'badge-healthy' : f.status === 'Not available' ? 'badge-warning' : 'badge-muted'} badge-sm`}>
                            {f.status}
                          </span>
                        </td>
                        <td>Core Vibration Signal</td>
                        <td className="text-muted text-xs">{f.details}</td>
                      </tr>
                    ))}

                    {/* Optional Features */}
                    {validation?.featureAvailability?.optional?.map((f, idx) => (
                      <tr key={`opt-${idx}`}>
                        <td className="font-bold text-muted">OPTIONAL</td>
                        <td className="font-bold">{f.field}</td>
                        <td>
                          <span className={`badge ${f.status === 'Available' ? 'badge-healthy' : f.status === 'Not available' ? 'badge-warning' : 'badge-muted'} badge-sm`}>
                            {f.status}
                          </span>
                        </td>
                        <td>Optional / Derived Feature</td>
                        <td className="text-muted text-xs">{f.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Detailed Validation Checklist (Requirements 5 & 21) */}
          <div className="eng-card mb-12 validation-checklist-card">
            <div className="eng-card-header">
              <span className="eng-card-title">
                <CheckCircle2 size={13} className="text-blue" />
                <span>DATASET INTEGRITY & VALIDATION CHECKLIST</span>
              </span>
              <span className={`badge ${validation?.isValid ? 'badge-healthy' : 'badge-fault'} badge-sm`}>
                {validation?.isValid ? 'VALIDATION PASSED' : 'VALIDATION BLOCKED'}
              </span>
            </div>
            <div className="eng-card-body">
              <div className="validation-checks-grid font-mono">
                {validation?.checks?.map((chk) => (
                  <div key={chk.id} className={`val-check-item status-${chk.status.toLowerCase()}`}>
                    <div className="val-check-header">
                      {chk.status === 'PASS' && <CheckCircle2 size={13} className="text-green flex-shrink-0" />}
                      {chk.status === 'WARN' && <AlertTriangle size={13} className="text-amber flex-shrink-0" />}
                      {chk.status === 'FAIL' && <AlertCircle size={13} className="text-red flex-shrink-0" />}
                      {chk.status === 'INFO' && <Info size={13} className="text-blue flex-shrink-0" />}
                      <span className="val-check-name font-bold">{chk.name}</span>
                      <span className={`val-check-pill pill-${chk.status.toLowerCase()}`}>{chk.status}</span>
                    </div>
                    <div className="val-check-msg text-xs">{chk.message}</div>
                  </div>
                ))}
              </div>

              {/* Validation Summary Metrics */}
              {validation?.stats && (
                <div className="val-metrics-bar font-mono text-xs">
                  <span>Total Samples: <strong>{validation.stats.totalRows.toLocaleString()}</strong></span>
                  <span>•</span>
                  <span>Valid Numeric Rows: <strong>{validation.stats.validRows.toLocaleString()}</strong></span>
                  <span>•</span>
                  <span>Missing Values: <strong>{validation.stats.missingCount}</strong></span>
                  <span>•</span>
                  <span>Corrupt/NaN: <strong>{validation.stats.nanCount + validation.stats.infCount}</strong></span>
                  <span>•</span>
                  <span>Calculated Sampling Rate: <strong className="text-blue">{validation.stats.calculatedFs ? `${validation.stats.calculatedFs} Hz` : 'Not established'}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Channel Mapping Matrix (Requirement 4) */}
          <div className="eng-card mapping-card mb-12">
            <div className="eng-card-header">
              <span className="eng-card-title">
                <Layers size={13} className="text-blue" />
                <span>DATASET FIELD MAPPING (COMMON MOTOR DATA MODEL)</span>
              </span>
              <span className="font-mono text-xs text-muted">CONFIGURABLE SENSOR CHANNEL ALIASES</span>
            </div>
            <div className="eng-card-body">
              <div className="mapping-table-container">
                <table className="eng-table font-mono">
                  <thead>
                    <tr>
                      <th>STANDARD INTERNAL FIELD</th>
                      <th>ROLE IN MOTOR SYSTEM</th>
                      <th>DETECTED COLUMN</th>
                      <th>MANUAL CHANNEL ASSIGNMENT</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-bold text-blue">vibration</td>
                      <td>CORE PHYSICAL INPUT (FFT / RMS / 1X DERIVATION)</td>
                      <td className="font-bold">{mapping.vibration || <span className="text-red font-normal">Unmapped</span>}</td>
                      <td>
                        <select 
                          className="eng-select font-mono"
                          value={mapping.vibration || 'NONE'}
                          onChange={(e) => handleMappingChange('vibration', e.target.value)}
                        >
                          <option value="NONE">-- Select Vibration Column --</option>
                          {fileData.columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td>
                        {mapping.vibration ? <Badge status="HEALTHY" label="MAPPED" size="sm" /> : <Badge status="FAULT" label="REQUIRED" size="sm" />}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-bold">current</td>
                      <td>PHYSICAL SENSOR (STATOR LOAD / PHASE CURRENT)</td>
                      <td>{mapping.current || <span className="text-muted">Not detected</span>}</td>
                      <td>
                        <select 
                          className="eng-select font-mono"
                          value={mapping.current || 'NONE'}
                          onChange={(e) => handleMappingChange('current', e.target.value)}
                        >
                          <option value="NONE">-- None / Optional --</option>
                          {fileData.columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td>
                        {mapping.current ? <Badge status="HEALTHY" label="MAPPED" size="sm" /> : <Badge status="STANDBY" label="OPTIONAL" size="sm" />}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-bold">voltage</td>
                      <td>PHYSICAL SENSOR (SUPPLY VOLTAGE RMS / SAG)</td>
                      <td>{mapping.voltage || <span className="text-muted">Not detected</span>}</td>
                      <td>
                        <select 
                          className="eng-select font-mono"
                          value={mapping.voltage || 'NONE'}
                          onChange={(e) => handleMappingChange('voltage', e.target.value)}
                        >
                          <option value="NONE">-- None / Optional --</option>
                          {fileData.columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td>
                        {mapping.voltage ? <Badge status="HEALTHY" label="MAPPED" size="sm" /> : <Badge status="STANDBY" label="OPTIONAL" size="sm" />}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-bold">temperature</td>
                      <td>PHYSICAL SENSOR (BEARING / STATOR CORE TEMP)</td>
                      <td>{mapping.temperature || <span className="text-muted">Not detected</span>}</td>
                      <td>
                        <select 
                          className="eng-select font-mono"
                          value={mapping.temperature || 'NONE'}
                          onChange={(e) => handleMappingChange('temperature', e.target.value)}
                        >
                          <option value="NONE">-- None / Optional --</option>
                          {fileData.columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td>
                        {mapping.temperature ? <Badge status="HEALTHY" label="MAPPED" size="sm" /> : <Badge status="STANDBY" label="OPTIONAL" size="sm" />}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-bold text-muted">timestamp</td>
                      <td>TIME REFERENCE / SAMPLING INTERVAL (Δt)</td>
                      <td>{mapping.timestamp || <span className="text-muted">Not mapped</span>}</td>
                      <td>
                        <select 
                          className="eng-select font-mono"
                          value={mapping.timestamp || 'NONE'}
                          onChange={(e) => handleMappingChange('timestamp', e.target.value)}
                        >
                          <option value="NONE">-- No Timestamp Column --</option>
                          {fileData.columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td>
                        {mapping.timestamp ? <Badge status="INFO" label="INDEXED" size="sm" /> : <Badge status="STANDBY" label="OPTIONAL" size="sm" />}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-bold text-amber">referenceLabel</td>
                      <td>METADATA ONLY (BENCHMARK DATASET CONDITION)</td>
                      <td>{mapping.referenceLabel || fileData.metadata?.referenceDatasetLabel || <span className="text-muted">None</span>}</td>
                      <td>
                        <select 
                          className="eng-select font-mono"
                          value={mapping.referenceLabel || 'NONE'}
                          onChange={(e) => handleMappingChange('referenceLabel', e.target.value)}
                        >
                          <option value="NONE">-- None / Optional --</option>
                          {fileData.columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td>
                        <Badge status="WARNING" label="METADATA" size="sm" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Analysis Configuration Card (Requirement 6) */}
          <div className="eng-card mb-12 config-card">
            <div className="eng-card-header">
              <span className="eng-card-title">
                <Sliders size={13} className="text-blue" />
                <span>ANALYSIS CONFIGURATION & SAMPLING FREQUENCY</span>
              </span>
              <span className="font-mono text-xs text-muted">VERIFIED TIMEBASE FOR SPECTRAL DECOMPOSITION</span>
            </div>
            <div className="eng-card-body">
              <div className="config-grid font-mono">
                <div className="config-item">
                  <label className="form-label font-bold">SAMPLING RATE (Fs in Hz)</label>
                  <div className="flex items-center gap-8">
                    <input 
                      type="number"
                      className="eng-input font-bold text-blue"
                      placeholder="e.g. 2560 or 25600"
                      value={customFsInput}
                      onChange={(e) => setCustomFsInput(e.target.value)}
                      style={{ maxWidth: '200px' }}
                    />
                    <span className="text-xs text-muted">Hz</span>
                  </div>
                  <div className="text-xs text-muted mt-4">
                    {validation?.stats?.calculatedFs ? (
                      <span className="text-green">✓ Automatically calculated from timestamp interval (Δt = {validation.stats.deltaT ? (validation.stats.deltaT * 1000).toFixed(3) : '—'} ms).</span>
                    ) : (
                      <span className="text-amber">⚠ Timestamp interval could not be calculated. Enter acquisition sampling frequency to enable FFT and speed estimation.</span>
                    )}
                  </div>
                </div>

                <div className="config-item rule-box">
                  <div className="font-bold text-xs text-main">CRITICAL SAMPLING RATE RULE:</div>
                  <div className="text-xs text-muted mt-2">
                    Sampling rate is strictly required for FFT. If a valid sampling rate cannot be established:
                    <ul className="mt-2 pl-12">
                      <li>• FFT = unavailable</li>
                      <li>• 1X running frequency = unavailable</li>
                      <li>• Estimated RPM = unavailable</li>
                    </ul>
                    The system does NOT assume an arbitrary sampling rate.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* First Rows Raw Data Preview (Requirement 19) */}
          <div className="eng-card raw-preview-card">
            <div className="eng-card-header">
              <span className="eng-card-title">
                <FileSpreadsheet size={13} className="text-blue" />
                <span>RAW DATASET PREVIEW (FIRST 10 OF {fileData.rows.length.toLocaleString()} ACTUAL ROWS)</span>
              </span>
              <span className="font-mono text-xs text-muted">UNMODIFIED WORKSTATION FILE TELEMETRY</span>
            </div>
            <div className="eng-table-container">
              <table className="eng-table font-mono">
                <thead>
                  <tr>
                    <th>#</th>
                    {fileData.columns.map(col => <th key={col}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {fileData.rows.slice(0, 10).map((row, idx) => (
                    <tr key={idx}>
                      <td className="text-muted">{idx + 1}</td>
                      {fileData.columns.map(col => (
                        <td key={col}>
                          {typeof row[col] === 'number' ? row[col].toFixed(3) : (row[col] !== undefined ? String(row[col]) : '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Bar */}
            <div className="preview-action-bar">
              <button 
                className="eng-btn eng-btn-secondary"
                onClick={() => {
                  setCurrentStep('UPLOAD');
                  setFileData(null);
                }}
              >
                Upload Different Dataset
              </button>
              <button 
                id="btn-execute-offline-analysis"
                className="eng-btn eng-btn-primary test-btn-large"
                disabled={!validation?.isValid}
                onClick={handleStartAnalysis}
              >
                <Play size={14} />
                <span>RUN OFFLINE SIGNAL PROCESSING</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: ANALYSIS RESULTS VIEW (Requirements 17 & 18) */}
      {currentStep === 'ANALYSIS' && analysisResult && (
        <div className="analysis-results-container">
          {/* Top Banner with Clear Diagnostic Notice */}
          <div className="results-header-banner">
            <div className="results-header-left">
              <div className="results-title font-mono font-bold">
                OFFLINE ANALYSIS: <span className="text-blue">{analysisResult.motorId}</span> — {getMotorById(analysisResult.motorId)?.name}
              </div>
              <div className="results-file font-mono text-muted">
                {analysisResult.fileInfo.fileName} • {analysisResult.sampleCount.toLocaleString()} SAMPLES • LOCATION: {getMotorById(analysisResult.motorId)?.location}
              </div>
            </div>
            <div className="results-header-right">
              <button 
                className="eng-btn eng-btn-primary eng-btn-sm font-mono"
                onClick={handleSaveToHistory}
              >
                <BookmarkCheck size={12} />
                <span>Save to History</span>
              </button>
              <button 
                className="eng-btn eng-btn-secondary eng-btn-sm font-mono"
                onClick={() => setCurrentStep('MAP_PREVIEW')}
              >
                Back to Mapping
              </button>
            </div>
          </div>

          {saveSuccessMsg && (
            <div className="save-toast-banner font-mono">
              <CheckCircle2 size={14} className="text-green" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Reference Dataset Label Card (Requirements 20 & 21) */}
          {analysisResult.referenceDatasetLabel && (
            <div className="reference-dataset-label-card">
              <div className="ref-label-badge font-mono font-bold">
                REFERENCE DATASET LABEL: <span className="text-blue">{analysisResult.referenceDatasetLabel}</span>
              </div>
              <div className="ref-label-disclaimer font-mono text-xs">
                {analysisResult.referenceDatasetDisclaimer}
              </div>
            </div>
          )}

          {/* Ingestion Summary Card */}
          <div className="eng-card section-card">
            <div className="eng-card-header">
              <span className="eng-card-title">
                <FileText size={13} className="text-blue" />
                <span>DATASET INGESTION SUMMARY</span>
              </span>
              <span className="font-mono text-xs text-muted">ACQUISITION TIMEBASE</span>
            </div>
            <div className="eng-card-body">
              <div className="results-summary-grid font-mono">
                <div className="summary-item">
                  <span className="sum-label">MOTOR IDENTIFIER</span>
                  <span className="sum-val font-bold text-blue">{analysisResult.motorId}</span>
                </div>
                <div className="summary-item">
                  <span className="sum-label">DATASET FILE</span>
                  <span className="sum-val font-bold">{analysisResult.fileInfo.fileName}</span>
                </div>
                <div className="summary-item">
                  <span className="sum-label">FILE FORMAT</span>
                  <span className="sum-val">{analysisResult.fileInfo.fileType}</span>
                </div>
                <div className="summary-item">
                  <span className="sum-label">TOTAL SAMPLES</span>
                  <span className="sum-val font-bold">{analysisResult.sampleCount.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                  <span className="sum-label">SAMPLING RATE</span>
                  <span className="sum-val font-bold text-blue">{analysisResult.fileInfo.samplingRate}</span>
                </div>
                <div className="summary-item">
                  <span className="sum-label">RECORDING DURATION</span>
                  <span className="sum-val">{analysisResult.fileInfo.duration}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 1. Vibration Waveform vs Time & 2. Vibration FFT Spectrum (Requirement 18) */}
          <div className="eng-card section-card primary-vib-results-card">
            <div className="eng-card-header">
              <span className="eng-card-title">
                <Radio size={13} className="text-blue" />
                <span>VIBRATION WAVEFORM & FREQUENCY ANALYSIS (ACTUAL UPLOADED DATA)</span>
              </span>
              <span className="badge badge-info badge-sm">CORE PHYSICAL INPUT</span>
            </div>
            <div className="eng-card-body">
              {analysisResult.vibrationFeatures ? (
                <>
                  {/* Waveform & FFT Canvas Grid */}
                  <div className="analysis-charts-grid">
                    <div className="vib-box">
                      <div className="vib-box-header font-mono">1. VIBRATION WAVEFORM VS TIME (DOWNSAMPLED FROM UPLOADED RECORDING)</div>
                      <div className="canvas-wrapper">
                        <canvas ref={waveformCanvasRef} width={580} height={160} className="result-canvas" />
                      </div>
                    </div>
                    <div className="vib-box">
                      <div className="vib-box-header font-mono">2. VIBRATION FFT / FREQUENCY SPECTRUM (ACTUAL UPLOADED SIGNAL)</div>
                      <div className="canvas-wrapper">
                        <canvas ref={fftCanvasRef} width={580} height={160} className="result-canvas" />
                      </div>
                    </div>
                  </div>

                  {/* Vibration Time-Domain Feature Readouts (Requirement 9) */}
                  <div className="features-readout-bar font-mono">
                    <div className="feat-block">
                      <span className="feat-lbl">VIBRATION RMS</span>
                      <span className="feat-num text-blue font-bold">{analysisResult.vibrationFeatures.rms} mm/s</span>
                    </div>
                    <div className="feat-block">
                      <span className="feat-lbl">PEAK AMPLITUDE</span>
                      <span className="feat-num">{analysisResult.vibrationFeatures.peak} mm/s</span>
                    </div>
                    <div className="feat-block">
                      <span className="feat-lbl">PEAK-TO-PEAK</span>
                      <span className="feat-num">{analysisResult.vibrationFeatures.peakToPeak ? `${analysisResult.vibrationFeatures.peakToPeak} mm/s` : '—'}</span>
                    </div>
                    <div className="feat-block">
                      <span className="feat-lbl">STD DEV (σ)</span>
                      <span className="feat-num">{analysisResult.vibrationFeatures.standardDeviation ? `${analysisResult.vibrationFeatures.standardDeviation} mm/s` : '—'}</span>
                    </div>
                    <div className="feat-block">
                      <span className="feat-lbl">CREST FACTOR (Peak/RMS)</span>
                      <span className="feat-num font-bold">{analysisResult.vibrationFeatures.crestFactor}</span>
                    </div>
                    <div className="feat-block">
                      <span className="feat-lbl">DOMINANT FREQ</span>
                      <span className="feat-num text-red font-bold">
                        {analysisResult.vibrationFeatures.dominantFreq ? `${analysisResult.vibrationFeatures.dominantFreq} Hz` : 'Not available'}
                      </span>
                    </div>
                    <div className="feat-block">
                      <span className="feat-lbl">DOMINANT AMP</span>
                      <span className="feat-num">
                        {analysisResult.vibrationFeatures.dominantAmp ? `${analysisResult.vibrationFeatures.dominantAmp} mm/s` : '—'}
                      </span>
                    </div>
                    <div className="feat-block">
                      <span className="feat-lbl">1X RUNNING FREQ</span>
                      <span className="feat-num text-amber font-bold">
                        {analysisResult.estimatedRPM?.isReliable ? `${analysisResult.estimatedRPM.frequency1X} Hz` : 'Not available'}
                      </span>
                    </div>
                    <div className="feat-block">
                      <span className="feat-lbl">MEAN LEVEL</span>
                      <span className="feat-num">{analysisResult.vibrationFeatures.mean} mm/s</span>
                    </div>
                  </div>

                  {/* Harmonics (1X - 4X) Readout Row (Requirement 13) */}
                  <div className="harmonics-readout-row font-mono">
                    <span className="harmonics-title font-bold">HARMONIC COMPONENTS:</span>
                    {analysisResult.vibrationFeatures.harmonics && analysisResult.vibrationFeatures.harmonics.length > 0 ? (
                      <div className="harmonics-pills-wrap">
                        {analysisResult.vibrationFeatures.harmonics.map((h) => (
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
                      <span className="text-xs text-muted">1X rotational frequency not identified; harmonic breakdown unavailable</span>
                    )}
                  </div>

                  {/* SPEED ESTIMATION CARD (Requirements 11 & 12) */}
                  <div className="derived-rpm-callout-card">
                    <div className="drp-top">
                      <div className="drp-title-group">
                        <span className="drp-title font-mono font-bold">SPEED ESTIMATION</span>
                        <span className="badge badge-warning badge-sm">DERIVED FROM VIBRATION 1X • EXPERIMENTAL</span>
                        <span className="badge badge-neutral badge-sm">NOT A PHYSICAL SENSOR</span>
                      </div>
                      <div className="drp-formula font-mono text-xs text-muted">
                        METHOD: RPM = f_1X × 60
                      </div>
                    </div>
                    <div className="drp-content">
                      {analysisResult.estimatedRPM?.isReliable ? (
                        <div className="drp-valid-box">
                          <div className="drp-reading">
                            <span className="drp-val font-mono font-bold text-amber">{analysisResult.estimatedRPM.estimatedRPM}</span>
                            <span className="drp-unit font-mono">RPM</span>
                          </div>
                          <div className="drp-meta font-mono text-xs">
                            <div>• 1X Frequency: <strong>{analysisResult.estimatedRPM.frequency1X} Hz</strong> (Amplitude: {analysisResult.estimatedRPM.amplitude1X} mm/s)</div>
                            <div>• Detection Confidence: <strong>{analysisResult.estimatedRPM.confidence}%</strong> (Evaluated via rotational band prominence & harmonic check)</div>
                            <div>• Note: <strong>{analysisResult.estimatedRPM.reason}</strong></div>
                          </div>
                        </div>
                      ) : (
                        <div className="drp-invalid-box">
                          <div className="drp-reading">
                            <span className="drp-val font-mono font-bold text-muted">Not available</span>
                          </div>
                          <div className="drp-meta font-mono text-xs text-red">
                            Reason: {analysisResult.estimatedRPM?.reason || 'Reliable 1X running frequency could not be identified.'}
                          </div>
                          <div className="drp-subtext font-mono text-xs text-muted">
                            The system does NOT assume the largest FFT peak is the rotational speed and does NOT fabricate RPM values.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="channel-unavailable-notice font-mono">
                  Vibration channel was not mapped in this dataset. Waveforms and FFT unavailable.
                </div>
              )}
            </div>
          </div>

          {/* Current, Voltage & Temperature Sections (Requirements 14, 15, 16, 18) */}
          <div className="channels-trio-grid">
            {/* 3. Current Analysis */}
            <div className="eng-card">
              <div className="eng-card-header">
                <span className="eng-card-title">
                  <Zap size={13} className="text-blue" />
                  <span>3. CURRENT ANALYSIS</span>
                </span>
                <span className="font-mono text-xs">{analysisResult.mapping.current || 'N/A'}</span>
              </div>
              <div className="eng-card-body">
                {analysisResult.currentAnalysis ? (
                  <>
                    <div className="mini-stats-grid font-mono">
                      <div className="mini-stat">
                        <span className="ms-lbl">RMS CURRENT</span>
                        <span className="ms-val font-bold">{analysisResult.currentAnalysis.rms} A</span>
                      </div>
                      <div className="mini-stat">
                        <span className="ms-lbl">PEAK CURRENT</span>
                        <span className="ms-val">{analysisResult.currentAnalysis.max} A</span>
                      </div>
                      <div className="mini-stat">
                        <span className="ms-lbl">MEAN</span>
                        <span className="ms-val">{analysisResult.currentAnalysis.mean} A</span>
                      </div>
                    </div>
                    <div className="channel-graph-box">
                      <div className="channel-graph-title font-mono">CURRENT VS TIME (ACTUAL UPLOADED DATA)</div>
                      <TimeSeriesChart data={analysisResult.currentWaveform} unit="A" color="#0284c7" />
                    </div>
                  </>
                ) : (
                  <div className="channel-unavailable-notice font-mono">Current channel not mapped in dataset</div>
                )}
              </div>
            </div>

            {/* 4. Voltage Analysis */}
            <div className="eng-card">
              <div className="eng-card-header">
                <span className="eng-card-title">
                  <Zap size={13} className="text-blue" />
                  <span>4. VOLTAGE ANALYSIS</span>
                </span>
                <span className="font-mono text-xs">{analysisResult.mapping.voltage || 'N/A'}</span>
              </div>
              <div className="eng-card-body">
                {analysisResult.voltageAnalysis ? (
                  <>
                    <div className="mini-stats-grid font-mono">
                      <div className="mini-stat">
                        <span className="ms-lbl">RMS VOLTAGE</span>
                        <span className="ms-val font-bold">{analysisResult.voltageAnalysis.rms} V</span>
                      </div>
                      <div className="mini-stat">
                        <span className="ms-lbl">PEAK VOLTAGE</span>
                        <span className="ms-val">{analysisResult.voltageAnalysis.max} V</span>
                      </div>
                      <div className="mini-stat">
                        <span className="ms-lbl">MEAN</span>
                        <span className="ms-val">{analysisResult.voltageAnalysis.mean} V</span>
                      </div>
                    </div>
                    <div className="channel-graph-box">
                      <div className="channel-graph-title font-mono">VOLTAGE VS TIME (ACTUAL UPLOADED DATA)</div>
                      <TimeSeriesChart data={analysisResult.voltageWaveform} unit="V" color="#7c3aed" />
                    </div>
                  </>
                ) : (
                  <div className="channel-unavailable-notice font-mono">Voltage channel not mapped in dataset</div>
                )}
              </div>
            </div>

            {/* 5. Temperature Analysis */}
            <div className="eng-card">
              <div className="eng-card-header">
                <span className="eng-card-title">
                  <Thermometer size={13} className="text-blue" />
                  <span>5. TEMPERATURE ANALYSIS</span>
                </span>
                <span className="font-mono text-xs">{analysisResult.mapping.temperature || 'N/A'}</span>
              </div>
              <div className="eng-card-body">
                {analysisResult.temperatureAnalysis ? (
                  <>
                    <div className="mini-stats-grid font-mono">
                      <div className="mini-stat">
                        <span className="ms-lbl">MEAN TEMP</span>
                        <span className="ms-val font-bold">{analysisResult.temperatureAnalysis.mean} °C</span>
                      </div>
                      <div className="mini-stat">
                        <span className="ms-lbl">MAX TEMP</span>
                        <span className="ms-val">{analysisResult.temperatureAnalysis.max} °C</span>
                      </div>
                      <div className="mini-stat">
                        <span className="ms-lbl">MIN TEMP</span>
                        <span className="ms-val">{analysisResult.temperatureAnalysis.min} °C</span>
                      </div>
                      <div className="mini-stat">
                        <span className="ms-lbl">THERMAL RISE (ΔT)</span>
                        <span className="ms-val font-bold text-amber">
                          {analysisResult.temperatureAnalysis.rise !== undefined ? `${analysisResult.temperatureAnalysis.rise > 0 ? '+' : ''}${analysisResult.temperatureAnalysis.rise} °C` : '—'}
                        </span>
                      </div>
                    </div>
                    <div className="channel-graph-box">
                      <div className="channel-graph-title font-mono">TEMPERATURE VS TIME (ACTUAL UPLOADED DATA)</div>
                      <TimeSeriesChart data={analysisResult.temperatureWaveform} unit="°C" color="#ea580c" />
                    </div>
                  </>
                ) : (
                  <div className="channel-unavailable-notice font-mono">Temperature channel not mapped in dataset</div>
                )}
              </div>
            </div>
          </div>

          {/* Academic Integrity / Phase Notice */}
          <div className="diagnostic-engine-notice-banner mt-12">
            <Info size={16} className="text-blue flex-shrink-0" />
            <div className="notice-text">
              <strong>Phase 3 Scope Notice:</strong> Waveforms, statistical metrics, FFT decomposition, and 1X rotational speed above are computed directly from the uploaded dataset using the unified signal-processing engine. Machine learning classification models and automated fault diagnostics belong to subsequent project phases.
            </div>
          </div>
        </div>
      )}

      <style>{`
        .source-tag {
          font-size: 10px;
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
        }

        .stepper-card {
          margin-bottom: 16px;
        }

        .offline-pipeline-steps {
          display: flex;
          align-items: center;
          justify-content: space-between;
          overflow-x: auto;
          gap: 6px;
          padding: 4px 0;
        }

        .pipeline-step-mini {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 6px;
          border-radius: 2px;
          background: var(--bg-card-subtle);
          border: 1px solid var(--border-subtle);
          white-space: nowrap;
        }

        .pipeline-step-mini.active {
          border-color: var(--primary-blue);
          background: #eff6ff;
        }

        .pipeline-step-mini.completed {
          border-color: #bbf7d0;
          background: #f0fdf4;
        }

        .step-circle-mini {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8.5px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .pipeline-step-mini.active .step-circle-mini {
          background: var(--primary-blue);
          color: #ffffff;
          border-color: var(--primary-blue);
        }

        .pipeline-step-mini.completed .step-circle-mini {
          background: #16a34a;
          color: #ffffff;
          border-color: #16a34a;
        }

        .step-label-mini {
          font-size: 9px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .pipeline-step-mini.active .step-label-mini {
          color: var(--primary-blue);
          font-weight: 700;
        }

        .upload-container-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
        }

        .dropzone-box {
          border: 2px dashed #cbd5e1;
          border-radius: var(--radius-sm);
          padding: 32px 20px;
          text-align: center;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dropzone-box:hover, .dropzone-box.dragging {
          border-color: var(--primary-blue);
          background: #eff6ff;
        }

        .dropzone-icon {
          display: flex;
          justify-content: center;
          margin-bottom: 8px;
        }

        .dropzone-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: 0.5px;
        }

        .dropzone-subtitle {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .dropzone-meta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 12px;
        }

        .dropzone-browse-btn {
          margin-top: 14px;
        }

        .sample-files-box {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid var(--border-subtle);
        }

        .sample-files-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .sample-buttons-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .saved-records-list {
          display: flex;
          flex-direction: column;
          max-height: 400px;
          overflow-y: auto;
        }

        .saved-record-item {
          padding: 10px 12px;
          border-bottom: 1px solid var(--border-subtle);
          font-size: 11px;
        }

        .saved-record-item:last-child {
          border-bottom: none;
        }

        .record-top {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
        }

        .record-name {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-main);
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .record-meta {
          margin-top: 2px;
        }

        .record-label-tag {
          margin-top: 2px;
          color: #d97706;
        }

        .record-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 6px;
        }

        .record-channels {
          font-size: 9px;
          color: var(--text-muted);
          max-width: 170px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Validation checklist */
        .validation-checklist-card {
          border-left: 3px solid var(--primary-blue);
        }

        .validation-checks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 8px;
        }

        .val-check-item {
          background: #f8fafc;
          border: 1px solid var(--border-subtle);
          padding: 8px 10px;
          border-radius: var(--radius-sm);
        }

        .val-check-item.status-pass {
          border-color: #bbf7d0;
          background: #f0fdf4;
        }

        .val-check-item.status-warn {
          border-color: #fde68a;
          background: #fffbeb;
        }

        .val-check-item.status-fail {
          border-color: #fecaca;
          background: #fef2f2;
        }

        .val-check-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
        }

        .val-check-name {
          flex: 1;
          color: var(--text-main);
        }

        .val-check-pill {
          font-size: 8.5px;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 2px;
        }

        .pill-pass { background: #bbf7d0; color: #166534; }
        .pill-warn { background: #fde68a; color: #92400e; }
        .pill-fail { background: #fecaca; color: #991b1b; }
        .pill-info { background: #e0f2fe; color: #0369a1; }

        .val-check-msg {
          margin-top: 4px;
          color: var(--text-muted);
          padding-left: 19px;
        }

        .val-metrics-bar {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          padding-top: 10px;
          margin-top: 10px;
          border-top: 1px solid var(--border-subtle);
          color: var(--text-muted);
        }

        /* Config Grid */
        .config-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .rule-box {
          background: #f8fafc;
          border: 1px solid var(--border-subtle);
          padding: 10px 12px;
          border-radius: var(--radius-sm);
        }

        /* Raw Preview Table */
        .preview-action-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          background: #f8fafc;
          border-top: 1px solid var(--border-subtle);
        }

        .test-btn-large {
          padding: 8px 18px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        /* Results Views */
        .results-header-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          margin-bottom: 12px;
        }

        .results-header-right {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .results-title {
          font-size: 14px;
          color: var(--text-main);
        }

        .results-file {
          font-size: 11px;
          margin-top: 2px;
        }

        .reference-dataset-label-card {
          background: #fffbeb;
          border: 1px solid #fde68a;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          margin-bottom: 12px;
        }

        .ref-label-badge {
          font-size: 12px;
          color: #92400e;
        }

        .ref-label-disclaimer {
          color: #78350f;
          margin-top: 2px;
        }

        .save-toast-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: var(--radius-sm);
          font-size: 11px;
          color: #166534;
          margin-bottom: 12px;
        }

        .results-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
        }

        .summary-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sum-label {
          font-size: 9.5px;
          color: var(--text-muted);
        }

        .sum-val {
          font-size: 12px;
          color: var(--text-main);
        }

        .analysis-charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }

        .vib-box {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 8px;
          background: #ffffff;
        }

        .vib-box-header {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .canvas-wrapper {
          width: 100%;
          background: #ffffff;
          border: 1px solid #f1f5f9;
        }

        .result-canvas {
          width: 100%;
          height: auto;
          display: block;
        }

        .features-readout-bar {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(115px, 1fr));
          gap: 8px;
          background: #f8fafc;
          border: 1px solid var(--border-subtle);
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          margin-bottom: 10px;
        }

        .feat-block {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .feat-lbl {
          font-size: 8.5px;
          color: var(--text-muted);
        }

        .feat-num {
          font-size: 11px;
          color: var(--text-main);
        }

        .harmonics-readout-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 10px;
          background: #f8fafc;
          border: 1px solid var(--border-subtle);
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          margin-bottom: 10px;
        }

        .harmonics-pills-wrap {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .harmonic-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 6px;
          border-radius: 2px;
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          font-size: 9.5px;
        }

        .harmonic-pill.identified {
          border-color: #bfdbfe;
          background: #eff6ff;
        }

        /* Derived RPM Callout */
        .derived-rpm-callout-card {
          border: 1px solid #fde68a;
          background: #fffbeb;
          border-radius: var(--radius-sm);
          padding: 10px 12px;
        }

        .drp-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .drp-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .drp-title {
          font-size: 11px;
          color: #92400e;
        }

        .drp-valid-box {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .drp-reading {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .drp-val {
          font-size: 24px;
          line-height: 1;
        }

        .drp-unit {
          font-size: 12px;
          font-weight: 700;
          color: #92400e;
        }

        .drp-meta {
          color: #78350f;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .drp-invalid-box {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        /* Trio Grid */
        .channels-trio-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 12px;
        }

        .mini-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
          gap: 6px;
          margin-bottom: 8px;
        }

        .mini-stat {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .ms-lbl {
          font-size: 8px;
          color: var(--text-muted);
        }

        .ms-val {
          font-size: 11px;
          color: var(--text-main);
        }

        .channel-graph-box {
          border-top: 1px solid var(--border-subtle);
          padding-top: 6px;
        }

        .channel-graph-title {
          font-size: 8.5px;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .mini-chart-wrapper {
          width: 100%;
        }

        .mini-timeseries-svg {
          width: 100%;
          height: 70px;
          background: #ffffff;
          border: 1px solid #f1f5f9;
        }

        .mini-chart-axis-labels {
          display: flex;
          justify-content: space-between;
          font-size: 8.5px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .diagnostic-engine-notice-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid var(--border-subtle);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          color: var(--text-muted);
        }

        .channel-unavailable-notice {
          padding: 24px;
          text-align: center;
          font-size: 11px;
          color: var(--text-muted);
        }

        .upload-error-banner {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          font-size: 11px;
          margin-top: 10px;
          border-radius: var(--radius-sm);
        }
      `}</style>
    </div>
  );
};
