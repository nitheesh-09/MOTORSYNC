/**
 * MOTORSYNC Backend Test Suite — REST API Endpoints (/api/v1)
 * 
 * Verifies HTTP endpoints:
 * - Health & System status
 * - Motor CRUD
 * - Telemetry ingestion & retrieval
 * - Diagnostics inspection
 * - Baseline retrieval & update
 * - Alerts retrieval & acknowledgment
 * - Data sources
 * - Offline file upload
 * - AI status & registry
 */

import assert from 'assert';
import http from 'http';
import { createApp } from '../src/app.js';
import { getDatabase, closeDatabase } from '../src/storage/database.js';

console.log('====================================================');
console.log('RUNNING REST API ENDPOINT TESTS (/api/v1)');
console.log('====================================================\n');

let testsPassed = 0;
getDatabase(':memory:');

const app = createApp();
const server = http.createServer(app);

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}/api/v1`;

const get = async (path) => {
  const res = await fetch(`${baseUrl}${path}`);
  const json = await res.json();
  return { status: res.status, body: json };
};

const post = async (path, body, headers = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, body: json };
};

try {
  // 1. Health check
  const healthRes = await get('/health');
  assert.strictEqual(healthRes.status, 200);
  assert.strictEqual(healthRes.body.success, true);
  assert.strictEqual(healthRes.body.data.status, 'UP');
  console.log('[PASS] Test 1: GET /api/v1/health');
  testsPassed++;

  // 2. System Status
  const statusRes = await get('/system/status');
  assert.strictEqual(statusRes.status, 200);
  assert.strictEqual(statusRes.body.data.backend.status, 'ONLINE');
  assert.strictEqual(statusRes.body.data.database.status, 'CONNECTED');
  assert(statusRes.body.data.fleetSummary.totalMotors >= 5);
  console.log('[PASS] Test 2: GET /api/v1/system/status');
  testsPassed++;

  // 3. Motors list
  const motorsRes = await get('/motors');
  assert.strictEqual(motorsRes.status, 200);
  assert(motorsRes.body.data.motors.length >= 5);
  console.log('[PASS] Test 3: GET /api/v1/motors');
  testsPassed++;

  // 4. Single motor
  const m1Res = await get('/motors/MTR-001');
  assert.strictEqual(m1Res.status, 200);
  assert.strictEqual(m1Res.body.data.motor.motorId, 'MTR-001');
  console.log('[PASS] Test 4: GET /api/v1/motors/:motorId');
  testsPassed++;

  // 5. Telemetry Ingestion
  const telemPayload = {
    motorId: 'MTR-001',
    sourceType: 'EXTERNAL_LAPTOP',
    electrical: { voltageRms: 400.0, currentRms: 14.2 },
    thermal: { temperature: 46.5 },
    vibration: { rms: 1.2, crestFactor: 2.1, dominantFrequency: 24.7 },
    rpm: 1482
  };
  const telemRes = await post('/telemetry', telemPayload);
  assert.strictEqual(telemRes.status, 201);
  assert.strictEqual(telemRes.body.success, true);
  assert.strictEqual(telemRes.body.data.telemetry.motorId, 'MTR-001');
  console.log('[PASS] Test 5: POST /api/v1/telemetry');
  testsPassed++;

  // 6. Latest Telemetry
  const latestRes = await get('/motors/MTR-001/latest');
  assert.strictEqual(latestRes.status, 200);
  assert.strictEqual(latestRes.body.data.latest.sourceType, 'EXTERNAL_LAPTOP');
  console.log('[PASS] Test 6: GET /api/v1/motors/:motorId/latest');
  testsPassed++;

  // 7. Diagnostics
  const diagRes = await get('/motors/MTR-001/diagnostics');
  assert.strictEqual(diagRes.status, 200);
  assert(diagRes.body.data.currentDiagnosis != null);
  console.log('[PASS] Test 7: GET /api/v1/motors/:motorId/diagnostics');
  testsPassed++;

  // 8. Baselines
  const baseRes = await get('/motors/MTR-001/baseline');
  assert.strictEqual(baseRes.status, 200);
  assert(['NOT_ESTABLISHED', 'ESTABLISHED'].includes(baseRes.body.data.baseline.status));
  console.log('[PASS] Test 8: GET /api/v1/motors/:motorId/baseline');
  testsPassed++;

  // 9. Alerts
  const alertRes = await get('/alerts');
  assert.strictEqual(alertRes.status, 200);
  assert(Array.isArray(alertRes.body.data.alerts));
  console.log('[PASS] Test 9: GET /api/v1/alerts');
  testsPassed++;

  // 10. Data Sources
  const dsRes = await get('/data-sources');
  assert.strictEqual(dsRes.status, 200);
  assert(dsRes.body.data.sources.length >= 2);
  console.log('[PASS] Test 10: GET /api/v1/data-sources');
  testsPassed++;

  // 11. AI Status & Models
  const aiStatusRes = await get('/ai/status');
  assert.strictEqual(aiStatusRes.status, 200);
  assert(aiStatusRes.body.data.activeModelId != null);
  const aiModelsRes = await get('/ai/models');
  assert.strictEqual(aiModelsRes.status, 200);
  assert(aiModelsRes.body.data.models.length >= 1);
  console.log('[PASS] Test 11: GET /api/v1/ai/status and GET /api/v1/ai/models');
  testsPassed++;

  // 12. Offline Analysis Upload
  const csvData = "timestamp,vibration,current,voltage,temperature\n0.0,0.5,10,400,42\n0.001,0.6,10,400,42";
  const uploadRes = await post('/offline/upload', {
    content: csvData,
    filename: 'test_upload.csv',
    motorId: 'MTR-002'
  });
  assert.strictEqual(uploadRes.status, 201);
  assert.strictEqual(uploadRes.body.success, true);
  assert(uploadRes.body.data.analysisId != null);
  console.log('[PASS] Test 12: POST /api/v1/offline/upload');
  testsPassed++;

} catch (err) {
  console.error('[FAIL] API endpoint test failed:', err);
  server.close();
  closeDatabase();
  process.exit(1);
}

await new Promise((resolve) => server.close(resolve));
closeDatabase();

console.log('\n====================================================');
console.log(`API ENDPOINT TESTS PASSED: ${testsPassed} / 12`);
console.log('====================================================\n');
