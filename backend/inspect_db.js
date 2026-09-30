import Database from 'better-sqlite3';

const db = new Database('./data/motorsync.db');
console.log('Tables:', db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name));

try {
  const rawCount = db.prepare('SELECT COUNT(*) as c FROM raw_telemetry').get();
  console.log('raw_telemetry count:', rawCount.c);
  if (rawCount.c > 0) {
    const rawRows = db.prepare('SELECT * FROM raw_telemetry ORDER BY id DESC LIMIT 10').all();
    console.log('Latest raw_telemetry rows:', JSON.stringify(rawRows, null, 2));
  }
} catch (e) {
  console.log('Error inspecting raw_telemetry:', e.message);
}

try {
  const telemSources = db.prepare('SELECT sourceType, COUNT(*) as c FROM telemetry GROUP BY sourceType').all();
  console.log('telemetry by sourceType:', telemSources);
  const esp32Telem = db.prepare('SELECT id, motorId, timestamp, sourceType, electrical, thermal, vibration, rawData FROM telemetry WHERE sourceType = ? ORDER BY id DESC').all('ESP32');
  console.log('ESP32 telemetry in DB count:', esp32Telem.length);
  console.log('Latest ESP32 telemetry in DB:', JSON.stringify(esp32Telem[0], null, 2));
} catch (e) {
  console.log('Error inspecting telemetry:', e.message);
}

db.close();
