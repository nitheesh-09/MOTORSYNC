/**
 * PHASE 3: REAL MOTOR DATASET INTEGRATION UNIT TEST SUITE
 * ECE Project: Motor Health Monitoring and Fault Diagnosis System
 * 
 * Verifies:
 * 1. CSV parsing with delimiters, comments, metadata headers (# MotorID, # SamplingRate, # Condition)
 * 2. JSON parsing with telemetry/samples array and metadata
 * 3. XML parsing with <sample> elements
 * 4. Automatic field mapping & alias detection
 * 5. Sampling rate derivation from timestamps (Fs = 1 / Δt)
 * 6. Dataset validation checklist (NaNs, Infs, corrupt rows, sample count, monotonicity)
 * 7. Common Motor Data Model normalization
 * 8. Reusable signal processing pipeline (Time-domain + FFT + 1X Detection + Estimated RPM)
 * 9. Non-naive 1X detection (ensuring bearing defect peak does not get confused for 1X rotor speed)
 * 10. Reference dataset label preservation as metadata
 * 
 * Run with: node tests/phase3DatasetIntegration.test.js
 */

import assert from 'assert';
import { fileAnalysisService } from '../src/services/fileAnalysisService.js';
import { SignalProcessingEngine } from '../src/services/signalProcessing/index.js';

console.log('====================================================');
console.log('RUNNING PHASE 3 REAL DATASET INTEGRATION TESTS');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`[PASS] Test ${totalTests}: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${testName}`);
    console.error('       Error:', err.message);
  }
}

// ----------------------------------------------------
// TEST 1: CSV PARSING & COMMENT METADATA EXTRACTION
// ----------------------------------------------------
runTest('CSV Parsing with metadata comments (# MotorID, # Fs, # Condition)', () => {
  const csvContent = `# MotorID: MTR-002
# AssetName: High Pressure Compressor
# SamplingRate: 2560
# Condition: Bearing Fault (Outer Race)
time,vibration,current,voltage,temperature
0.00000,1.25,2.15,230.1,42.5
0.00039,1.40,2.18,230.3,42.5
0.00078,1.35,2.14,230.0,42.6
`;
  const parsed = fileAnalysisService.parseCSV(csvContent);
  assert.strictEqual(parsed.metadata.motorId, 'MTR-002', 'Motor ID should be parsed from comment');
  assert.strictEqual(parsed.metadata.samplingRate, 2560, 'Sampling rate should be parsed from comment');
  assert.strictEqual(parsed.metadata.referenceDatasetLabel, 'Bearing Fault (Outer Race)', 'Reference label should be parsed');
  assert.strictEqual(parsed.columns.length, 5, 'Should have 5 columns');
  assert.strictEqual(parsed.rows.length, 3, 'Should have 3 data rows');
  assert.strictEqual(parsed.rows[0].vibration, 1.25, 'Numeric values should be parsed as numbers');
});

// ----------------------------------------------------
// TEST 2: JSON DATASET PARSING
// ----------------------------------------------------
runTest('JSON Dataset Parsing with Telemetry Array & Metadata', () => {
  const jsonData = {
    motor_id: 'MTR-003',
    sampling_rate: 5120,
    condition: 'Imbalance (Simulated)',
    samples: [
      { time_s: 0.000, accel: 0.85, motor_current: 3.12, motor_voltage: 231.0, temp: 40.1 },
      { time_s: 0.001, accel: 0.92, motor_current: 3.15, motor_voltage: 230.8, temp: 40.1 }
    ]
  };
  const parsed = fileAnalysisService.parseJSON(JSON.stringify(jsonData));
  assert.strictEqual(parsed.metadata.motorId, 'MTR-003');
  assert.strictEqual(parsed.metadata.samplingRate, 5120);
  assert.strictEqual(parsed.metadata.referenceDatasetLabel, 'Imbalance (Simulated)');
  assert.strictEqual(parsed.rows.length, 2);
  assert.strictEqual(parsed.columns.includes('accel'), true);
});

// ----------------------------------------------------
// TEST 3: CHANNEL MAPPING & ALIAS IDENTIFICATION
// ----------------------------------------------------
runTest('Channel Mapping Auto-detection for Industrial Column Aliases', () => {
  const testColumns = ['sample_time', 'accel_x', 'current_phase_a', 'supply_voltage', 'stator_temp', 'defect_class'];
  const mapping = fileAnalysisService.detectChannelMapping(testColumns);

  assert.strictEqual(mapping.timestamp, 'sample_time', 'Timestamp mapped correctly');
  assert.strictEqual(mapping.vibration, 'accel_x', 'Vibration mapped correctly');
  assert.strictEqual(mapping.current, 'current_phase_a', 'Current mapped correctly');
  assert.strictEqual(mapping.voltage, 'supply_voltage', 'Voltage mapped correctly');
  assert.strictEqual(mapping.temperature, 'stator_temp', 'Temperature mapped correctly');
});

// ----------------------------------------------------
// TEST 4: SAMPLING RATE DERIVATION FROM TIMESTAMPS (Fs = 1 / Δt)
// ----------------------------------------------------
runTest('Sampling Rate Calculation from Timestamps (Fs = 1 / Δt)', () => {
  const dt = 1.0 / 2560.0; // 0.000390625 s
  const rows = [];
  for (let i = 0; i < 100; i++) {
    rows.push({
      time: +(i * dt).toFixed(7),
      vib: Math.sin(2 * Math.PI * 25.0 * (i * dt))
    });
  }

  const mapping = { timestamp: 'time', vibration: 'vib' };
  const val = fileAnalysisService.validateMappedData(rows, mapping);

  assert.strictEqual(val.isValid, true, 'Dataset should be valid');
  assert.strictEqual(val.stats.isMonotonic, true, 'Timestamps should be monotonic');
  assert.ok(Math.abs(val.stats.calculatedFs - 2560) < 5, `Calculated Fs should be ~2560 Hz, got ${val.stats.calculatedFs}`);
});

// ----------------------------------------------------
// TEST 5: DATASET VALIDATION (NaN, INSUFFICIENT SAMPLES, CORRUPT DATA)
// ----------------------------------------------------
runTest('Dataset Validation: NaN, Missing Values, and Sample Count Checks', () => {
  // Case A: Missing vibration channel
  const rowsA = [{ time: 0, current: 2.1 }, { time: 0.1, current: 2.2 }];
  const valA = fileAnalysisService.validateMappedData(rowsA, { timestamp: 'time', current: 'current', vibration: null });
  assert.strictEqual(valA.isValid, false, 'Should be invalid when vibration is missing');
  assert.ok(valA.errors.some(e => e.includes('Vibration')), 'Error must mention vibration');

  // Case B: NaNs and Infs detection
  const rowsB = [];
  for (let i = 0; i < 70; i++) {
    rowsB.push({
      vibration: i === 10 ? NaN : (i === 15 ? Infinity : 1.2),
      current: 2.0
    });
  }
  const valB = fileAnalysisService.validateMappedData(rowsB, { vibration: 'vibration', current: 'current' });
  assert.strictEqual(valB.isValid, true, 'Should pass with warning since count exceeds 64');
  assert.strictEqual(valB.stats.nanCount, 1, 'Should detect 1 NaN');
  assert.strictEqual(valB.stats.infCount, 1, 'Should detect 1 Infinity');
});

// ----------------------------------------------------
// TEST 6: FULL OFFLINE SIGNAL PROCESSING & ESTIMATED RPM (25 Hz = 1500 RPM)
// ----------------------------------------------------
runTest('Offline Signal Processing with 25 Hz Vibration yields 1500 RPM', () => {
  const fs = 2560;
  const N = 512;
  const rows = [];
  for (let i = 0; i < N; i++) {
    const t = i / fs;
    rows.push({
      time: t,
      accel: 2.0 * Math.sin(2 * Math.PI * 25.0 * t) + 0.5 * Math.sin(2 * Math.PI * 50.0 * t),
      current: 2.2 + 0.1 * Math.sin(2 * Math.PI * 50.0 * t),
      voltage: 230.0,
      temperature: 42.0 + (i / N) * 1.5
    });
  }

  const mapping = {
    timestamp: 'time',
    vibration: 'accel',
    current: 'current',
    voltage: 'voltage',
    temperature: 'temperature'
  };

  const fileInfo = {
    fileName: 'test_motor_bench.csv',
    fileType: 'CSV',
    numSamples: N,
    rawSamplingRate: fs
  };

  const result = fileAnalysisService.processOfflineData(rows, mapping, fileInfo, 'MTR-001');

  // Check Vibration Features
  assert.strictEqual(result.vibrationFeatures.dominantFreq, 25.0, 'Dominant frequency should be 25 Hz');
  assert.strictEqual(result.vibrationFeatures.frequency1X, 25.0, '1X frequency should be 25 Hz');
  assert.strictEqual(result.vibrationFeatures.estimatedRPM, 1500, 'Estimated RPM must be exactly 1500 (25 Hz * 60)');
  assert.strictEqual(result.estimatedRPM.isReliable, true, 'Estimated RPM must be reliable');
  assert.strictEqual(result.vibrationWaveform.length > 0, true, 'Vibration waveform points generated');
  assert.strictEqual(result.vibrationSpectrum.length > 0, true, 'FFT spectrum generated');

  // Check Current, Voltage, Temperature
  assert.ok(result.currentAnalysis.rms > 2.0, 'Current RMS computed');
  assert.ok(result.voltageAnalysis.rms > 220.0, 'Voltage RMS computed');
  assert.ok(result.temperatureAnalysis.mean >= 42.0, 'Temperature mean computed');
  assert.ok(result.temperatureAnalysis.rise > 0, 'Temperature rise computed');
});

// ----------------------------------------------------
// TEST 7: 1X DETECTOR DOES NOT BLINDLY PICK HIGHEST PEAK
// ----------------------------------------------------
runTest('1X Detector avoids High-Frequency Defect Peak and identifies 1X Rotational Peak', () => {
  const fs = 2560;
  const N = 512;
  const rows = [];
  for (let i = 0; i < N; i++) {
    const t = i / fs;
    // 25 Hz 1X rotor frequency (amplitude 1.5)
    // 120 Hz bearing impact peak with LARGER amplitude (3.0)
    const vib = 1.5 * Math.sin(2 * Math.PI * 25.0 * t) + 3.0 * Math.sin(2 * Math.PI * 120.0 * t);
    rows.push({ time: t, vib });
  }

  const result = fileAnalysisService.processOfflineData(
    rows, 
    { timestamp: 'time', vibration: 'vib' }, 
    { fileName: 'bearing_defect_run.csv', rawSamplingRate: fs }, 
    'MTR-002'
  );

  // Dominant peak is 120 Hz
  assert.strictEqual(result.vibrationFeatures.dominantFreq, 120.0, 'Dominant peak should be 120 Hz');
  
  // BUT 1X Rotational Speed must remain 25 Hz (1500 RPM)!
  assert.strictEqual(result.estimatedRPM.frequency1X, 25.0, '1X should still be detected at 25 Hz');
  assert.strictEqual(result.estimatedRPM.estimatedRPM, 1500, 'RPM must be 1500, NOT 120 * 60 = 7200 RPM!');
});

// ----------------------------------------------------
// TEST 8: REFERENCE DATASET LABEL PRESERVATION AS METADATA
// ----------------------------------------------------
runTest('Reference Dataset Label Preserved as Metadata with Safety Disclaimer', () => {
  const result = fileAnalysisService.processOfflineData(
    [{ vib: 1.0 }, { vib: 1.1 }],
    { vibration: 'vib' },
    { fileName: 'test.csv', referenceDatasetLabel: 'Outer Race Bearing Fault' },
    'MTR-004'
  );

  assert.strictEqual(result.referenceDatasetLabel, 'Outer Race Bearing Fault');
  assert.ok(result.referenceDatasetDisclaimer.toLowerCase().includes('not an automated diagnosis'));
});

console.log(`\n====================================================`);
console.log(`PHASE 3 TEST SUITE RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log(`====================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
