/**
 * SIGNAL PROCESSING & FEATURE EXTRACTION UNIT TEST SUITE
 * ECE Project: Motor Health Monitoring and Fault Diagnosis System
 * 
 * Verifies mathematical definitions, spectral decomposition, 1X rotational speed detection,
 * harmonics extraction, and error boundary handling.
 * 
 * Run with: node tests/signalProcessing.test.js
 */

import assert from 'assert';
import {
  DEFAULT_SIGNAL_CONFIG,
  MotorDataValidator,
  TimeDomainFeatures,
  FFTAnalysis,
  RotationalSpeedAnalysis,
  HarmonicsAnalysis,
  SignalProcessingEngine
} from '../src/services/signalProcessing/index.js';

console.log('====================================================');
console.log('RUNNING PHASE 2 SIGNAL PROCESSING & FEATURE EXTRACTION TESTS');
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

// ====================================================================
// TEST 1: CLEAN SINUSOIDAL VIBRATION (25 Hz / 1500 RPM)
// ====================================================================
runTest('Clean Sinusoidal Vibration (25 Hz Fundamental)', () => {
  const fs = 2560;
  const N = 512;
  const f0 = 25.0; // 25 Hz
  const amp = 2.0; // 2.0 mm/s peak amplitude
  const signal = [];

  for (let n = 0; n < N; n++) {
    const t = n / fs;
    signal.push(amp * Math.sin(2 * Math.PI * f0 * t));
  }

  // 1. Time-Domain Features Validation
  const timeFeats = TimeDomainFeatures.calculateVibrationFeatures(signal);
  assert.strictEqual(timeFeats.isValid, true, 'Time features should be valid');
  assert.strictEqual(timeFeats.sampleCount, N, `Sample count should be ${N}`);
  
  // Sine mean should be near 0
  assert.ok(Math.abs(timeFeats.mean) < 0.05, `Mean should be close to 0, got ${timeFeats.mean}`);
  
  // Sine RMS should be Amp / sqrt(2) ≈ 2.0 / 1.4142 = 1.414
  assert.ok(Math.abs(timeFeats.rms - 1.414) < 0.05, `RMS should be ~1.414, got ${timeFeats.rms}`);
  
  // Sine Peak should be 2.0
  assert.ok(Math.abs(timeFeats.peak - 2.0) < 0.05, `Peak should be ~2.0, got ${timeFeats.peak}`);
  
  // Peak-to-Peak should be 4.0
  assert.ok(Math.abs(timeFeats.peakToPeak - 4.0) < 0.05, `Peak-to-Peak should be ~4.0, got ${timeFeats.peakToPeak}`);
  
  // Crest Factor should be sqrt(2) ≈ 1.414
  assert.ok(Math.abs(timeFeats.crestFactor - 1.414) < 0.08, `Crest Factor should be ~1.414, got ${timeFeats.crestFactor}`);

  // 2. FFT Spectral Validation
  const fft = FFTAnalysis.computeSpectrum(signal, fs, { maxFrequency: 100, frequencyResolution: 1.0 });
  assert.strictEqual(fft.isValid, true, 'FFT should be valid');
  assert.strictEqual(fft.dominantFrequency, 25.0, `Dominant frequency should be exactly 25 Hz, got ${fft.dominantFrequency}`);
  assert.ok(Math.abs(fft.dominantAmplitude - 2.0) < 0.25, `Dominant amplitude should be ~2.0, got ${fft.dominantAmplitude}`);

  // 3. 1X Running Frequency & Estimated RPM
  const rot = RotationalSpeedAnalysis.detectRunningFrequency(fft.spectrum);
  assert.strictEqual(rot.available, true, '1X should be detected');
  assert.strictEqual(rot.frequency, 25.0, `1X should be 25 Hz, got ${rot.frequency}`);
  assert.strictEqual(rot.estimatedRPM, 1500, `Estimated RPM should be 1500, got ${rot.estimatedRPM}`);
  assert.ok(rot.confidence >= 70, `Confidence should be >= 70%, got ${rot.confidence}`);
});

// ====================================================================
// TEST 2: VIBRATION CONTAINING 1X + 2X HARMONICS
// ====================================================================
runTest('Vibration Containing 1X (25 Hz) + 2X (50 Hz) Harmonics', () => {
  const fs = 2560;
  const N = 512;
  const f1X = 25.0;
  const f2X = 50.0;
  const signal = [];

  for (let n = 0; n < N; n++) {
    const t = n / fs;
    // 2.0 mm/s @ 25 Hz + 0.8 mm/s @ 50 Hz
    signal.push(2.0 * Math.sin(2 * Math.PI * f1X * t) + 0.8 * Math.sin(2 * Math.PI * f2X * t));
  }

  const fft = FFTAnalysis.computeSpectrum(signal, fs, { maxFrequency: 150, frequencyResolution: 1.0 });
  assert.strictEqual(fft.isValid, true);

  const rot = RotationalSpeedAnalysis.detectRunningFrequency(fft.spectrum);
  assert.strictEqual(rot.available, true);
  assert.strictEqual(rot.frequency, 25.0);
  assert.strictEqual(rot.estimatedRPM, 1500);

  // Harmonics extraction
  const harmonics = HarmonicsAnalysis.extractHarmonics(fft.spectrum, rot.frequency, { maxHarmonicOrder: 3 });
  assert.strictEqual(harmonics.length, 3, 'Should produce 3 harmonic orders (1X, 2X, 3X)');
  
  const h1 = harmonics.find(h => h.order === '1X');
  assert.ok(h1 && h1.isIdentified, '1X should be identified');
  assert.strictEqual(h1.detectedFrequency, 25.0);

  const h2 = harmonics.find(h => h.order === '2X');
  assert.ok(h2 && h2.isIdentified, '2X should be identified');
  assert.strictEqual(h2.detectedFrequency, 50.0);
  assert.ok(h2.amplitude > 0.5, `2X amplitude should be > 0.5, got ${h2.amplitude}`);
  assert.ok(h2.amplitudeRatioTo1X > 0.25, `2X ratio should be > 0.25, got ${h2.amplitudeRatioTo1X}`);
});

// ====================================================================
// TEST 3: NOISY VIBRATION (25 Hz with Random Gaussian/Uniform Noise)
// ====================================================================
runTest('Noisy Vibration Signal (SNR ~ 2.5)', () => {
  const fs = 2560;
  const N = 512;
  const f0 = 25.0;
  const signal = [];

  for (let n = 0; n < N; n++) {
    const t = n / fs;
    const clean = 2.0 * Math.sin(2 * Math.PI * f0 * t);
    const noise = (Math.random() - 0.5) * 1.6; // Uniform broadband noise
    signal.push(clean + noise);
  }

  const result = SignalProcessingEngine.processDataset({
    source: 'TEST_NOISY_STREAM',
    samplingRate: fs,
    vibration: signal
  });

  assert.strictEqual(result.vibration.fft.isValid, true);
  assert.strictEqual(result.vibration.runningFrequency.available, true);
  assert.strictEqual(result.vibration.runningFrequency.frequency, 25.0);
  assert.strictEqual(result.vibration.estimatedRPM, 1500);
  assert.ok(result.vibration.rms > 1.4, 'RMS should account for both signal and noise');
});

// ====================================================================
// TEST 4: EMPTY INPUT HANDLING
// ====================================================================
runTest('Empty Input Handling (Zero Samples)', () => {
  const timeFeats = TimeDomainFeatures.calculateVibrationFeatures([]);
  assert.strictEqual(timeFeats.isValid, false, 'Empty array must not be valid');
  assert.strictEqual(timeFeats.mean, null, 'Mean must be null');
  assert.strictEqual(timeFeats.rms, null, 'RMS must be null');
  assert.strictEqual(timeFeats.crestFactor, null, 'Crest factor must be null');

  const fft = FFTAnalysis.computeSpectrum([], 2560);
  assert.strictEqual(fft.isValid, false);
  assert.strictEqual(fft.dominantFrequency, null);
  assert.ok(fft.reason.includes('Insufficient') || fft.reason.includes('empty'));

  const rot = RotationalSpeedAnalysis.detectRunningFrequency([]);
  assert.strictEqual(rot.available, false);
  assert.strictEqual(rot.estimatedRPM, null);
});

// ====================================================================
// TEST 5: INVALID INPUT (NaN, Infinity, Corrupted Non-Numeric Values)
// ====================================================================
runTest('Invalid Input Handling (NaN, Infinity, Strings)', () => {
  const corruptSignal = [
    1.2, NaN, 2.4, Infinity, 'CORRUPT', -1.5, -Infinity, 0.8, 1.1, null, 2.0, -0.5, 0.3
  ];

  const val = MotorDataValidator.validateChannelArray(corruptSignal, 'vibration', { minSamples: 4 });
  assert.strictEqual(val.isValid, true, 'Should filter out invalid samples and keep valid numbers');
  assert.ok(val.warnings.length > 0, 'Should register warnings for filtered corrupted samples');
  assert.strictEqual(val.cleanValues.length, 8, 'Should extract the 8 valid numeric values');

  const timeFeats = TimeDomainFeatures.calculateVibrationFeatures(corruptSignal);
  assert.strictEqual(timeFeats.isValid, true, 'Should compute valid stats on cleaned samples');
  assert.ok(!isNaN(timeFeats.rms) && isFinite(timeFeats.rms), 'RMS must not be NaN');
  assert.ok(!isNaN(timeFeats.crestFactor) && isFinite(timeFeats.crestFactor), 'Crest factor must be finite');
});

// ====================================================================
// TEST 6: INSUFFICIENT SAMPLES (N < minRequiredSamples)
// ====================================================================
runTest('Insufficient Samples Handling (Only 3 samples)', () => {
  const fewSamples = [1.2, 1.4, 1.3]; // Less than minRequiredSamples (8)

  const timeFeats = TimeDomainFeatures.calculateVibrationFeatures(fewSamples);
  assert.strictEqual(timeFeats.isValid, false, 'Must reject insufficient samples');
  assert.strictEqual(timeFeats.rms, null);
  assert.ok(timeFeats.reason.includes('Insufficient valid samples'));

  const fft = FFTAnalysis.computeSpectrum(fewSamples, 2560);
  assert.strictEqual(fft.isValid, false);
  assert.strictEqual(fft.dominantFrequency, null);
});

// ====================================================================
// TEST 7: INVALID OR MISSING SAMPLING RATE
// ====================================================================
runTest('Invalid or Missing Sampling Rate', () => {
  const signal = new Array(100).fill(1.5);

  // Missing rate
  const fftNoRate = FFTAnalysis.computeSpectrum(signal, null);
  assert.strictEqual(fftNoRate.isValid, false);
  assert.ok(fftNoRate.reason.includes('Sampling rate'));

  // Negative rate
  const fftNegRate = FFTAnalysis.computeSpectrum(signal, -500);
  assert.strictEqual(fftNegRate.isValid, false);
  assert.ok(fftNegRate.reason.includes('positive finite number'));

  // Zero rate
  const fftZeroRate = FFTAnalysis.computeSpectrum(signal, 0);
  assert.strictEqual(fftZeroRate.isValid, false);

  // NaN rate
  const fftNanRate = FFTAnalysis.computeSpectrum(signal, NaN);
  assert.strictEqual(fftNanRate.isValid, false);
});

// ====================================================================
// TEST 8: MULTI-CHANNEL DATASET PROCESSING & RESULT STRUCTURE (Req 10)
// ====================================================================
runTest('Unified Engine Standard Result Object Compliance (Req 10)', () => {
  const fs = 2560;
  const N = 512;
  const vib = [];
  const current = [];
  const voltage = [];
  const temp = [];

  for (let n = 0; n < N; n++) {
    const t = n / fs;
    vib.push(2.2 * Math.sin(2 * Math.PI * 25.0 * t));
    current.push(2.18 + 0.05 * Math.sin(2 * Math.PI * 50 * t));
    voltage.push(230.4 + 0.5 * Math.sin(2 * Math.PI * 50 * t));
    temp.push(42.5 + (n / N) * 2.5); // Temp rises from 42.5 to 45.0 °C
  }

  const result = SignalProcessingEngine.processDataset({
    source: 'INTEGRATION_TEST_FEED',
    samplingRate: fs,
    vibration: vib,
    current,
    voltage,
    temperature: temp
  });

  // Verify Standard Result Structure
  assert.strictEqual(result.source, 'INTEGRATION_TEST_FEED');
  assert.strictEqual(result.sampleCount, N);
  assert.strictEqual(result.samplingRate, fs);

  // Vibration node
  assert.ok(result.vibration, 'Result must contain vibration object');
  assert.ok(typeof result.vibration.mean === 'number');
  assert.ok(typeof result.vibration.rms === 'number');
  assert.ok(typeof result.vibration.peak === 'number');
  assert.ok(typeof result.vibration.peakToPeak === 'number');
  assert.ok(typeof result.vibration.standardDeviation === 'number');
  assert.ok(typeof result.vibration.crestFactor === 'number');
  assert.strictEqual(result.vibration.dominantFrequency, 25.0);
  assert.strictEqual(result.vibration.runningFrequency.frequency, 25.0);
  assert.strictEqual(result.vibration.estimatedRPM, 1500);
  assert.ok(Array.isArray(result.vibration.harmonics), 'Harmonics must be an array');

  // Current node
  assert.ok(result.current, 'Result must contain current object');
  assert.ok(Math.abs(result.current.mean - 2.18) < 0.1);
  assert.ok(Math.abs(result.current.rms - 2.18) < 0.1);

  // Voltage node
  assert.ok(result.voltage, 'Result must contain voltage object');
  assert.ok(Math.abs(result.voltage.mean - 230.4) < 1.0);
  assert.ok(Math.abs(result.voltage.rms - 230.4) < 1.0);

  // Temperature node
  assert.ok(result.temperature, 'Result must contain temperature object');
  assert.ok(result.temperature.mean > 42.0 && result.temperature.mean < 45.5);
  assert.ok(Math.abs(result.temperature.rise - 2.5) < 0.2, `Temp rise should be ~2.5 °C, got ${result.temperature.rise}`);
});

console.log('\n====================================================');
console.log(`TEST SUITE RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
