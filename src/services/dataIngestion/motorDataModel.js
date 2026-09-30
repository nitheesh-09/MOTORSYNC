/**
 * COMMON MOTOR DATA MODEL & FEATURE SCHEMA
 * MOTORSYNC — Motor Health Monitoring and Fault Diagnosis System
 * 
 * SYSTEM ARCHITECTURE:
 * Physical Motor → Sensors → External Data Acquisition Laptop
 *   ↓ (Signal Processing + Feature Extraction on External Laptop)
 * Motor Data Payload
 *   ↓ (Network / API / Data Receiver)
 * MOTORSYNC Central Monitoring Platform
 *   ↓
 * Storage → Monitoring Dashboard → Diagnostics / Analysis / History
 * 
 * MOTORSYNC is the central receiver and monitoring platform, NOT directly
 * wired to microcontroller hardware pins.
 */

export const DATA_SOURCE_TYPES = {
  SYNTHETIC: 'SYNTHETIC',
  ESP32: 'ESP32',
  EXTERNAL_LAPTOP: 'EXTERNAL_LAPTOP',
  OFFLINE_FILE: 'OFFLINE_FILE',
  EDGE_GATEWAY: 'EDGE_GATEWAY'
};

export const FEATURE_PROVENANCE = {
  PHYSICAL_MEASUREMENT: 'Physical Transducer Measurement',
  ESP32_HARDWARE: 'ESP32 Real Hardware Ingestion',
  EXTERNAL_ACQUISITION: 'External Data Acquisition Processing',
  MOTORSYNC_CALCULATED: 'MOTORSYNC Analysis Platform',
  SYNTHETIC_SIMULATION: 'Synthetic Test Simulation'
};

/**
 * Creates a normalized Common Motor Data Model instance.
 * Schema is extensible and decoupled from UI components.
 */
export function createMotorPayload(input = {}) {
  const motorId = input.motorId || 'MTR-001';
  const timestamp = input.timestamp || new Date().toISOString();
  const sourceType = input.sourceType || DATA_SOURCE_TYPES.ESP32;
  const sourceName = input.sourceName || (
    sourceType === DATA_SOURCE_TYPES.ESP32
      ? 'ESP32 Hardware [Real Raw Sensor Ingestion]'
      : sourceType === DATA_SOURCE_TYPES.EXTERNAL_LAPTOP 
      ? 'External Data Acquisition Laptop [Station-Alpha]'
      : 'Synthetic Simulation Harness'
  );

  // 1. Raw Physical Sensor Measurements (4 Transducers)
  const measurements = {
    vibration: input.measurements?.vibration ?? input.vibration ?? null,
    current: input.measurements?.current ?? input.current ?? null,
    voltage: input.measurements?.voltage ?? input.voltage ?? null,
    temperature: input.measurements?.temperature ?? input.temperature ?? null
  };

  // 2. Electrical Features (Extracted by External Acquisition Laptop)
  const electrical = {
    voltageRms: input.electrical?.voltageRms ?? (measurements.voltage !== null ? measurements.voltage : null),
    currentRms: input.electrical?.currentRms ?? (measurements.current !== null ? measurements.current : null),
    currentStdDev: input.electrical?.currentStdDev ?? null,
    currentPeak: input.electrical?.currentPeak ?? (measurements.current !== null ? +(measurements.current * 1.414).toFixed(2) : null),
    currentPeakToPeak: input.electrical?.currentPeakToPeak ?? (measurements.current !== null ? +(measurements.current * 2.828).toFixed(2) : null),
    power: input.electrical?.power ?? (
      (measurements.voltage !== null && measurements.current !== null)
        ? +((measurements.voltage * measurements.current * Math.sqrt(3) * 0.88) / 1000).toFixed(2) // 3-phase real power kW
        : null
    ),
    currentSpectralFeatures: input.electrical?.currentSpectralFeatures || {
      fundamentalFrequency: 50.0,
      thd: 2.1,
      phaseUnbalance: 1.2
    }
  };

  // 3. Thermal Features (Extracted by External Acquisition Laptop)
  const thermal = {
    temperature: input.thermal?.temperature ?? measurements.temperature,
    temperatureRiseFromBaseline: input.thermal?.temperatureRiseFromBaseline ?? (
      measurements.temperature !== null ? +(measurements.temperature - 38.0).toFixed(1) : null
    ),
    temperatureRiseRate: input.thermal?.temperatureRiseRate ?? 0.04, // °C / min
    temperatureVariation: input.thermal?.temperatureVariation ?? 0.35 // standard deviation °C
  };

  // 4. Vibration Features (Extracted by External Acquisition Laptop)
  const vibMag = measurements.vibration ?? 2.1;
  const vibration = {
    magnitude: input.vibration?.magnitude ?? vibMag,
    rms: input.vibration?.rms ?? vibMag,
    peak: input.vibration?.peak ?? +(vibMag * 2.12).toFixed(2),
    peakToPeak: input.vibration?.peakToPeak ?? +(vibMag * 4.24).toFixed(2),
    variance: input.vibration?.variance ?? +(vibMag * vibMag * 0.15).toFixed(3),
    standardDeviation: input.vibration?.standardDeviation ?? +(vibMag * 0.38).toFixed(3),
    kurtosis: input.vibration?.kurtosis ?? 3.12,
    skewness: input.vibration?.skewness ?? 0.14,
    crestFactor: input.vibration?.crestFactor ?? 2.12,
    dominantFrequency: input.vibration?.dominantFrequency ?? 25.0,
    spectralEnergy: input.vibration?.spectralEnergy ?? +(vibMag * 14.2).toFixed(1),
    spectralEntropy: input.vibration?.spectralEntropy ?? 0.72,
    frequencyBandEnergy: input.vibration?.frequencyBandEnergy || {
      lowBand: +(vibMag * 0.65).toFixed(2),    // 0 - 100 Hz (Sub-synchronous & 1X - 3X)
      mediumBand: +(vibMag * 0.25).toFixed(2), // 100 - 1000 Hz (Bearing BPFO/BPFI)
      highBand: +(vibMag * 0.10).toFixed(2)    // > 1000 Hz (Gear mesh & structural resonance)
    },
    harmonics: input.vibration?.harmonics || [
      { order: '1X', frequency: 25.0, amplitude: +(vibMag * 0.85).toFixed(2) },
      { order: '2X', frequency: 50.0, amplitude: +(vibMag * 0.25).toFixed(2) },
      { order: '3X', frequency: 75.0, amplitude: +(vibMag * 0.08).toFixed(2) }
    ]
  };

  // 5. Rotational Speed (Derived / Extracted - NOT a Physical Sensor)
  const rpm = input.rpm !== undefined ? input.rpm : (
    vibration.dominantFrequency ? Math.round(vibration.dominantFrequency * 60) : null
  );

  // 6. Optional Raw Waveforms (when transmitted by external laptop)
  const raw = input.raw || {
    vibrationWaveform: null,
    fftSpectrum: null,
    currentWaveform: null,
    voltageWaveform: null,
    temperatureWaveform: null,
    samplingRate: null
  };

  // 7. Feature Provenance Tracking
  const provenance = {
    voltage: FEATURE_PROVENANCE.PHYSICAL_MEASUREMENT,
    current: FEATURE_PROVENANCE.PHYSICAL_MEASUREMENT,
    temperature: FEATURE_PROVENANCE.PHYSICAL_MEASUREMENT,
    vibration: FEATURE_PROVENANCE.PHYSICAL_MEASUREMENT,
    voltageRms: sourceType === DATA_SOURCE_TYPES.SYNTHETIC ? FEATURE_PROVENANCE.SYNTHETIC_SIMULATION : FEATURE_PROVENANCE.EXTERNAL_ACQUISITION,
    currentRms: sourceType === DATA_SOURCE_TYPES.SYNTHETIC ? FEATURE_PROVENANCE.SYNTHETIC_SIMULATION : FEATURE_PROVENANCE.EXTERNAL_ACQUISITION,
    power: sourceType === DATA_SOURCE_TYPES.SYNTHETIC ? FEATURE_PROVENANCE.SYNTHETIC_SIMULATION : FEATURE_PROVENANCE.EXTERNAL_ACQUISITION,
    temperatureRise: sourceType === DATA_SOURCE_TYPES.SYNTHETIC ? FEATURE_PROVENANCE.SYNTHETIC_SIMULATION : FEATURE_PROVENANCE.EXTERNAL_ACQUISITION,
    vibrationRms: sourceType === DATA_SOURCE_TYPES.SYNTHETIC ? FEATURE_PROVENANCE.SYNTHETIC_SIMULATION : FEATURE_PROVENANCE.EXTERNAL_ACQUISITION,
    crestFactor: sourceType === DATA_SOURCE_TYPES.SYNTHETIC ? FEATURE_PROVENANCE.SYNTHETIC_SIMULATION : FEATURE_PROVENANCE.EXTERNAL_ACQUISITION,
    kurtosis: sourceType === DATA_SOURCE_TYPES.SYNTHETIC ? FEATURE_PROVENANCE.SYNTHETIC_SIMULATION : FEATURE_PROVENANCE.EXTERNAL_ACQUISITION,
    dominantFrequency: sourceType === DATA_SOURCE_TYPES.SYNTHETIC ? FEATURE_PROVENANCE.SYNTHETIC_SIMULATION : FEATURE_PROVENANCE.EXTERNAL_ACQUISITION,
    rpm: sourceType === DATA_SOURCE_TYPES.SYNTHETIC ? FEATURE_PROVENANCE.SYNTHETIC_SIMULATION : FEATURE_PROVENANCE.EXTERNAL_ACQUISITION
  };

  return {
    motorId,
    timestamp,
    sourceType,
    sourceName,
    measurements,
    electrical,
    thermal,
    vibration,
    rpm,
    rpmMethod: input.rpmMethod || (rpm ? '1X Rotational Peak × 60 (Supplied by External Acquisition)' : null),
    rpmReliable: input.rpmReliable !== undefined ? input.rpmReliable : (rpm !== null),
    raw,
    provenance
  };
}
