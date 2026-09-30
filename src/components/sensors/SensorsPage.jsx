import React from 'react';
import { 
  Radio, 
  Zap, 
  Thermometer, 
  RotateCw,
  Info,
  Layers,
  Cpu
} from 'lucide-react';
import { Badge } from '../common/Badge';

export const SensorsPage = ({ snapshot, searchTerm = '' }) => {
  const history = snapshot?.history || [];
  const latest = history[history.length - 1] || {};
  const metrics = snapshot?.metrics || {};
  const selectedMotor = snapshot?.selectedMotor || {
    motorId: 'MTR-001',
    name: 'Motor MTR-001',
    shortName: 'MTR-001',
    location: 'Physical Hardware Testbed',
    type: '3-Phase Induction Motor',
    ratedRPM: 1500
  };

  const hasReal = snapshot?.hasRealTelemetry !== false && latest.vibration !== undefined;
  const lastTs = metrics.latestTimestamp || (latest.timestamp ? new Date(latest.timestamp).toLocaleTimeString() : '—');

  // 6 Physical Hardware Sensors from ESP32 + 1 Calculated Magnitude (Task 6)
  const physicalSensors = [
    {
      id: 'sens-vol-01',
      name: 'VOLTAGE SENSOR (AC / PT MODULE)',
      category: 'VOLTAGE',
      icon: Zap,
      color: '#7c3aed',
      status: hasReal && latest.voltage != null ? 'ONLINE' : 'WAITING FOR REAL DATA',
      isPrimary: false,
      value: hasReal && latest.voltage != null ? `${latest.voltage}` : '--',
      unit: 'V',
      peakValue: hasReal && latest.voltage != null ? `Voltage: ${latest.voltage} V` : 'No data',
      dataKey: 'voltage',
      hardwareModel: 'ESP32 PT / Potential Transformer Module',
      samplingRate: 'ESP32 Hardware Stream',
      bandwidth: 'DC – 1 kHz',
      bus: 'ESP32 Hardware Pin Ingestion',
      calibrationDate: '2026-09-30',
      sensitivity: 'Calibrated',
      noiseFloor: '0.05 V',
      dataSource: hasReal && latest.voltage != null ? 'ESP32 Real Hardware Telemetry' : 'WAITING FOR REAL MOTOR DATA',
      lastUpdate: lastTs,
      notes: 'Monitors real voltage input directly from ESP32 sensor payload.'
    },
    {
      id: 'sens-cur-01',
      name: 'CURRENT SENSOR (HALL EFFECT CT)',
      category: 'CURRENT',
      icon: Zap,
      color: '#0891b2',
      status: hasReal && latest.current != null ? 'ONLINE' : 'WAITING FOR REAL DATA',
      isPrimary: false,
      value: hasReal && latest.current != null ? `${latest.current}` : '--',
      unit: 'A',
      peakValue: hasReal && latest.current != null ? `Current: ${latest.current} A` : 'No data',
      dataKey: 'current',
      hardwareModel: 'ESP32 Current Transducer CT',
      samplingRate: 'ESP32 Hardware Stream',
      bandwidth: 'DC – 200 kHz',
      bus: 'ESP32 Hardware Pin Ingestion',
      calibrationDate: '2026-09-30',
      sensitivity: 'Calibrated',
      noiseFloor: '0.01 A',
      dataSource: hasReal && latest.current != null ? 'ESP32 Real Hardware Telemetry' : 'WAITING FOR REAL MOTOR DATA',
      lastUpdate: lastTs,
      notes: 'Captures real motor load current streamed from the physical ESP32.'
    },
    {
      id: 'sens-tmp-01',
      name: 'TEMPERATURE SENSOR (PT100 RTD / PROBE)',
      category: 'TEMPERATURE',
      icon: Thermometer,
      color: '#ea580c',
      status: hasReal && latest.temperature != null ? 'ONLINE' : 'WAITING FOR REAL DATA',
      isPrimary: false,
      value: hasReal && latest.temperature != null ? `${latest.temperature}` : '--',
      unit: '°C',
      peakValue: hasReal && latest.temperature != null ? `Temperature: ${latest.temperature} °C` : 'No data',
      dataKey: 'temperature',
      hardwareModel: 'ESP32 Thermal Transducer / Probe',
      samplingRate: 'ESP32 Hardware Stream',
      bandwidth: '-50 °C to +200 °C',
      bus: 'ESP32 Hardware Pin Ingestion',
      calibrationDate: '2026-09-30',
      sensitivity: 'Calibrated',
      noiseFloor: '0.05 °C',
      dataSource: hasReal && latest.temperature != null ? 'ESP32 Real Hardware Telemetry' : 'WAITING FOR REAL MOTOR DATA',
      lastUpdate: lastTs,
      notes: 'Monitors real surface temperature streamed directly from ESP32.'
    },
    {
      id: 'sens-vib-x',
      name: 'VIBRATION SENSOR — AXIS X',
      category: 'VIBRATION',
      icon: Radio,
      color: '#2563eb',
      status: hasReal && latest.vibrationX != null ? 'ONLINE' : 'WAITING FOR REAL DATA',
      isPrimary: true,
      value: hasReal && latest.vibrationX != null ? `${latest.vibrationX}` : '--',
      unit: 'mm/s',
      peakValue: hasReal && latest.vibrationX != null ? `Axis X (Raw): ${latest.vibrationX} mm/s` : 'No data',
      dataKey: 'vibrationX',
      hardwareModel: 'ESP32 Triaxial Accelerometer (Axis X)',
      samplingRate: 'ESP32 Raw Stream (2560 Hz)',
      bandwidth: '0.5 Hz – 1280 Hz',
      bus: 'ESP32 I2C / SPI Accelerometer',
      calibrationDate: '2026-09-30',
      sensitivity: '100 mV/g',
      noiseFloor: '0.02 mm/s',
      dataSource: hasReal && latest.vibrationX != null ? 'ESP32 Real Hardware Telemetry' : 'WAITING FOR REAL MOTOR DATA',
      lastUpdate: lastTs,
      notes: 'Preserves raw X-axis acceleration reading from physical ESP32.'
    },
    {
      id: 'sens-vib-y',
      name: 'VIBRATION SENSOR — AXIS Y',
      category: 'VIBRATION',
      icon: Radio,
      color: '#0284c7',
      status: hasReal && latest.vibrationY != null ? 'ONLINE' : 'WAITING FOR REAL DATA',
      isPrimary: true,
      value: hasReal && latest.vibrationY != null ? `${latest.vibrationY}` : '--',
      unit: 'mm/s',
      peakValue: hasReal && latest.vibrationY != null ? `Axis Y (Raw): ${latest.vibrationY} mm/s` : 'No data',
      dataKey: 'vibrationY',
      hardwareModel: 'ESP32 Triaxial Accelerometer (Axis Y)',
      samplingRate: 'ESP32 Raw Stream (2560 Hz)',
      bandwidth: '0.5 Hz – 1280 Hz',
      bus: 'ESP32 I2C / SPI Accelerometer',
      calibrationDate: '2026-09-30',
      sensitivity: '100 mV/g',
      noiseFloor: '0.02 mm/s',
      dataSource: hasReal && latest.vibrationY != null ? 'ESP32 Real Hardware Telemetry' : 'WAITING FOR REAL MOTOR DATA',
      lastUpdate: lastTs,
      notes: 'Preserves raw Y-axis acceleration reading from physical ESP32.'
    },
    {
      id: 'sens-vib-z',
      name: 'VIBRATION SENSOR — AXIS Z',
      category: 'VIBRATION',
      icon: Radio,
      color: '#1d4ed8',
      status: hasReal && latest.vibrationZ != null ? 'ONLINE' : 'WAITING FOR REAL DATA',
      isPrimary: true,
      value: hasReal && latest.vibrationZ != null ? `${latest.vibrationZ}` : '--',
      unit: 'mm/s',
      peakValue: hasReal && latest.vibrationZ != null ? `Axis Z (Raw): ${latest.vibrationZ} mm/s` : 'No data',
      dataKey: 'vibrationZ',
      hardwareModel: 'ESP32 Triaxial Accelerometer (Axis Z)',
      samplingRate: 'ESP32 Raw Stream (2560 Hz)',
      bandwidth: '0.5 Hz – 1280 Hz',
      bus: 'ESP32 I2C / SPI Accelerometer',
      calibrationDate: '2026-09-30',
      sensitivity: '100 mV/g',
      noiseFloor: '0.02 mm/s',
      dataSource: hasReal && latest.vibrationZ != null ? 'ESP32 Real Hardware Telemetry' : 'WAITING FOR REAL MOTOR DATA',
      lastUpdate: lastTs,
      notes: 'Preserves raw Z-axis acceleration reading from physical ESP32.'
    },
    {
      id: 'sens-vib-mag',
      name: 'VIBRATION MAGNITUDE (CALCULATED)',
      category: 'VIBRATION',
      icon: Radio,
      color: '#3b82f6',
      status: hasReal && latest.vibration != null ? 'ONLINE' : 'WAITING FOR REAL DATA',
      isPrimary: true,
      value: hasReal && latest.vibration != null ? `${latest.vibration}` : '--',
      unit: 'mm/s',
      peakValue: hasReal && latest.vibration != null ? `sqrt(X² + Y² + Z²): ${latest.vibration} mm/s` : 'No data',
      dataKey: 'vibration',
      hardwareModel: 'Calculated 3-Axis Vector Magnitude',
      samplingRate: 'Derived from 3-Axis Inputs',
      bandwidth: '0.5 Hz – 1280 Hz',
      bus: 'Derived from ESP32 Raw Transducers',
      calibrationDate: '2026-09-30',
      sensitivity: 'Derived',
      noiseFloor: '0.02 mm/s',
      dataSource: hasReal && latest.vibration != null ? 'Derived from Real ESP32 Raw Transducers' : 'NO RECENT ESP32 DATA',
      lastUpdate: lastTs,
      notes: 'Calculated vibration magnitude without overwriting raw individual axes.'
    }
  ];

  // Derived Parameters (Signal Processing, NOT hardware sensors)
  const derivedParameters = [
    {
      id: 'param-rpm-01',
      name: 'ESTIMATED RPM (ROTATIONAL SPEED)',
      category: 'DERIVED SPEED',
      icon: RotateCw,
      color: '#2563eb',
      status: metrics.rpmReliable ? 'CALCULATED' : 'UNAVAILABLE',
      value: metrics.rpmReliable ? `${metrics.estimatedRPM}` : 'Not available',
      unit: metrics.rpmReliable ? 'RPM' : '',
      peakValue: metrics.frequency1X ? `1X: ${metrics.frequency1X} Hz` : 'No 1X Peak',
      derivationMethod: 'Vibration FFT 1X Peak Tracking (RPM = f_1X × 60)',
      derivationSource: 'Calculated from Vibration Sensor Signal Processing',
      inputSignal: 'IEPE Accelerometer Time-Domain Stream (2560 Hz)',
      spectralSearchBand: '15.0 Hz – 55.0 Hz (Excludes 50 Hz Line Hum)',
      validationRule: 'Harmonic consistency check & 1X peak prominence threshold',
      statusText: metrics.rpmReliable ? 'Valid 1X peak detected' : 'Unable to identify reliable 1X component',
      notes: 'EXPERIMENTAL DERIVED PARAMETER: Not a physical sensor input. Calculated purely from vibration harmonic analysis. Displayed only when a sufficiently reliable 1X rotational frequency peak exists.'
    }
  ];

  const term = searchTerm.toLowerCase();
  const filteredPhysical = physicalSensors.filter(s => 
    s.name.toLowerCase().includes(term) || 
    s.category.toLowerCase().includes(term) ||
    s.hardwareModel.toLowerCase().includes(term)
  );

  const filteredDerived = derivedParameters.filter(p =>
    p.name.toLowerCase().includes(term) ||
    p.derivationMethod.toLowerCase().includes(term)
  );

  const renderSparkline = (dataKey, strokeColor) => {
    const pts = history.map(h => h[dataKey]).filter(v => v !== undefined);
    if (pts.length < 2) return null;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = (max - min) || 1;
    const w = 220;
    const h = 45;

    const coords = pts.map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((p - min) / range) * (h - 8) - 4;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coords}
        />
      </svg>
    );
  };

  return (
    <div className="sensors-page">
      {/* Title */}
      <div className="page-header-block">
        <div>
          <h1 className="page-title">ESP32 SENSOR TELEMETRY & HARDWARE CHANNELS</h1>
          <div className="page-subtitle">Real-time transducer readouts and signal features for physical motor MTR-001.</div>
        </div>
        <div className="source-tag font-mono">
          SOURCE: ESP32 REAL HARDWARE • 6 RAW CHANNELS + 1 MAGNITUDE
        </div>
      </div>

      {/* Selected Motor Context Header (Requirement 8) */}
      <div className="selected-motor-section-header mb-16">
        <div className="selected-motor-header-left">
          <div className="selected-motor-title-row">
            <Cpu size={15} className="text-blue" />
            <h2 className="selected-motor-title">
              HARDWARE TRANSDUCER ARRAY: <span className="text-blue">MTR-001</span>
            </h2>
            <Badge status={hasReal ? (metrics.status || 'HEALTHY') : 'NO DATA'} size="sm" />
          </div>
          <div className="selected-motor-meta-row font-mono">
            <span>MOTOR ID: <strong>MTR-001</strong></span>
            <span>•</span>
            <span>DATA SOURCE: <strong className="text-blue">ESP32 REAL HARDWARE</strong></span>
            <span>•</span>
            <span>LOCATION: <strong>Physical Hardware Testbed</strong></span>
            <span>•</span>
            <span>STATUS: <strong className={hasReal ? 'text-green' : 'text-danger'}>{hasReal ? 'ONLINE / STREAMING' : 'NO RECENT ESP32 DATA'}</strong></span>
          </div>
        </div>
        <div className="selected-motor-header-right">
          <span className="synthetic-badge-tag font-mono">
            TARGET MOTOR: MTR-001
          </span>
        </div>
      </div>

      {/* SECTION 1: PHYSICAL TRANSDUCERS (ESP32 HARDWARE STREAM) */}
      <div className="sensors-section-header">
        <div className="ssh-left">
          <Layers size={14} className="text-blue" />
          <span className="ssh-title">PHYSICAL TRANSDUCER MEASUREMENTS (ESP32 HARDWARE SENSORS)</span>
        </div>
        <div className="ssh-right font-mono">
          <span className="badge badge-healthy badge-sm">{hasReal ? '6 / 6 TRANSDUCERS ACTIVE' : 'AWAITING ESP32'}</span>
        </div>
      </div>

      <div className="sensor-telemetry-grid">
        {filteredPhysical.map((sensor) => {
          const Icon = sensor.icon;
          return (
            <div key={sensor.id} className={`eng-card sensor-detail-card ${sensor.isPrimary ? 'primary-card-highlight' : ''}`}>
              <div className="eng-card-header">
                <div className="sensor-card-title-group">
                  <div className="sensor-icon-box" style={{ color: sensor.color }}>
                    <Icon size={14} />
                  </div>
                  <span className="sensor-main-title font-mono">{sensor.name}</span>
                  {sensor.isPrimary && (
                    <span className="badge badge-info badge-sm">CORE DIAGNOSTIC SIGNAL</span>
                  )}
                  <span className="badge badge-muted badge-sm font-mono">PHYSICAL MEASUREMENT</span>
                </div>
                <div className="sensor-card-status">
                  <Badge status={sensor.status} size="sm" />
                </div>
              </div>

              <div className="eng-card-body">
                <div className="sensor-readout-row">
                  <div className="live-metric-box">
                    <span className="live-metric-label">CURRENT READING</span>
                    <div className="live-metric-val font-mono" style={{ color: sensor.color }}>
                      {sensor.value} <span className="live-metric-unit">{sensor.unit}</span>
                    </div>
                    <span className="live-metric-peak font-mono text-muted">{sensor.peakValue}</span>
                  </div>

                  <div className="sparkline-container">
                    <div className="sparkline-label font-mono">LIVE SPARKLINE (LAST 40S)</div>
                    {renderSparkline(sensor.dataKey, sensor.color)}
                  </div>
                </div>

                <div className="spec-table-container">
                  <table className="spec-table font-mono">
                    <tbody>
                      <tr>
                        <td className="spec-key">TRANSDUCER CLASSIFICATION</td>
                        <td className="spec-val font-bold text-blue">PHYSICAL SENSOR TRANSDUCER (SAMPLED BY EXTERNAL LAPTOP)</td>
                      </tr>
                      <tr>
                        <td className="spec-key">TRANSDUCER MODEL</td>
                        <td className="spec-val">{sensor.hardwareModel}</td>
                      </tr>
                      <tr>
                        <td className="spec-key">SAMPLING INFORMATION</td>
                        <td className="spec-val">{sensor.samplingRate}</td>
                      </tr>
                      <tr>
                        <td className="spec-key">DYNAMIC BANDWIDTH</td>
                        <td className="spec-val">{sensor.bandwidth}</td>
                      </tr>
                      <tr>
                        <td className="spec-key">EXTERNAL ACQUISITION BUS</td>
                        <td className="spec-val">{sensor.bus}</td>
                      </tr>
                      <tr>
                        <td className="spec-key">FEATURE PROVENANCE</td>
                        <td className="spec-val font-bold text-emerald">Physical Transducer Measurement (External DAQ Channel)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="sensor-footer-note">
                  <Info size={12} className="text-muted flex-shrink-0" />
                  <span>{sensor.notes}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 2: PROCESSED / EXTRACTED FEATURES FROM EXTERNAL LAPTOP (Req 2, 3) */}
      <div className="sensors-section-header mt-24">
        <div className="ssh-left">
          <Cpu size={14} className="text-blue" />
          <span className="ssh-title">PROCESSED & EXTRACTED FEATURES (SUPPLIED BY EXTERNAL ACQUISITION LAPTOP)</span>
        </div>
        <span className="badge badge-info badge-sm">EXTERNALLY EXTRACTED FEATURES</span>
      </div>

      <div className="features-tables-grid">
        {/* Electrical Features */}
        <div className="eng-card feature-category-card">
          <div className="eng-card-header">
            <span className="eng-card-title">
              <Zap size={13} className="text-amber" />
              <span>ELECTRICAL FEATURES</span>
            </span>
            <span className="badge badge-muted badge-sm font-mono">SOURCE: EXTERNAL DAQ</span>
          </div>
          <div className="eng-table-container">
            <table className="eng-table font-mono">
              <thead>
                <tr>
                  <th>FEATURE</th>
                  <th>VALUE</th>
                  <th>EXTRACTION METHOD</th>
                  <th>PROVENANCE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Voltage RMS</td>
                  <td className="font-bold text-blue">{snapshot?.electricalFeatures?.voltageRms != null ? `${snapshot.electricalFeatures.voltageRms} V` : (latest.voltage != null ? `${latest.voltage} V` : '—')}</td>
                  <td>RMS integration over AC cycle</td>
                  <td className="text-emerald">ESP32 Hardware Ingestion</td>
                </tr>
                <tr>
                  <td>Current RMS</td>
                  <td className="font-bold text-blue">{snapshot?.electricalFeatures?.currentRms != null ? `${snapshot.electricalFeatures.currentRms} A` : (latest.current != null ? `${latest.current} A` : '—')}</td>
                  <td>True RMS over AC cycle</td>
                  <td className="text-emerald">ESP32 Hardware Ingestion</td>
                </tr>
                <tr>
                  <td>Real Power (V × I)</td>
                  <td className="font-bold text-blue">{snapshot?.electricalFeatures?.power != null ? `${snapshot.electricalFeatures.power} kW` : (metrics.power != null ? `${metrics.power} kW` : '—')}</td>
                  <td>3-Phase Active Power (V × I × √3 × pf)</td>
                  <td className="text-emerald">ESP32 Hardware Ingestion</td>
                </tr>
                <tr>
                  <td>Current Peak / Peak-to-Peak</td>
                  <td>{snapshot?.electricalFeatures?.currentPeak != null ? `${snapshot.electricalFeatures.currentPeak} A / ${snapshot.electricalFeatures.currentPeakToPeak} A` : (metrics.current != null ? `${(metrics.current * 1.414).toFixed(2)} A / ${(metrics.current * 2.828).toFixed(2)} A` : '—')}</td>
                  <td>Extrema extraction on AC wave</td>
                  <td className="text-emerald">ESP32 Hardware Ingestion</td>
                </tr>
                <tr>
                  <td>Current THD / Harmonic Distortion</td>
                  <td>{snapshot?.electricalFeatures?.currentSpectralFeatures?.thd != null ? `${snapshot.electricalFeatures.currentSpectralFeatures.thd}%` : '—'}</td>
                  <td>FFT harmonic current distortion</td>
                  <td className="text-emerald">Signal Processing Platform</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Thermal Features */}
        <div className="eng-card feature-category-card">
          <div className="eng-card-header">
            <span className="eng-card-title">
              <Thermometer size={13} className="text-orange" />
              <span>THERMAL FEATURES</span>
            </span>
            <span className="badge badge-muted badge-sm font-mono">SOURCE: ESP32 HARDWARE</span>
          </div>
          <div className="eng-table-container">
            <table className="eng-table font-mono">
              <thead>
                <tr>
                  <th>FEATURE</th>
                  <th>VALUE</th>
                  <th>EXTRACTION METHOD</th>
                  <th>PROVENANCE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Core Temperature</td>
                  <td className="font-bold text-blue">{snapshot?.thermalFeatures?.temperature != null ? `${snapshot.thermalFeatures.temperature} °C` : (latest.temperature != null ? `${latest.temperature} °C` : '—')}</td>
                  <td>PT100 RTD resistance linearize</td>
                  <td className="text-emerald">ESP32 Hardware Ingestion</td>
                </tr>
                <tr>
                  <td>Temperature Rise (ΔT)</td>
                  <td className="font-bold text-blue">{snapshot?.thermalFeatures?.temperatureRiseFromBaseline != null ? `${snapshot.thermalFeatures.temperatureRiseFromBaseline} °C` : (metrics.tempRise != null ? `+${metrics.tempRise} °C` : 'BASELINE: INSUFFICIENT REAL DATA')}</td>
                  <td>{snapshot?.thermalFeatures?.temperatureRiseFromBaseline != null || metrics.tempRise != null ? 'Difference from nominal baseline' : 'BASELINE: INSUFFICIENT REAL DATA'}</td>
                  <td className="text-emerald">Baseline Comparison</td>
                </tr>
                <tr>
                  <td>Temperature Rise Rate</td>
                  <td>{snapshot?.thermalFeatures?.temperatureRiseRate != null ? `${snapshot.thermalFeatures.temperatureRiseRate} °C/min` : '—'}</td>
                  <td>dT/dt thermal slope window</td>
                  <td className="text-emerald">Feature Engine</td>
                </tr>
                <tr>
                  <td>Temperature Variation / StdDev</td>
                  <td>{snapshot?.thermalFeatures?.temperatureVariation != null ? `${snapshot.thermalFeatures.temperatureVariation} °C` : '—'}</td>
                  <td>Moving window thermal stability</td>
                  <td className="text-emerald">Feature Engine</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Vibration Features */}
        <div className="eng-card feature-category-card">
          <div className="eng-card-header">
            <span className="eng-card-title">
              <Radio size={13} className="text-blue" />
              <span>VIBRATION FEATURES</span>
            </span>
            <span className="badge badge-muted badge-sm font-mono">SOURCE: ESP32 HARDWARE</span>
          </div>
          <div className="eng-table-container">
            <table className="eng-table font-mono">
              <thead>
                <tr>
                  <th>FEATURE</th>
                  <th>VALUE</th>
                  <th>EXTRACTION METHOD</th>
                  <th>PROVENANCE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Vibration RMS & Peak</td>
                  <td className="font-bold text-blue">{snapshot?.vibrationFeatures?.rms != null ? `${snapshot.vibrationFeatures.rms} mm/s RMS (Peak: ${snapshot.vibrationFeatures.peak ?? '—'} mm/s)` : (latest.vibration != null ? `${latest.vibration} mm/s RMS` : '—')}</td>
                  <td>Time-domain statistical integration</td>
                  <td className="text-emerald">ESP32 Hardware Ingestion</td>
                </tr>
                <tr>
                  <td>Crest Factor</td>
                  <td>{snapshot?.vibrationFeatures?.crestFactor != null ? snapshot.vibrationFeatures.crestFactor : '—'}</td>
                  <td>Peak / RMS impact severity ratio</td>
                  <td className="text-emerald">Signal Processing Platform</td>
                </tr>
                <tr>
                  <td>Kurtosis & Skewness</td>
                  <td>Kurtosis: {snapshot?.vibrationFeatures?.kurtosis != null ? snapshot.vibrationFeatures.kurtosis : '—'} • Skewness: {snapshot?.vibrationFeatures?.skewness != null ? snapshot.vibrationFeatures.skewness : '—'}</td>
                  <td>4th and 3rd statistical moments</td>
                  <td className="text-emerald">Signal Processing Platform</td>
                </tr>
                <tr>
                  <td>Dominant Frequency</td>
                  <td className="font-bold text-blue">{snapshot?.vibrationFeatures?.dominantFrequency != null ? `${snapshot.vibrationFeatures.dominantFrequency} Hz` : (snapshot?.vibrationFeatures?.dominantFreq != null ? `${snapshot.vibrationFeatures.dominantFreq} Hz` : '—')}</td>
                  <td>Highest magnitude peak in FFT spectrum</td>
                  <td className="text-emerald">FFT Spectral Engine</td>
                </tr>
                <tr>
                  <td>Spectral Energy & Entropy</td>
                  <td>Energy: {snapshot?.vibrationFeatures?.spectralEnergy != null ? snapshot.vibrationFeatures.spectralEnergy : '—'} • Entropy: {snapshot?.vibrationFeatures?.spectralEntropy != null ? snapshot.vibrationFeatures.spectralEntropy : '—'}</td>
                  <td>FFT spectral distribution moments</td>
                  <td className="text-emerald">FFT Spectral Engine</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3: DERIVED SPEED PARAMETER (ROTATIONAL SPEED / ESTIMATED RPM) */}
      <div className="sensors-section-header mt-24">
        <div className="ssh-left">
          <RotateCw size={14} className="text-blue" />
          <span className="ssh-title">ROTATIONAL SPEED / RPM (DERIVED PARAMETER • NON-HARDWARE)</span>
        </div>
        <span className="badge badge-info badge-sm">DERIVED FROM VIBRATION</span>
      </div>

      <div className="derived-parameters-grid">
        {filteredDerived.map((param) => {
          const Icon = param.icon;
          return (
            <div key={param.id} className="eng-card derived-param-card">
              <div className="eng-card-header">
                <div className="sensor-card-title-group">
                  <div className="sensor-icon-box text-blue">
                    <Icon size={14} />
                  </div>
                  <span className="sensor-main-title font-mono">{param.name}</span>
                  <span className="badge badge-info badge-sm">DERIVED (NOT A PHYSICAL SENSOR)</span>
                </div>
                <div className="sensor-card-status">
                  <span className={`badge badge-${metrics.rpmReliable ? 'healthy' : 'muted'} badge-sm font-mono`}>
                    {metrics.rpmReliable ? 'VALIDATED' : 'UNAVAILABLE'}
                  </span>
                </div>
              </div>

              <div className="eng-card-body">
                <div className="derived-readout-row font-mono">
                  <div className="derived-metric-box">
                    <span className="live-metric-label">ESTIMATED RPM</span>
                    <div className="derived-val-big">
                      {metrics.rpmReliable ? (
                        <>
                          {metrics.estimatedRPM} <span className="derived-unit">RPM</span>
                        </>
                      ) : (
                        <span className="text-muted text-base">Not available</span>
                      )}
                    </div>
                    <span className="derived-peak text-muted">
                      {metrics.rpmReliable ? `1X: ${metrics.frequency1X} Hz` : 'No validated 1X peak'}
                    </span>
                  </div>

                  <div className="derived-summary-box">
                    <div className="dsb-label">DERIVATION FORMULA</div>
                    <div className="dsb-formula">RPM = f_1X × 60</div>
                    <div className="dsb-desc text-muted">
                      MOTORSYNC accepts external RPM if provided by DAQ, or derives RPM from verified 1X rotational frequency (f_1X × 60). Does not assume largest FFT peak is automatically 1X.
                    </div>
                  </div>
                </div>

                <div className="spec-table-container">
                  <table className="spec-table font-mono">
                    <tbody>
                      <tr>
                        <td className="spec-key">DERIVATION STATUS</td>
                        <td className="spec-val font-bold text-blue">
                          {metrics.rpmReliable ? `Estimated RPM: ${metrics.estimatedRPM} RPM (${metrics.frequency1X} Hz)` : 'Not available'}
                        </td>
                      </tr>
                      <tr>
                        <td className="spec-key">DERIVATION LOGIC</td>
                        <td className="spec-val">{param.derivationMethod}</td>
                      </tr>
                      <tr>
                        <td className="spec-key">HARDWARE SENSOR CLASSIFICATION</td>
                        <td className="spec-val text-red font-bold">NON-HARDWARE • NOT A PHYSICAL SENSOR INPUT</td>
                      </tr>
                      <tr>
                        <td className="spec-key">FEATURE PROVENANCE</td>
                        <td className="spec-val font-bold text-emerald">
                          {metrics.rpmReliable ? 'Derived from Vibration Signal Processing (RPM = f_1X * 60)' : 'Not available'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="sensor-footer-note derived-note">
                  <Info size={12} className="text-blue flex-shrink-0" />
                  <span>{param.notes}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .source-tag {
          font-size: 10px;
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
        }

        .sensors-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          margin-bottom: 12px;
        }

        .ssh-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ssh-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: 0.05em;
        }

        .mt-24 {
          margin-top: 24px;
        }

        .primary-card-highlight {
          border-color: #bfdbfe !important;
          background: #fafcff;
        }

        .features-tables-grid {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 16px;
        }

        .feature-category-card {
          margin-bottom: 0;
        }

        .text-orange {
          color: #ea580c;
        }

        .text-emerald {
          color: #059669;
        }

        .daq-note-pill {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          padding: 2px 7px;
          border-radius: 2px;
          font-size: 10px;
          font-weight: 700;
          margin-left: 8px;
        }

        .sensor-telemetry-grid, .derived-parameters-grid {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .derived-param-card {
          border: 1px dashed #93c5fd;
          background: #f8fafc;
        }

        .sensor-card-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sensor-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sensor-main-title {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: 0.03em;
        }

        .sensor-readout-row, .derived-readout-row {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 16px;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border-subtle);
        }

        @media (max-width: 768px) {
          .sensor-readout-row, .derived-readout-row {
            grid-template-columns: 1fr;
          }
        }

        .live-metric-box, .derived-metric-box {
          display: flex;
          flex-direction: column;
        }

        .live-metric-label {
          font-size: 9px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .live-metric-val {
          font-size: 22px;
          font-weight: 700;
          line-height: 1.1;
          margin: 2px 0;
        }

        .derived-val-big {
          font-size: 24px;
          font-weight: 700;
          color: var(--primary-blue);
          line-height: 1.1;
          margin: 2px 0;
        }

        .derived-unit {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .derived-peak {
          font-size: 11px;
        }

        .derived-summary-box {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: var(--radius-sm);
          padding: 8px 12px;
        }

        .dsb-label {
          font-size: 9px;
          font-weight: 700;
          color: var(--primary-blue);
          letter-spacing: 0.04em;
        }

        .dsb-formula {
          font-size: 14px;
          font-weight: 700;
          color: #1e3a8a;
          margin: 2px 0;
        }

        .dsb-desc {
          font-size: 10.5px;
          line-height: 1.35;
        }

        .sparkline-container {
          background: var(--bg-card-subtle);
          padding: 6px 12px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
        }

        .sparkline-label {
          font-size: 9px;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .spec-table-container {
          overflow-x: auto;
          margin-bottom: 10px;
        }

        .spec-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }

        .spec-key {
          padding: 4px 8px;
          background: var(--bg-card-subtle);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          width: 240px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .spec-val {
          padding: 4px 8px;
          border: 1px solid var(--border-subtle);
          color: var(--text-main);
        }

        .text-amber {
          color: #b45309;
        }

        .text-red {
          color: #b91c1c;
        }

        .sensor-footer-note {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-muted);
          background: #f8fafc;
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
        }

        .derived-note {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #1e40af;
        }

        .flex-shrink-0 {
          flex-shrink: 0;
        }

        .selected-motor-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f8fafc;
          border: 1px solid var(--border-subtle);
          border-left: 4px solid var(--primary-blue);
          border-radius: var(--radius-sm);
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

        .synthetic-badge-tag {
          font-size: 10px;
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
        }

        .mb-16 {
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  );
};
