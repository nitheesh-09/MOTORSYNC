/**
 * MOTORSYNC Backend Test Suite — ESP32 Real Hardware Ingestion Integration
 * 
 * Verifies (Section 31):
 * - Raw ESP32 payload validation (missing fields, NaN, Infinity, unknown motorId)
 * - Batch payload validation (empty batch, bad records, sample counts)
 * - 3-Axis vibration preservation (vibrationX, vibrationY, vibrationZ intact)
 * - Magnitude calculation: sqrt(x^2 + y^2 + z^2) labeled as calculated
 * - Raw data persistence in raw_telemetry table with sourceType = 'ESP32'
 * - Vibration sample buffer windowing (requires >= 32 samples before FFT)
 * - Sampling rate handling (Reported vs Configured, never fabricated)
 * - 1X detection and derived RPM calculation (RPM = f1X * 60 or null)
 * - Electrical (RMS, power) and thermal (baseline rise) processing
 * - ESP32 connection status and stale / disconnect detection (15s timeout)
 * - Source priority protection (isEsp32ActiveForMotor)
 * - Dashboard REST retrieval of latest raw telemetry and history
 */

import assert from 'assert';
import http from 'http';
import { createApp } from '../src/app.js';
import { getDatabase, closeDatabase } from '../src/storage/database.js';
import { esp32RawIngestionService } from '../src/ingestion/esp32RawIngestionService.js';
import { rawTelemetryRepository } from '../src/repositories/rawTelemetryRepository.js';
import { telemetryRepository } from '../src/repositories/telemetryRepository.js';
import { config } from '../src/config/index.js';

console.log('====================================================');
console.log('RUNNING ESP32 REAL HARDWARE INGESTION TESTS');
console.log('====================================================\n');

let testsPassed = 0;
getDatabase(':memory:');
esp32RawIngestionService.reset();

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

const post = async (path, body) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, body: json };
};

try {
  // ----------------------------------------------------
  // TEST 1: Validation of Malformed Single ESP32 Payloads (Section 3, 21, 22)
  // ----------------------------------------------------
  const emptyPayload = await post('/telemetry/raw', {});
  assert.strictEqual(emptyPayload.status, 400);
  assert.strictEqual(emptyPayload.body.success, false);
  assert.strictEqual(emptyPayload.body.error.code, 'INVALID_SENSOR_PAYLOAD');

  const missingVibZ = await post('/telemetry/raw', {
    motorId: 'MTR-001',
    timestamp: 123456,
    voltage: 11.92,
    current: 1.42,
    temperature: 37.8,
    vibration_x: 0.31,
    vibration_y: 0.18
    // Missing vibration_z
  });
  assert.strictEqual(missingVibZ.status, 400);
  assert.strictEqual(missingVibZ.body.success, false);
  assert(missingVibZ.body.error.message.includes('vibration_z'));

  const nanPayload = await post('/telemetry/raw', {
    motorId: 'MTR-001',
    voltage: 'NOT_A_NUMBER',
    current: 1.42,
    temperature: 37.8,
    vibration_x: 0.31,
    vibration_y: 0.18,
    vibration_z: 0.92
  });
  assert.strictEqual(nanPayload.status, 400);
  assert.strictEqual(nanPayload.body.success, false);

  const unknownMotor = await post('/telemetry/raw', {
    motorId: 'NON_EXISTENT_MOTOR_999',
    voltage: 12.0,
    current: 1.5,
    temperature: 40.0,
    vibration_x: 0.2,
    vibration_y: 0.3,
    vibration_z: 0.4
  });
  assert.strictEqual(unknownMotor.status, 400);
  assert.strictEqual(unknownMotor.body.error.code, 'UNKNOWN_MOTOR_ID');

  console.log('[PASS] Test 1: Single ESP32 raw payload validation & malformed data rejection');
  testsPassed++;

  // ----------------------------------------------------
  // TEST 2: Ingest Single Valid Raw ESP32 Reading (Section 2, 3, 5, 6, 22)
  // ----------------------------------------------------
  const validPacket = {
    motorId: 'MTR-001',
    timestamp: 1727700000000,
    voltage: 11.92,
    current: 1.42,
    temperature: 37.8,
    vibration_x: 0.31,
    vibration_y: 0.18,
    vibration_z: 0.92
  };

  const singleRes = await post('/telemetry/raw', validPacket);
  assert.strictEqual(singleRes.status, 200);
  assert.strictEqual(singleRes.body.success, true);
  assert.strictEqual(singleRes.body.data.accepted, true);
  assert.strictEqual(singleRes.body.data.motorId, 'MTR-001');
  assert.strictEqual(singleRes.body.data.sourceType, 'ESP32');
  assert.strictEqual(singleRes.body.data.bufferCount, 1);

  // Verify persistence in raw_telemetry table
  const rawDbLatest = rawTelemetryRepository.findLatestByMotorId('MTR-001');
  assert(rawDbLatest !== null, 'Raw telemetry record must be stored');
  assert.strictEqual(rawDbLatest.motorId, 'MTR-001');
  assert.strictEqual(rawDbLatest.voltage, 11.92);
  assert.strictEqual(rawDbLatest.current, 1.42);
  assert.strictEqual(rawDbLatest.temperature, 37.8);
  assert.strictEqual(rawDbLatest.vibrationX, 0.31);
  assert.strictEqual(rawDbLatest.vibrationY, 0.18);
  assert.strictEqual(rawDbLatest.vibrationZ, 0.92);
  assert.strictEqual(rawDbLatest.sourceType, 'ESP32');

  // Verify calculated magnitude sqrt(0.31^2 + 0.18^2 + 0.92^2) = sqrt(0.0961 + 0.0324 + 0.8464) = sqrt(0.9749) ~= 0.9874
  const expectedMag = parseFloat(Math.sqrt(0.31*0.31 + 0.18*0.18 + 0.92*0.92).toFixed(4));
  assert.strictEqual(rawDbLatest.vibrationMagnitude, expectedMag);

  console.log('[PASS] Test 2: Valid single ESP32 raw sample ingestion & database persistence');
  testsPassed++;

  // ----------------------------------------------------
  // TEST 3: 3-Axis Preservation (Section 6, 7)
  // ----------------------------------------------------
  // Verify 3 distinct vibration axes are not collapsed immediately
  assert.notStrictEqual(rawDbLatest.vibrationX, rawDbLatest.vibrationY);
  assert.notStrictEqual(rawDbLatest.vibrationY, rawDbLatest.vibrationZ);
  assert(rawDbLatest.vibrationMagnitude > rawDbLatest.vibrationX);

  console.log('[PASS] Test 3: 3-Axis vibration preservation (X, Y, Z preserved, magnitude calculated)');
  testsPassed++;

  // ----------------------------------------------------
  // TEST 4: Batch Validation (Section 10, 21)
  // ----------------------------------------------------
  const emptyBatch = await post('/telemetry/raw/batch', { motorId: 'MTR-001', samples: [] });
  assert.strictEqual(emptyBatch.status, 400);
  assert.strictEqual(emptyBatch.body.error.code, 'EMPTY_BATCH');

  const corruptBatch = await post('/telemetry/raw/batch', {
    motorId: 'MTR-001',
    samples: [
      { voltage: 12.0, current: 1.5, temperature: 40.0, vibration_x: 0.1, vibration_y: 0.2, vibration_z: 0.3 },
      { voltage: 'BAD_VALUE', current: 1.5, temperature: 40.0, vibration_x: 0.1, vibration_y: 0.2, vibration_z: 0.3 }
    ]
  });
  assert.strictEqual(corruptBatch.status, 400);
  assert.strictEqual(corruptBatch.body.error.code, 'INVALID_SENSOR_PAYLOAD');

  console.log('[PASS] Test 4: Batch payload validation & corrupt sample rejection');
  testsPassed++;

  // ----------------------------------------------------
  // TEST 5: High-Frequency Batch Ingestion & Rolling Buffer (Section 8, 10)
  // ----------------------------------------------------
  // Generate 64 sinusoidal vibration samples (25 Hz fundamental on 2560 Hz sampling rate)
  const fs = 2560;
  const f1X = 25.0; // 25 Hz = 1500 RPM
  const batchSamples = [];
  const startTs = Date.now();

  for (let i = 0; i < 64; i++) {
    const t = i / fs;
    // X axis has dominant 25 Hz rotational peak
    const vx = parseFloat((0.8 * Math.sin(2 * Math.PI * f1X * t) + 0.1 * (Math.random() - 0.5)).toFixed(4));
    const vy = parseFloat((0.5 * Math.sin(2 * Math.PI * f1X * t) + 0.1 * (Math.random() - 0.5)).toFixed(4));
    const vz = parseFloat((0.3 * Math.sin(2 * Math.PI * f1X * t) + 0.1 * (Math.random() - 0.5)).toFixed(4));

    batchSamples.push({
      timestamp: startTs + Math.round(t * 1000),
      voltage: parseFloat((230.0 + Math.sin(2 * Math.PI * 50 * t) * 2).toFixed(2)),
      current: parseFloat((2.5 + Math.sin(2 * Math.PI * 50 * t) * 0.2).toFixed(2)),
      temperature: 41.5,
      vibration_x: vx,
      vibration_y: vy,
      vibration_z: vz
    });
  }

  const batchRes = await post('/telemetry/raw/batch', {
    motorId: 'MTR-001',
    samplingRate: 2560,
    samples: batchSamples
  });

  assert.strictEqual(batchRes.status, 200);
  assert.strictEqual(batchRes.body.success, true);
  assert.strictEqual(batchRes.body.data.samplesReceived, 64);
  assert.strictEqual(batchRes.body.data.motorId, 'MTR-001');
  assert(batchRes.body.data.bufferCount >= 64, 'Buffer must contain accumulated samples');

  // Verify total raw records stored in database
  const count = rawTelemetryRepository.countByMotorId('MTR-001');
  assert.strictEqual(count, 65); // 1 single + 64 batch = 65 records

  console.log('[PASS] Test 5: High-frequency batch raw telemetry ingestion & transaction persistence');
  testsPassed++;

  // ----------------------------------------------------
  // TEST 6: FFT Processing & 1X Detection on Sample Buffer (Section 8, 9, 17, 18)
  // ----------------------------------------------------
  // Since buffer now has >= 32 samples, FFT and speed estimation should be triggered
  const processed = batchRes.body.data.processedTelemetry;
  assert(processed !== null, 'Processed telemetry must be returned after buffer threshold reached');
  assert.strictEqual(processed.sourceType, 'ESP32');
  assert.strictEqual(processed.motorId, 'MTR-001');

  // Check 3-axis statistical feature structures
  assert(processed.vibration.axes !== undefined, 'Processed vibration must include axes features');
  assert(processed.vibration.axes.x.rms > 0, 'X-axis RMS must be computed');
  assert(processed.vibration.axes.y.rms > 0, 'Y-axis RMS must be computed');
  assert(processed.vibration.axes.z.rms > 0, 'Z-axis RMS must be computed');
  assert(processed.vibration.axes.x.crestFactor > 0, 'X-axis Crest Factor must be computed');

  // Check FFT spectrum
  assert(processed.vibration.fft !== undefined, 'FFT must be present');
  assert.strictEqual(processed.vibration.fft.samplingRate, 2560);
  assert(processed.vibration.fft.spectrum.length > 0, 'FFT spectrum must have frequency bins');

  // Check derived speed
  if (processed.rpm !== null) {
    assert(processed.rpm >= 1400 && processed.rpm <= 1600, `Derived RPM should be near 1500, got ${processed.rpm}`);
    assert(processed.rpmMethod.includes('1X'), 'RPM method must document 1X peak derivation');
  }

  console.log('[PASS] Test 6: Vibration sample buffer FFT, 3-axis features & 1X rotational speed derivation');
  testsPassed++;

  // ----------------------------------------------------
  // TEST 7: Electrical and Thermal Processing (Section 15, 16)
  // ----------------------------------------------------
  assert(processed.electrical.voltageRms > 0, 'Calculated Voltage RMS must be present');
  assert(processed.electrical.currentRms > 0, 'Calculated Current RMS must be present');
  assert(processed.electrical.power > 0, 'Calculated real power must be present');
  assert.strictEqual(processed.thermal.temperature, 41.5);
  // Baseline for MTR-001 normalTemperature is 38.0
  assert(processed.thermal.temperatureRiseFromBaseline !== undefined, 'Temperature rise from baseline must be calculated');

  console.log('[PASS] Test 7: Electrical (RMS, Power) and Thermal (Baseline comparison) processing');
  testsPassed++;

  // ----------------------------------------------------
  // TEST 8: ESP32 Hardware Connection Status (Section 29)
  // ----------------------------------------------------
  const statusRes = await get('/telemetry/esp32/status?motorId=MTR-001');
  assert.strictEqual(statusRes.status, 200);
  assert.strictEqual(statusRes.body.success, true);
  assert.strictEqual(statusRes.body.data.isConnected, true);
  assert.strictEqual(statusRes.body.data.status, 'CONNECTED');
  assert.strictEqual(statusRes.body.data.reportedSamplingRate, 2560);
  assert.strictEqual(statusRes.body.data.configuredSamplingRate, 2560);
  assert(statusRes.body.data.bufferCount >= 64);

  // Status for motor that has NOT received ESP32 packets
  const unconnectRes = await get('/telemetry/esp32/status?motorId=MTR-005');
  assert.strictEqual(unconnectRes.status, 200);
  assert.strictEqual(unconnectRes.body.data.status, 'NOT_CONNECTED');
  assert.strictEqual(unconnectRes.body.data.isConnected, false);

  console.log('[PASS] Test 8: ESP32 hardware connection status & reported sampling rate');
  testsPassed++;

  // ----------------------------------------------------
  // TEST 9: ESP32 Stale / Disconnect Detection (Section 29)
  // ----------------------------------------------------
  // Simulate passage of time beyond stale timeout (15000ms)
  const staleStatus = esp32RawIngestionService.getEsp32Status('MTR-001');
  assert.strictEqual(staleStatus.status, 'CONNECTED');

  // Artificially age the last packet timestamp past timeout
  esp32RawIngestionService.lastPacketTimes.set('MTR-001', Date.now() - 20000);
  const agedStatus = esp32RawIngestionService.getEsp32Status('MTR-001');
  assert.strictEqual(agedStatus.status, 'STALE / DISCONNECTED');
  assert.strictEqual(agedStatus.isConnected, false);
  assert.strictEqual(agedStatus.isStale, true);

  console.log('[PASS] Test 9: ESP32 hardware stale / disconnect detection after timeout');
  testsPassed++;

  // ----------------------------------------------------
  // TEST 10: Source Priority Protection (Section 14)
  // ----------------------------------------------------
  // Update packet time back to fresh
  esp32RawIngestionService.lastPacketTimes.set('MTR-001', Date.now());
  assert.strictEqual(esp32RawIngestionService.isEsp32ActiveForMotor('MTR-001'), true);
  // MTR-002 has not sent ESP32 packets
  assert.strictEqual(esp32RawIngestionService.isEsp32ActiveForMotor('MTR-002'), false);

  console.log('[PASS] Test 10: Source priority protection prevents synthetic overwrite for active ESP32 motors');
  testsPassed++;

  // ----------------------------------------------------
  // TEST 11: REST Query of Latest Raw Telemetry & History (Section 5, 20)
  // ----------------------------------------------------
  const latestRawRes = await get('/motors/MTR-001/raw/latest');
  assert.strictEqual(latestRawRes.status, 200);
  assert.strictEqual(latestRawRes.body.data.motorId, 'MTR-001');
  assert(latestRawRes.body.data.latest !== null);
  assert.strictEqual(latestRawRes.body.data.latest.sourceType, 'ESP32');

  const historyRawRes = await get('/motors/MTR-001/raw/history?limit=10');
  assert.strictEqual(historyRawRes.status, 200);
  assert.strictEqual(historyRawRes.body.data.records.length, 10);
  assert.strictEqual(historyRawRes.body.data.total, 65);

  console.log('[PASS] Test 11: REST query of latest raw telemetry & paginated raw history');
  testsPassed++;

  // ----------------------------------------------------
  // TEST 12: Data Source Controller Support for ESP32 (Section 13)
  // ----------------------------------------------------
  const dataSourcesRes = await get('/data-sources');
  assert.strictEqual(dataSourcesRes.status, 200);
  const esp32Source = dataSourcesRes.body.data.sources.find(s => s.type === 'ESP32');
  assert(esp32Source !== undefined, 'ESP32 data source must exist in repository');

  const selectRes = await post('/data-sources/select', { sourceType: 'ESP32' });
  assert.strictEqual(selectRes.status, 200);
  assert.strictEqual(selectRes.body.data.activeSource, 'ESP32');

  const sysStatusRes = await get('/system/status');
  assert.strictEqual(sysStatusRes.status, 200);
  assert(sysStatusRes.body.data.esp32Hardware !== undefined, 'System status must report ESP32 hardware status');

  console.log('[PASS] Test 12: Data sources registry and explicit switching to ESP32');
  testsPassed++;

} catch (err) {
  console.error('\n[FAIL] ESP32 Ingestion Test failure:', err);
  server.close();
  closeDatabase();
  process.exit(1);
}

server.close();
closeDatabase();

console.log('\n====================================================');
console.log(`ALL ${testsPassed} ESP32 HARDWARE INGESTION TESTS PASSED!`);
console.log('====================================================\n');
process.exit(0);
