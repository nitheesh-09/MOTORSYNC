/**
 * MOTORSYNC Backend Test Suite — Ingestion, Validation & Analytics
 * 
 * Verifies:
 * - Payload validation & sanitization
 * - Safe rejection of malformed/empty payloads
 * - End-to-end DataIngestionService pipeline
 * - Electrical, Thermal, Vibration analytics calculation
 * - 1X detection and derived RPM calculation
 * - Feature availability state tracking (never silent zeros)
 */

import assert from 'assert';
import { payloadValidator } from '../src/validation/payloadValidator.js';
import { dataIngestionService } from '../src/ingestion/dataIngestionService.js';
import { electricalAnalyticsService } from '../src/analytics/electricalAnalyticsService.js';
import { thermalAnalyticsService } from '../src/analytics/thermalAnalyticsService.js';
import { vibrationAnalyticsService } from '../src/analytics/vibrationAnalyticsService.js';
import { runningFrequencyService } from '../src/processing/runningFrequencyService.js';
import { featureBuilder } from '../src/ai/featureBuilder.js';
import { getDatabase, closeDatabase } from '../src/storage/database.js';

console.log('====================================================');
console.log('RUNNING INGESTION, VALIDATION & ANALYTICS TESTS');
console.log('====================================================\n');

let testsPassed = 0;
getDatabase(':memory:');

// ----------------------------------------------------
// TEST 1: Payload Validator with Complete Telemetry
// ----------------------------------------------------
try {
  const raw = {
    motorId: 'MTR-001',
    timestamp: '2026-09-30T10:00:00.000Z',
    sourceType: 'EXTERNAL_LAPTOP',
    electrical: { voltageRms: '400.5', currentRms: '12.4', power: '5.1' },
    thermal: { temperature: '45.2' },
    vibration: { rms: '1.25', peak: '2.5', crestFactor: '2.0', dominantFrequency: '25.0' },
    rpm: '1500'
  };

  const res = payloadValidator.validate(raw);
  assert(res.valid === true, 'Payload must be valid');
  assert.strictEqual(res.normalizedPayload.electrical.voltageRms, 400.5);
  assert.strictEqual(res.normalizedPayload.thermal.temperature, 45.2);
  assert.strictEqual(res.normalizedPayload.vibration.rms, 1.25);
  assert.strictEqual(res.normalizedPayload.rpm, 1500);
  assert.strictEqual(res.quality.isClean, true);

  console.log('[PASS] Test 1: Complete telemetry validation & numeric normalization');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 1: Complete telemetry validation:', e.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 2: Malformed & Invalid Payload Rejection
// ----------------------------------------------------
try {
  // Missing motorId
  const noMotor = payloadValidator.validate({ timestamp: new Date().toISOString() });
  assert.strictEqual(noMotor.valid, false);
  assert(noMotor.errors.some(e => e.includes('motorId')));

  // Invalid sourceType
  const badSource = payloadValidator.validate({ motorId: 'MTR-001', sourceType: 'UNKNOWN_DEVICE' });
  assert.strictEqual(badSource.valid, false);
  assert(badSource.errors.some(e => e.includes('sourceType')));

  // Non-object
  const nonObj = payloadValidator.validate('string payload');
  assert.strictEqual(nonObj.valid, false);

  console.log('[PASS] Test 2: Safe rejection of malformed payloads (no crashes)');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 2: Malformed payload rejection:', e.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 3: Electrical & Power Analytics Calculation
// ----------------------------------------------------
try {
  const elec = electricalAnalyticsService.analyze(
    { voltageRms: 400, currentRms: 10 },
    { ratedCurrent: 12.0 }
  );

  // sqrt(3) * 400 * 10 * 0.85 / 1000 = 5.889 kW
  assert(elec.power > 5.8 && elec.power < 5.9, `Calculated power should be ~5.89 kW, got ${elec.power}`);
  assert.strictEqual(elec.isOverloaded, false);
  assert.strictEqual(elec.loadPercentage, 83.3);

  console.log('[PASS] Test 3: Electrical analytics & 3-phase power calculation');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 3: Electrical analytics:', e.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 4: Thermal Analytics Baseline Comparison
// ----------------------------------------------------
try {
  const establishedBase = { status: 'ESTABLISHED', normalTemperature: 42.0 };
  const therm = thermalAnalyticsService.analyze({ temperature: 56.4 }, establishedBase);
  assert.strictEqual(therm.temperatureRiseFromBaseline, 14.4);
  assert.strictEqual(therm.thermalStatus, 'NORMAL');

  // Unestablished baseline
  const noBase = { status: 'NOT_AVAILABLE' };
  const thermNoBase = thermalAnalyticsService.analyze({ temperature: 56.4 }, noBase);
  assert.strictEqual(thermNoBase.temperatureRiseFromBaseline, null);
  assert.strictEqual(thermNoBase.baselineComparison, 'Baseline: Not available');

  console.log('[PASS] Test 4: Thermal analytics & healthy baseline comparison');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 4: Thermal analytics:', e.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 5: Vibration ISO 10816 Zone Classification
// ----------------------------------------------------
try {
  const vibGood = vibrationAnalyticsService.analyze({ rms: 1.1 });
  assert.strictEqual(vibGood.isoZone, 'ZONE_A');
  assert.strictEqual(vibGood.isoStatus, 'HEALTHY');

  const vibWarn = vibrationAnalyticsService.analyze({ rms: 3.2 });
  assert.strictEqual(vibWarn.isoZone, 'ZONE_C');
  assert.strictEqual(vibWarn.isoStatus, 'WARNING');

  const vibFault = vibrationAnalyticsService.analyze({ rms: 5.6 });
  assert.strictEqual(vibFault.isoZone, 'ZONE_D');
  assert.strictEqual(vibFault.isoStatus, 'FAULT');

  console.log('[PASS] Test 5: Vibration ISO 10816 zone classification');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 5: Vibration ISO classification:', e.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 6: Running Frequency Detection & Speed Derivation
// ----------------------------------------------------
try {
  const mockSpectrum = {
    frequencies: [10, 15, 20, 24.8, 30, 40, 50, 100],
    magnitudes: [0.1, 0.15, 0.2, 2.5, 0.18, 0.12, 0.3, 0.05]
  };

  const speed = runningFrequencyService.detectRunningFrequency(mockSpectrum, { nominalRPM: 1500 });
  assert.strictEqual(speed.available, true);
  assert.strictEqual(speed.frequency, 24.8);
  assert.strictEqual(speed.rpm, 1488); // 24.8 * 60 = 1488 RPM

  console.log('[PASS] Test 6: Running frequency isolation and RPM derivation (RPM = f_1X * 60)');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 6: Running frequency service:', e.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 7: FeatureBuilder Availability State (No Silent Zeros)
// ----------------------------------------------------
try {
  const partialPayload = {
    motorId: 'MTR-001',
    vibration: { rms: 1.2 },
    // Missing electrical and thermal entirely
  };

  const featureVector = featureBuilder.build(partialPayload);
  assert.strictEqual(featureVector.features.vibrationRms.available, true);
  assert.strictEqual(featureVector.features.vibrationRms.value, 1.2);
  assert.strictEqual(featureVector.features.temperature.available, false);
  assert.strictEqual(featureVector.features.temperature.value, null, 'Must NOT fabricate zero for missing temperature');
  assert.strictEqual(featureVector.features.currentRms.available, false);
  assert.strictEqual(featureVector.features.currentRms.value, null, 'Must NOT fabricate zero for missing current');

  console.log('[PASS] Test 7: FeatureBuilder explicit availability (no silent zeros)');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 7: FeatureBuilder availability:', e.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 8: Full Data Ingestion Pipeline Integration
// ----------------------------------------------------
try {
  const payload = {
    motorId: 'MTR-001',
    sourceType: 'SYNTHETIC',
    electrical: { voltageRms: 400.0, currentRms: 14.5 },
    thermal: { temperature: 48.0 },
    vibration: { rms: 3.5, peak: 13.0, crestFactor: 3.71, dominantFrequency: 140 },
    rpm: 1480
  };

  const res = await dataIngestionService.ingest(payload);
  assert(res.success === true, 'DataIngestionService must succeed');
  assert.strictEqual(res.data.telemetry.motorId, 'MTR-001');
  assert(res.data.diagnostics != null);
  assert.strictEqual(res.data.diagnostics.affectedSection, 'BEARING');
  assert(res.data.alertsGenerated >= 1);

  console.log('[PASS] Test 8: Full Ingestion Pipeline (Validation -> Storage -> Analytics -> Health -> AI -> Alerts)');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 8: Data Ingestion Pipeline:', e.message);
  process.exit(1);
}

closeDatabase();

console.log('\n====================================================');
console.log(`INGESTION & ANALYTICS TESTS PASSED: ${testsPassed} / 8`);
console.log('====================================================\n');
