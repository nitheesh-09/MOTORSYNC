import { getDatabase } from '../backend/src/storage/database.js';

const db = getDatabase();
db.prepare(`UPDATE data_sources SET status = 'DISABLED', name = 'Synthetic Placeholder Provider (TEST ONLY - DISABLED)' WHERE sourceId = 'src-synthetic'`).run();
db.prepare(`INSERT OR REPLACE INTO data_sources (sourceId, name, type, status, lastHeartbeatAt, config) VALUES (?, ?, ?, ?, ?, ?)`).run(
  'src-esp32',
  'ESP32 Real Hardware Ingestion Adapter',
  'ESP32',
  'ACTIVE',
  new Date().toISOString(),
  JSON.stringify({ protocol: 'HTTP_REST_WIFI', endpoint: '/api/v1/telemetry/raw' })
);

console.log('Updated data_sources:', db.prepare('SELECT * FROM data_sources').all());
