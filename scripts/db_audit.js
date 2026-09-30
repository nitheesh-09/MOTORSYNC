import Database from 'better-sqlite3';

const db = new Database('./data/motorsync.db');

console.log('=== DATABASE AUDIT REPORT ===');
const rawEsp32 = db.prepare('SELECT COUNT(*) as c FROM raw_telemetry WHERE sourceType = ?').get('ESP32');
const rawOther = db.prepare('SELECT sourceType, COUNT(*) as c FROM raw_telemetry WHERE sourceType != ? GROUP BY sourceType').all('ESP32');
console.log('1. Raw Telemetry ESP32 records:', rawEsp32.c);
console.log('   Raw Telemetry non-ESP32 records:', rawOther.length > 0 ? rawOther : 0);

const telemSources = db.prepare('SELECT sourceType, COUNT(*) as c FROM telemetry GROUP BY sourceType').all();
console.log('2. Processed Telemetry by source:', telemSources);

const synthTelem = db.prepare("SELECT COUNT(*) as c FROM telemetry WHERE sourceType = 'SYNTHETIC'").get().c;
console.log('   Synthetic records remaining in telemetry:', synthTelem);

const analysesSources = db.prepare('SELECT sourceType, COUNT(*) as c FROM analyses GROUP BY sourceType').all();
console.log('3. Analyses by source:', analysesSources);

const diags = db.prepare('SELECT id, motorId, condition, faultType, timestamp, createdAt FROM diagnostics').all();
console.log('4. Diagnostics total:', diags.length);
console.log('   Diagnostics sample:', diags);

const alerts = db.prepare('SELECT * FROM alerts').all();
console.log('5. Alerts total:', alerts.length);

const baselines = db.prepare('SELECT motorId, status, establishedDate, normalTemperature, normalVibrationRms, normalCurrentRms, normalVoltageRms, nominal1XFreq, updatedAt FROM baselines').all();
console.log('6. Baselines:', baselines);

const latestRaw = db.prepare('SELECT * FROM raw_telemetry WHERE motorId = ? ORDER BY timestamp DESC LIMIT 1').get('MTR-001');
console.log('7. Latest MTR-001 Raw Reading:', latestRaw);
