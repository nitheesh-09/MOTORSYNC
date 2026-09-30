import Database from 'better-sqlite3';

const db = new Database('./data/motorsync.db');

const rawEsp32 = db.prepare('SELECT COUNT(*) as c FROM raw_telemetry WHERE sourceType = ?').get('ESP32').c;
const procEsp32 = db.prepare('SELECT COUNT(*) as c FROM telemetry WHERE sourceType = ?').get('ESP32').c;
const synthRemaining = db.prepare("SELECT COUNT(*) as c FROM telemetry WHERE sourceType = 'SYNTHETIC'").get().c;
const rawSynth = db.prepare("SELECT COUNT(*) as c FROM raw_telemetry WHERE sourceType = 'SYNTHETIC'").get().c;
const offlineRecords = db.prepare("SELECT COUNT(*) as c FROM analyses WHERE sourceType = 'OFFLINE_FILE'").get().c;
const synthDiags = db.prepare("SELECT COUNT(*) as c FROM diagnostics WHERE condition = 'SYNTHETIC' OR faultType LIKE '%[TEST ONLY]%'").get().c;
const synthAlerts = db.prepare("SELECT COUNT(*) as c FROM alerts WHERE source LIKE '%SYNTHETIC%'").get().c;

const mtr001RawCount = db.prepare('SELECT COUNT(*) as c FROM raw_telemetry WHERE motorId = ?').get('MTR-001').c;
const mtr001ProcCount = db.prepare('SELECT COUNT(*) as c FROM telemetry WHERE motorId = ?').get('MTR-001').c;
const latestRaw = db.prepare('SELECT * FROM raw_telemetry WHERE motorId = ? ORDER BY timestamp DESC LIMIT 1').get('MTR-001');
const latestTelem = db.prepare('SELECT * FROM telemetry WHERE motorId = ? ORDER BY timestamp DESC, id DESC LIMIT 1').get('MTR-001');

console.log('--- DATABASE VERIFICATION RESULTS ---');
console.log('total raw ESP32 records:', rawEsp32);
console.log('total processed ESP32 records:', procEsp32);
console.log('total synthetic records remaining (telemetry):', synthRemaining);
console.log('total synthetic records remaining (raw_telemetry):', rawSynth);
console.log('total offline records:', offlineRecords);
console.log('total synthetic diagnostics remaining:', synthDiags);
console.log('total synthetic alerts remaining:', synthAlerts);
console.log('MTR-001 raw record count:', mtr001RawCount);
console.log('MTR-001 processed record count:', mtr001ProcCount);
console.log('latest MTR-001 raw timestamp:', latestRaw ? latestRaw.timestamp : null, '(', new Date(latestRaw.timestamp).toISOString(), ')');
console.log('latest MTR-001 processed timestamp:', latestTelem ? latestTelem.timestamp : null);
console.log('latest MTR-001 raw sourceType:', latestRaw ? latestRaw.sourceType : null);
console.log('latest MTR-001 processed sourceType:', latestTelem ? latestTelem.sourceType : null);
console.log('latest MTR-001 voltage:', latestRaw ? latestRaw.voltage : null);
console.log('latest MTR-001 current:', latestRaw ? latestRaw.current : null);
console.log('latest MTR-001 temperature:', latestRaw ? latestRaw.temperature : null);
console.log('latest MTR-001 vibration X/Y/Z:', latestRaw ? `${latestRaw.vibrationX} / ${latestRaw.vibrationY} / ${latestRaw.vibrationZ}` : null);
console.log('latest MTR-001 vibration magnitude:', latestRaw ? latestRaw.vibrationMagnitude : null);
