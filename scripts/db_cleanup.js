import Database from 'better-sqlite3';

const db = new Database('./data/motorsync.db');

console.log('=== EXECUTING DATABASE CLEANUP & RESET FOR REAL HARDWARE MODE ===');

// 1. Remove non-ESP32 records for MTR-001 from telemetry table
const delTelem = db.prepare("DELETE FROM telemetry WHERE motorId = 'MTR-001' AND sourceType != 'ESP32'").run();
console.log(`Deleted ${delTelem.changes} non-ESP32 records from telemetry for MTR-001.`);

// 2. Reset MTR-001 baseline to INSUFFICIENT_REAL_DATA per Section 6
const updateBaseline = db.prepare(`
  UPDATE baselines 
  SET 
    status = 'INSUFFICIENT_REAL_DATA',
    establishedDate = NULL,
    normalTemperature = NULL,
    normalVibrationRms = NULL,
    normalCurrentRms = NULL,
    normalVoltageRms = NULL,
    nominal1XFreq = NULL,
    normalCrestFactor = NULL,
    normalHarmonicDistortion = NULL,
    metadata = '{"notes":"Baseline reset: awaiting sufficient healthy commissioning data from real ESP32 hardware"}',
    updatedAt = datetime('now')
  WHERE motorId = 'MTR-001'
`).run();
console.log(`Updated MTR-001 baseline (changes: ${updateBaseline.changes}) to INSUFFICIENT_REAL_DATA.`);

// 3. Ensure data_sources reflects ESP32 as active live source and SYNTHETIC as DISABLED
db.prepare("UPDATE data_sources SET status = 'DISABLED' WHERE type = 'SYNTHETIC'").run();
db.prepare("UPDATE data_sources SET status = 'ACTIVE' WHERE type = 'ESP32'").run();
console.log('Updated data_sources statuses.');

// 4. Verify post-cleanup state
const rawEspCount = db.prepare("SELECT COUNT(*) as c FROM raw_telemetry WHERE sourceType = 'ESP32'").get().c;
const telemEspCount = db.prepare("SELECT COUNT(*) as c FROM telemetry WHERE sourceType = 'ESP32'").get().c;
const telemNonEspCount = db.prepare("SELECT COUNT(*) as c FROM telemetry WHERE sourceType != 'ESP32'").get().c;
const synthCount = db.prepare("SELECT COUNT(*) as c FROM telemetry WHERE sourceType = 'SYNTHETIC'").get().c;
const baselineMtr1 = db.prepare("SELECT * FROM baselines WHERE motorId = 'MTR-001'").get();

console.log('\n--- Post Cleanup Verification ---');
console.log('Raw ESP32 records in DB:', rawEspCount);
console.log('Processed ESP32 records in DB:', telemEspCount);
console.log('Non-ESP32 records in telemetry:', telemNonEspCount);
console.log('Synthetic records in telemetry:', synthCount);
console.log('MTR-001 Baseline:', baselineMtr1);
