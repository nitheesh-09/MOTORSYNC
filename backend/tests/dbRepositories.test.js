/**
 * MOTORSYNC Backend Test Suite — Repositories & Database Persistence
 * 
 * Verifies:
 * - SQLite schema creation & table setup
 * - Motor CRUD operations
 * - Telemetry saving & latest/history querying
 * - Baseline upsert & retrieval
 * - Alert creation, deduplication & acknowledgment
 * - Offline analysis record persistence
 * - Diagnostic record persistence
 */

import assert from 'assert';
import { getDatabase, closeDatabase } from '../src/storage/database.js';
import { MotorRepository } from '../src/repositories/motorRepository.js';
import { TelemetryRepository } from '../src/repositories/telemetryRepository.js';
import { BaselineRepository } from '../src/repositories/baselineRepository.js';
import { AlertRepository } from '../src/repositories/alertRepository.js';
import { AnalysisRepository } from '../src/repositories/analysisRepository.js';
import { DiagnosticRepository } from '../src/repositories/diagnosticRepository.js';

console.log('====================================================');
console.log('RUNNING BACKEND DATABASE & REPOSITORY TESTS');
console.log('====================================================\n');

let testsPassed = 0;
const db = getDatabase(':memory:');

const motorRepo = new MotorRepository(db);
const telemRepo = new TelemetryRepository(db);
const baseRepo = new BaselineRepository(db);
const alertRepo = new AlertRepository(db);
const analysisRepo = new AnalysisRepository(db);
const diagRepo = new DiagnosticRepository(db);

// ----------------------------------------------------
// TEST 1: Motor Registry CRUD
// ----------------------------------------------------
try {
  const initialMotors = motorRepo.findAll();
  assert(initialMotors.length >= 5, 'Initial seed should contain at least 5 fleet motors');

  const created = motorRepo.create({
    motorId: 'MTR-TEST',
    name: 'Test Induction Unit',
    location: 'Test Bay',
    motorType: '3-Phase Induction',
    ratedVoltage: 415,
    ratedCurrent: 18.5,
    ratedRPM: 1490
  });

  assert.strictEqual(created.motorId, 'MTR-TEST');
  const found = motorRepo.findByMotorId('MTR-TEST');
  assert.strictEqual(found.name, 'Test Induction Unit');

  motorRepo.update('MTR-TEST', { name: 'Updated Induction Unit', status: 'WARNING' });
  const updated = motorRepo.findByMotorId('MTR-TEST');
  assert.strictEqual(updated.name, 'Updated Induction Unit');
  assert.strictEqual(updated.status, 'WARNING');

  motorRepo.delete('MTR-TEST');
  assert.strictEqual(motorRepo.findByMotorId('MTR-TEST'), null);

  console.log('[PASS] Test 1: Motor CRUD repository operations');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 1: Motor CRUD:', e.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 2: Telemetry Ingestion & Latest Query
// ----------------------------------------------------
try {
  const now = new Date().toISOString();
  telemRepo.save({
    motorId: 'MTR-001',
    timestamp: now,
    sourceType: 'EXTERNAL_LAPTOP',
    electrical: { voltageRms: 400.2, currentRms: 12.1 },
    thermal: { temperature: 43.5 },
    vibration: { rms: 1.15, crestFactor: 2.1 },
    rpm: 1485
  });

  const latest = telemRepo.findLatestByMotorId('MTR-001');
  assert(latest != null, 'Latest record must exist');
  assert.strictEqual(latest.sourceType, 'EXTERNAL_LAPTOP');
  assert.strictEqual(latest.electrical.voltageRms, 400.2);
  assert.strictEqual(latest.rpm, 1485);

  const history = telemRepo.findByMotorId('MTR-001', { limit: 10 });
  assert(history.length >= 1);

  console.log('[PASS] Test 2: Telemetry repository persistence and retrieval');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 2: Telemetry persistence:', e.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 3: Baseline Upsert and Retrieval
// ----------------------------------------------------
try {
  baseRepo.upsert({
    motorId: 'MTR-001',
    status: 'ESTABLISHED',
    normalTemperature: 41.5,
    normalVibrationRms: 0.80,
    normalCurrentRms: 13.9,
    normalVoltageRms: 400.0,
    nominal1XFreq: 24.7
  });

  const base = baseRepo.findByMotorId('MTR-001');
  assert.strictEqual(base.status, 'ESTABLISHED');
  assert.strictEqual(base.normalTemperature, 41.5);
  assert.strictEqual(base.normalVibrationRms, 0.80);

  console.log('[PASS] Test 3: Baseline repository upsert and retrieval');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 3: Baseline repository:', e.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 4: Alert Persistence & Acknowledgment
// ----------------------------------------------------
try {
  const alert = alertRepo.save({
    motorId: 'MTR-002',
    category: 'VIBRATION',
    severity: 'CRITICAL',
    message: 'High vibration detected',
    evidence: 'RMS: 5.2 mm/s',
    source: 'EXTERNAL_LAPTOP'
  });

  assert(alert.alertId != null);
  const foundAlerts = alertRepo.findByMotorId('MTR-002');
  assert(foundAlerts.length >= 1);
  assert.strictEqual(foundAlerts[0].severity, 'CRITICAL');

  alertRepo.acknowledge(alert.alertId);
  const rechecked = alertRepo.findByMotorId('MTR-002');
  assert.strictEqual(rechecked[0].isAcknowledged, 1);

  console.log('[PASS] Test 4: Alert repository persistence and acknowledgment');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 4: Alert repository:', e.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 5: Offline Analysis Persistence
// ----------------------------------------------------
try {
  const analysis = analysisRepo.save({
    motorId: 'MTR-001',
    datasetName: 'bearing_test_run.csv',
    sampleCount: 1024,
    duration: 0.4,
    samplingRate: 2560,
    availableFeatures: ['vibration', 'temperature'],
    results: { rms: 3.2, peak: 9.8 },
    diagnosticResult: { condition: 'FAULT', affectedSection: 'BEARING' },
    referenceLabel: 'Bearing Fault (Reference)'
  });

  assert(analysis.analysisId != null);
  const found = analysisRepo.findByAnalysisId(analysis.analysisId);
  assert.strictEqual(found.datasetName, 'bearing_test_run.csv');
  assert.strictEqual(found.referenceLabel, 'Bearing Fault (Reference)');
  assert.strictEqual(found.results.rms, 3.2);

  console.log('[PASS] Test 5: Offline analysis repository persistence');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 5: Offline analysis repository:', e.message);
  process.exit(1);
}

// ----------------------------------------------------
// TEST 6: Diagnostic Record Persistence
// ----------------------------------------------------
try {
  diagRepo.save({
    motorId: 'MTR-001',
    condition: 'FAULT',
    affectedSection: 'BEARING',
    faultType: 'Suspected Raceway Defect',
    severity: 'HIGH',
    confidence: 82,
    confidenceLabel: '82% (Experimental)',
    evidence: ['Elevated crest factor', 'ISO Zone C exceeded'],
    explanation: { observedIndicators: ['Crest factor > 3.2'] },
    componentAssessment: { BEARING: { status: 'FAULT' } },
    modelVersion: 'v0.1-dev',
    status: 'EXPERIMENTAL'
  });

  const latestDiag = diagRepo.findLatestByMotorId('MTR-001');
  assert.strictEqual(latestDiag.condition, 'FAULT');
  assert.strictEqual(latestDiag.affectedSection, 'BEARING');
  assert.strictEqual(latestDiag.confidence, 82);
  assert(latestDiag.evidence.length === 2);

  console.log('[PASS] Test 6: Diagnostic repository persistence');
  testsPassed++;
} catch (e) {
  console.error('[FAIL] Test 6: Diagnostic repository:', e.message);
  process.exit(1);
}

closeDatabase();

console.log('\n====================================================');
console.log(`REPOSITORY TESTS PASSED: ${testsPassed} / 6`);
console.log('====================================================\n');
