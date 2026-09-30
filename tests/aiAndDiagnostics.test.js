/**
 * MOTORSYNC — Master Specification Phase 8, 9, 10, 11, 12 Test Suite
 * 
 * Tests:
 * 1. Baseline Service: Established baseline deviation computation (ΔT, ΔVib, ΔI)
 * 2. Baseline Service: Uncommissioned unit returns "Baseline: Not available" without fabricating values
 * 3. Diagnostic Model Interface: ModelRegistry metadata, active model retrieval, versioning
 * 4. AI Inference Service: Bearing fault indication with impulsive vibration features
 * 5. AI Inference Service: Rotor unbalance indication with dominant 1X frequency
 * 6. AI Inference Service: Thermal overload indication with high surface temperature
 * 7. AI Inference Service: Insufficient telemetry data handling
 * 8. Scientific Safety & Explainability: Evidence list, non-absolute terminology ("Suspected"), experimental labeling
 * 9. Alert Service: Threshold triggers, categorization (Vibration, Thermal, Diagnostic), and deduplication
 */

import assert from 'assert';
import { baselineService } from '../src/services/baselineService.js';
import { modelRegistry } from '../src/services/ai/modelRegistry.js';
import { inferenceService } from '../src/services/ai/inferenceService.js';
import { alertService, ALERT_CATEGORIES, ALERT_SEVERITIES } from '../src/services/alertService.js';

console.log('====================================================');
console.log('RUNNING AI ARCHITECTURE, BASELINE & DIAGNOSTIC TESTS');
console.log('====================================================\n');

let testsPassed = 0;

// ----------------------------------------------------
// TEST 1: Baseline Service Established Deviations
// ----------------------------------------------------
try {
  const currentData = {
    temperature: 55.4,
    vibrationRms: 2.10,
    currentRms: 2.45,
    crestFactor: 2.8,
    dominantFrequency: 24.7
  };

  const deviations = baselineService.calculateDeviations('MTR-001', currentData);
  assert.strictEqual(deviations.baselineStatus, 'ESTABLISHED', 'MTR-001 baseline must be ESTABLISHED');
  assert.strictEqual(deviations.temperatureRiseFromBaseline, 13.4, 'Temperature rise should be 55.4 - 42.0 = 13.4 °C');
  assert.strictEqual(deviations.vibrationRiseFromBaseline, 1.28, 'Vibration rise should be 2.10 - 0.82 = 1.28 mm/s');
  assert.strictEqual(deviations.currentDeviationFromBaseline, 0.3, 'Current deviation should be 2.45 - 2.15 = 0.30 A');
  assert.strictEqual(deviations.hasSignificantDeviation, true, 'Should flag significant deviation due to temp rise > 10 °C');
  
  console.log('[PASS] Test 1: Established baseline deviation computation (ΔT, ΔVib, ΔI)');
  testsPassed++;
} catch (err) {
  console.error('[FAIL] Test 1: Established baseline deviations:', err.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 2: Uncommissioned Unit Handles Missing Baseline Without Fabrication
// ----------------------------------------------------
try {
  const currentData = {
    temperature: 48.0,
    vibrationRms: 1.5,
    currentRms: 5.0
  };

  const deviations = baselineService.calculateDeviations('MTR-005', currentData);
  assert.strictEqual(deviations.baselineStatus, 'NOT_AVAILABLE', 'MTR-005 baseline must be NOT_AVAILABLE');
  assert.strictEqual(deviations.temperatureRiseFromBaseline, null, 'Do not fabricate temperature rise');
  assert.strictEqual(deviations.temperatureRiseLabel, 'Baseline: Not available', 'Must display "Baseline: Not available"');
  assert.strictEqual(deviations.vibrationRiseFromBaseline, null, 'Do not fabricate vibration rise');

  console.log('[PASS] Test 2: Uncommissioned unit returns "Baseline: Not available" without fabricating values');
  testsPassed++;
} catch (err) {
  console.error('[FAIL] Test 2: Missing baseline handling:', err.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 3: Diagnostic Model Registry and Metadata
// ----------------------------------------------------
try {
  const activeModel = modelRegistry.getActiveModel();
  assert(activeModel != null, 'Active model must exist');
  
  const meta = activeModel.getMetadata();
  assert.strictEqual(meta.modelType, 'EXPERIMENTAL_RULE_FEATURE_FUSION');
  assert(meta.status.includes('Experimental / Development'), 'Status must declare experimental/development');
  assert.strictEqual(meta.validationMetrics, null, 'Validation metrics must be null when model is not trained');
  
  console.log('[PASS] Test 3: ModelRegistry metadata, active model retrieval, versioning');
  testsPassed++;
} catch (err) {
  console.error('[FAIL] Test 3: Model registry metadata:', err.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 4: Bearing Fault Indication with Impulsive Features
// ----------------------------------------------------
try {
  const payload = {
    motorId: 'MTR-001',
    vibration: {
      rms: 3.8,
      peak: 14.5,
      crestFactor: 3.82, // > 3.2
      kurtosis: 5.10,    // > 4.2
      dominantFrequency: 145.0
    },
    electrical: { currentRms: 2.18, voltageRms: 230.0 },
    thermal: { temperature: 46.0 }
  };

  const result = inferenceService.diagnose(payload);
  assert.strictEqual(result.affectedSection, 'BEARING', 'Should classify affectedSection as BEARING');
  assert(result.faultType.includes('Bearing'), 'Fault type must describe bearing degradation');
  assert(result.componentAssessment.BEARINGS.status === 'FAULT', 'Bearings component status should be FAULT');
  assert(result.evidence.some(e => e.includes('crest factor')), 'Evidence must cite elevated crest factor');
  assert(result.evidence.some(e => e.includes('kurtosis')), 'Evidence must cite elevated kurtosis');

  console.log('[PASS] Test 4: Bearing fault indication with impulsive vibration features');
  testsPassed++;
} catch (err) {
  console.error('[FAIL] Test 4: Bearing fault diagnosis:', err.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 5: Rotor Unbalance Indication with Dominant 1X Frequency
// ----------------------------------------------------
try {
  const payload = {
    motorId: 'MTR-001',
    vibration: {
      rms: 5.2, // > 4.5 ISO trip
      peak: 7.5,
      crestFactor: 2.2, // Normal crest
      kurtosis: 3.05,   // Normal kurtosis
      dominantFrequency: 24.7 // Exact 1X
    },
    electrical: { currentRms: 2.20, voltageRms: 230.0 },
    thermal: { temperature: 44.0 }
  };

  const result = inferenceService.diagnose(payload);
  assert.strictEqual(result.condition, 'FAULT', 'Condition should be FAULT');
  assert.strictEqual(result.affectedSection, 'ROTOR', 'Affected section should be ROTOR');
  assert(result.faultType.includes('Unbalance'), 'Fault type should mention unbalance');
  assert.strictEqual(result.severity, 'CRITICAL', 'Severity should be CRITICAL due to vib > 4.5 mm/s');

  console.log('[PASS] Test 5: Rotor unbalance indication with dominant 1X frequency');
  testsPassed++;
} catch (err) {
  console.error('[FAIL] Test 5: Rotor unbalance diagnosis:', err.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 6: Thermal Overload Indication
// ----------------------------------------------------
try {
  const payload = {
    motorId: 'MTR-001',
    vibration: { rms: 1.1, peak: 2.2, crestFactor: 2.0, dominantFrequency: 24.7 },
    electrical: { currentRms: 2.18, voltageRms: 230.0 },
    thermal: { temperature: 86.5 } // Critical > 80 °C
  };

  const result = inferenceService.diagnose(payload);
  assert.strictEqual(result.condition, 'FAULT', 'Condition should be FAULT');
  assert.strictEqual(result.affectedSection, 'COOLING', 'Affected section should be COOLING');
  assert(result.faultType.includes('Thermal Overload') || result.faultType.includes('Ventilation'));
  assert.strictEqual(result.componentAssessment.COOLING.status, 'FAULT');

  console.log('[PASS] Test 6: Thermal overload indication with high surface temperature');
  testsPassed++;
} catch (err) {
  console.error('[FAIL] Test 6: Thermal overload diagnosis:', err.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 7: Insufficient Telemetry Signals Handling
// ----------------------------------------------------
try {
  const emptyPayload = { motorId: 'MTR-002' };
  const result = inferenceService.diagnose(emptyPayload);
  assert.strictEqual(result.condition, 'INSUFFICIENT DATA');
  assert.strictEqual(result.confidence, null, 'Confidence must be null on insufficient data');
  assert.strictEqual(result.severity, 'UNKNOWN');
  assert.strictEqual(result.affectedSection, 'UNKNOWN');

  console.log('[PASS] Test 7: Insufficient telemetry data handling');
  testsPassed++;
} catch (err) {
  console.error('[FAIL] Test 7: Insufficient data handling:', err.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 8: Scientific Safety & Non-Absolute Terminology
// ----------------------------------------------------
try {
  const payload = {
    motorId: 'MTR-001',
    vibration: { rms: 3.5, crestFactor: 3.6, dominantFrequency: 120 },
    thermal: { temperature: 45 }
  };
  const result = inferenceService.diagnose(payload);
  
  // Verify wording uses "Suspected", "Indication", "Possible", or "Model assessment" (Section 30, 53)
  const isPrudent = result.faultType.includes('Suspected') || 
                    result.faultType.includes('Indication') || 
                    result.faultType.includes('Possible');
  assert(isPrudent, 'Diagnostic fault title must use prudent phrasing ("Suspected")');
  assert(!result.faultType.includes('definitely'), 'Never claim scientific certainty');
  assert(result.explanation.modelDisclaimer != null, 'Must contain experimental disclaimer');

  console.log('[PASS] Test 8: Scientific safety & explainability with non-absolute terminology ("Suspected")');
  testsPassed++;
} catch (err) {
  console.error('[FAIL] Test 8: Scientific safety:', err.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 9: Alert Service Triggers and Deduplication
// ----------------------------------------------------
try {
  alertService.clearAlerts();
  const alertPayload = {
    motorId: 'MTR-003',
    sourceType: 'EXTERNAL_LAPTOP',
    vibration: { rms: 5.6 }, // Triggers critical vibration
    thermal: { temperature: 84.0 } // Triggers critical thermal
  };
  const diagMock = {
    condition: 'FAULT',
    affectedSection: 'BEARING',
    faultType: 'Suspected Bearing Outer Raceway Degradation',
    evidence: ['ISO 10816 limit exceeded']
  };

  const newAlerts = alertService.evaluate(alertPayload, diagMock);
  assert(newAlerts.length >= 3, 'Should generate Vibration, Thermal, and Diagnostic alerts');
  
  const hasVib = newAlerts.some(a => a.category === ALERT_CATEGORIES.VIBRATION && a.severity === ALERT_SEVERITIES.CRITICAL);
  const hasTherm = newAlerts.some(a => a.category === ALERT_CATEGORIES.THERMAL && a.severity === ALERT_SEVERITIES.CRITICAL);
  const hasDiag = newAlerts.some(a => a.category === ALERT_CATEGORIES.DIAGNOSTIC && a.severity === ALERT_SEVERITIES.CRITICAL);
  assert(hasVib && hasTherm && hasDiag, 'All critical categories must be represented');

  // Verify deduplication within short window
  const secondPass = alertService.evaluate(alertPayload, diagMock);
  assert.strictEqual(secondPass.length, 0, 'Immediate duplicate alerts must be prevented');

  console.log('[PASS] Test 9: Alert Service triggers, categorization, and deduplication');
  testsPassed++;
} catch (err) {
  console.error('[FAIL] Test 9: Alert Service:', err.message);
  process.exit(1);
}

console.log('\n====================================================');
console.log(`AI & DIAGNOSTICS SUITE RESULTS: ${testsPassed} / 9 TESTS PASSED`);
console.log('====================================================\n');
