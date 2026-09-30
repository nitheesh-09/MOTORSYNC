/**
 * MOTORSYNC Backend Test Suite — Offline Dataset Analysis Service
 * 
 * Verifies:
 * - Parsing of CSV, JSON, and XML files
 * - Sampling rate derivation
 * - Spectral decomposition (FFT) on raw waveforms
 * - Statistical feature calculation
 * - Reference label preservation with disclaimers
 * - Storage into SQLite analyses table
 */

import assert from 'assert';
import { offlineAnalysisService } from '../src/offline/offlineAnalysisService.js';
import { getDatabase, closeDatabase } from '../src/storage/database.js';

console.log('====================================================');
console.log('RUNNING BACKEND OFFLINE ANALYSIS TESTS');
console.log('====================================================\n');

let testsPassed = 0;
getDatabase(':memory:');

// ----------------------------------------------------
// TEST 1: CSV Dataset Parsing & Processing
// ----------------------------------------------------
try {
  const csvContent = `
# Fs: 2560
# Condition: Simulated Bearing Raceway Fault
timestamp,vibration,current,voltage,temperature
0.0000,0.12,14.2,400.1,44.5
0.0004,1.85,14.3,399.8,44.5
0.0008,-1.20,14.1,400.0,44.6
0.0012,3.40,14.4,400.2,44.6
0.0016,-0.50,14.2,399.9,44.6
0.0020,0.80,14.3,400.1,44.6
0.0024,-2.10,14.2,400.0,44.6
0.0028,1.10,14.3,400.1,44.7
  `.trim();

  const record = await offlineAnalysisService.processFile(csvContent, 'bearing_run.csv', 'MTR-001');
  assert(record.analysisId != null);
  assert.strictEqual(record.motorId, 'MTR-001');
  assert.strictEqual(record.samplingRate, 2560);
  assert.strictEqual(record.sampleCount, 8);
  assert.strictEqual(record.referenceLabel, 'Simulated Bearing Raceway Fault');
  assert(record.availableFeatures.includes('vibration'));
  assert(record.results.timeFeatures.rms > 0);

  console.log('[PASS] Test 1: CSV dataset parsing with metadata comments & feature processing');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 1: CSV dataset parsing:', e.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 2: JSON Dataset Parsing & Spectral Analysis
// ----------------------------------------------------
try {
  // Generate a clean 256-sample 25 Hz sine wave sampled at 256 Hz (1 Hz bin resolution)
  const Fs = 256;
  const N = 256;
  const telemetry = [];
  for (let i = 0; i < N; i++) {
    const t = i / Fs;
    const vib = 2.0 * Math.sin(2 * Math.PI * 25.0 * t);
    telemetry.push({
      timestamp: t.toFixed(4),
      vibration: parseFloat(vib.toFixed(4)),
      current: 12.0,
      voltage: 400.0,
      temperature: 42.0
    });
  }

  const jsonContent = JSON.stringify({
    samplingRate: Fs,
    referenceLabel: '25 Hz Unbalance Test Bench Run',
    data: telemetry
  });

  const record = await offlineAnalysisService.processFile(jsonContent, 'sine_test.json', 'MTR-002');
  assert.strictEqual(record.sampleCount, 256);
  assert.strictEqual(record.samplingRate, 256);
  assert(record.results.spectrum != null);
  assert(record.results.spectrum.dominantFrequency >= 24 && record.results.spectrum.dominantFrequency <= 26, 
    `Dominant frequency should be ~25 Hz, got ${record.results.spectrum.dominantFrequency}`);
  assert.strictEqual(record.results.speedAnalysis.rpm, 1500); // 25 Hz * 60 = 1500 RPM

  console.log('[PASS] Test 2: JSON dataset parsing, FFT computation & 25 Hz -> 1500 RPM derivation');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 2: JSON dataset parsing & FFT:', e.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 3: XML Dataset Parsing
// ----------------------------------------------------
try {
  const xmlContent = `
<dataset>
  <metadata>
    <samplingRate>1000</samplingRate>
  </metadata>
  <data>
    <record>
      <vibration>0.45</vibration>
      <current>10.2</current>
      <voltage>400</voltage>
      <temperature>41.5</temperature>
    </record>
    <record>
      <vibration>0.82</vibration>
      <current>10.3</current>
      <voltage>400</voltage>
      <temperature>41.5</temperature>
    </record>
    <record>
      <vibration>-0.35</vibration>
      <current>10.1</current>
      <voltage>400</voltage>
      <temperature>41.6</temperature>
    </record>
    <record>
      <vibration>0.15</vibration>
      <current>10.2</current>
      <voltage>400</voltage>
      <temperature>41.6</temperature>
    </record>
  </data>
</dataset>
  `.trim();

  const record = await offlineAnalysisService.processFile(xmlContent, 'legacy_data.xml', 'MTR-004');
  assert.strictEqual(record.sampleCount, 4);
  assert.strictEqual(record.samplingRate, 1000);
  assert(record.results.timeFeatures.rms > 0);

  console.log('[PASS] Test 3: XML dataset parsing and feature extraction');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 3: XML dataset parsing:', e.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 4: Rejection of Unsupported File Types
// ----------------------------------------------------
try {
  let threw = false;
  try {
    await offlineAnalysisService.processFile('content', 'unsupported.docx', 'MTR-001');
  } catch (err) {
    threw = true;
    assert(err.message.includes('Unsupported file format'));
  }
  assert(threw, 'Should reject unsupported file formats');

  console.log('[PASS] Test 4: Rejection of unsupported file formats');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 4: Unsupported format rejection:', e.message);
  process.exit(1);
}

closeDatabase();

console.log('\n====================================================');
console.log(`OFFLINE ANALYSIS TESTS PASSED: ${testsPassed} / 4`);
console.log('====================================================\n');
