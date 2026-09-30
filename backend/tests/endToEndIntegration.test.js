/**
 * MOTORSYNC Backend Test Suite — End-to-End Integration Test
 * 
 * Master Specification Section 58:
 * Synthetic Provider -> Ingestion API -> Validation -> Database ->
 * Health Assessment -> Diagnostic Engine -> API -> Frontend-compatible response.
 * Verifies Motor ID isolation and schema compliance.
 */

import assert from 'assert';
import http from 'http';
import { createApp } from '../src/app.js';
import { getDatabase, closeDatabase } from '../src/storage/database.js';
import { placeholderExternalProvider, SIMULATION_SCENARIOS } from '../src/providers/placeholderExternalProvider.js';

console.log('====================================================');
console.log('RUNNING END-TO-END INTEGRATION TEST (Section 58)');
console.log('====================================================\n');

let testsPassed = 0;
getDatabase(':memory:');

const app = createApp();
const server = http.createServer(app);

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}/api/v1`;

try {
  // Set MTR-003 to Bearing Fault Simulation scenario
  placeholderExternalProvider.setMotorScenario('MTR-003', SIMULATION_SCENARIOS.BEARING_SIMULATED);

  // 1. Generate realistic synthetic payload
  const generatedPayload = placeholderExternalProvider.generatePayload('MTR-003');
  assert.strictEqual(generatedPayload.motorId, 'MTR-003');
  assert.strictEqual(generatedPayload.sourceType, 'SYNTHETIC');
  assert(generatedPayload.vibration.crestFactor > 3.0, 'Bearing simulation should produce elevated crest factor');
  console.log('[PASS] Step 1: Synthetic Provider generates realistic payload for MTR-003');
  testsPassed++;

  // 2. Submit to Ingestion API
  const ingestRes = await fetch(`${baseUrl}/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(generatedPayload)
  });
  const ingestJson = await ingestRes.json();
  assert.strictEqual(ingestRes.status, 201);
  assert.strictEqual(ingestJson.success, true);
  assert.strictEqual(ingestJson.data.telemetry.motorId, 'MTR-003');
  console.log('[PASS] Step 2: Telemetry Ingestion API validates, normalizes & stores in database');
  testsPassed++;

  // 3. Verify Health Assessment & Diagnostic Engine Output in Ingestion Response
  const diagOutput = ingestJson.data.diagnostics;
  assert.strictEqual(diagOutput.motorId, 'MTR-003');
  assert.strictEqual(diagOutput.affectedSection, 'BEARING');
  assert(diagOutput.faultType.includes('Bearing'));
  assert(diagOutput.evidence.length >= 1);
  console.log('[PASS] Step 3: Health assessment & AI diagnostics accurately flag Bearing condition with evidence');
  testsPassed++;

  // 4. Verify Latest Telemetry API reflects the new state
  const latestRes = await fetch(`${baseUrl}/motors/MTR-003/latest`);
  const latestJson = await latestRes.json();
  assert.strictEqual(latestRes.status, 200);
  assert.strictEqual(latestJson.data.latest.motorId, 'MTR-003');
  assert.strictEqual(latestJson.data.latest.sourceType, 'SYNTHETIC');
  console.log('[PASS] Step 4: GET /api/v1/motors/MTR-003/latest returns stored database snapshot');
  testsPassed++;

  // 5. Verify Diagnostics API delivers Frontend-compatible Explainability
  const diagRes = await fetch(`${baseUrl}/motors/MTR-003/diagnostics`);
  const diagJson = await diagRes.json();
  assert.strictEqual(diagRes.status, 200);
  const diag = diagJson.data.currentDiagnosis;
  assert.strictEqual(diag.motorId, 'MTR-003');
  assert.strictEqual(diag.affectedSection, 'BEARING');
  assert(diag.componentAssessment.BEARING.status === 'FAULT');
  assert(diag.explanation.modelDisclaimer != null);
  console.log('[PASS] Step 5: Diagnostics endpoint delivers complete explainability trace & component matrix');
  testsPassed++;

  // 6. Verify Asset Telemetry Isolation (MTR-001 is unaffected by MTR-003's telemetry)
  const m1Res = await fetch(`${baseUrl}/motors/MTR-001/latest`);
  const m1Json = await m1Res.json();
  if (m1Json.data.latest) {
    assert.strictEqual(m1Json.data.latest.motorId, 'MTR-001');
    assert.notStrictEqual(m1Json.data.latest.motorId, 'MTR-003');
  }
  console.log('[PASS] Step 6: Multi-motor telemetry isolation verified (MTR-001 isolated from MTR-003)');
  testsPassed++;

} catch (err) {
  console.error('[FAIL] End-to-end integration test failed:', err);
  server.close();
  closeDatabase();
  process.exit(1);
}

await new Promise((resolve) => server.close(resolve));
closeDatabase();

console.log('\n====================================================');
console.log(`END-TO-END INTEGRATION TESTS PASSED: ${testsPassed} / 6`);
console.log('====================================================\n');
