import http from 'http';
import { createApp } from './src/app.js';
import { getDatabase, closeDatabase } from './src/storage/database.js';

const app = createApp();
const server = http.createServer(app);

await new Promise((resolve) => server.listen(3002, '127.0.0.1', resolve));

const get = async (path) => {
  const res = await fetch(`http://127.0.0.1:3002/api/v1${path}`);
  return res.json();
};

console.log('--- Testing /system/status ---');
const sysStatus = await get('/system/status');
console.log('System Status:', JSON.stringify(sysStatus, null, 2));

console.log('\n--- Testing /motors/MTR-001/latest ---');
const latest = await get('/motors/MTR-001/latest');
console.log('MTR-001 Latest:', JSON.stringify(latest, null, 2));

console.log('\n--- Testing /motors/MTR-001/raw/latest ---');
const rawLatest = await get('/motors/MTR-001/raw/latest');
console.log('MTR-001 Raw Latest:', JSON.stringify(rawLatest, null, 2));

console.log('\n--- Testing /motors/MTR-001/raw/history?limit=5 ---');
const rawHist = await get('/motors/MTR-001/raw/history?limit=5');
console.log('MTR-001 Raw History Count:', rawHist.data?.records?.length, 'Total:', rawHist.data?.total);

console.log('\n--- Testing /telemetry/esp32/status?motorId=MTR-001 ---');
const espStatus = await get('/telemetry/esp32/status?motorId=MTR-001');
console.log('ESP32 Status:', JSON.stringify(espStatus, null, 2));

console.log('\n--- Testing /motors/MTR-002/latest (no ESP32 data) ---');
const mtr2Latest = await get('/motors/MTR-002/latest');
console.log('MTR-002 Latest:', JSON.stringify(mtr2Latest, null, 2));

server.close();
closeDatabase();
