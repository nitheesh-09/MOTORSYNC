/**
 * MOTORSYNC Backend — Telemetry Repository
 * 
 * Data access abstraction for motor telemetry streams.
 * Supports windowing, limit queries, and parsing of JSON fields.
 */

import { getDatabase } from '../storage/database.js';

export class TelemetryRepository {
  constructor(db = null) {
    this._customDb = db;
  }

  get db() {
    return this._customDb || getDatabase();
  }

  _hydrate(row) {
    if (!row) return null;
    return {
      id: row.id,
      motorId: row.motorId,
      timestamp: row.timestamp,
      sourceType: row.sourceType,
      electrical: row.electrical ? JSON.parse(row.electrical) : null,
      thermal: row.thermal ? JSON.parse(row.thermal) : null,
      vibration: row.vibration ? JSON.parse(row.vibration) : null,
      rpm: row.rpm,
      runningFrequency: row.runningFrequency,
      rawData: row.rawData ? JSON.parse(row.rawData) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      provenance: row.provenance ? JSON.parse(row.provenance) : null,
      quality: row.quality ? JSON.parse(row.quality) : null,
      createdAt: row.createdAt
    };
  }

  save(record) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO telemetry (
        motorId, timestamp, sourceType, electrical, thermal, vibration, 
        rpm, runningFrequency, rawData, metadata, provenance, quality, createdAt
      ) VALUES (
        @motorId, @timestamp, @sourceType, @electrical, @thermal, @vibration, 
        @rpm, @runningFrequency, @rawData, @metadata, @provenance, @quality, @createdAt
      )
    `);

    const result = stmt.run({
      motorId: record.motorId,
      timestamp: record.timestamp || now,
      sourceType: record.sourceType || 'ESP32',
      electrical: record.electrical ? JSON.stringify(record.electrical) : null,
      thermal: record.thermal ? JSON.stringify(record.thermal) : null,
      vibration: record.vibration ? JSON.stringify(record.vibration) : null,
      rpm: record.rpm != null ? Number(record.rpm) : null,
      runningFrequency: record.runningFrequency != null ? Number(record.runningFrequency) : null,
      rawData: record.rawData ? JSON.stringify(record.rawData) : null,
      metadata: record.metadata ? JSON.stringify(record.metadata) : null,
      provenance: record.provenance ? JSON.stringify(record.provenance) : null,
      quality: record.quality ? JSON.stringify(record.quality) : null,
      createdAt: now
    });

    return { id: result.lastInsertRowid, ...record, createdAt: now };
  }

  findLatestByMotorId(motorId, sourceType = null) {
    if (sourceType) {
      const row = this.db.prepare('SELECT * FROM telemetry WHERE motorId = ? AND sourceType = ? ORDER BY timestamp DESC, id DESC LIMIT 1').get(motorId, sourceType);
      return this._hydrate(row);
    }

    // Prioritize real hardware ESP32 records over older synthetic records (Task 4)
    const espRow = this.db.prepare("SELECT * FROM telemetry WHERE motorId = ? AND sourceType = 'ESP32' ORDER BY timestamp DESC, id DESC LIMIT 1").get(motorId);
    if (espRow) {
      return this._hydrate(espRow);
    }

    const row = this.db.prepare('SELECT * FROM telemetry WHERE motorId = ? ORDER BY timestamp DESC, id DESC LIMIT 1').get(motorId);
    return this._hydrate(row);
  }

  findByMotorId(motorId, options = {}) {
    const limit = Math.min(Math.max(parseInt(options.limit || '100', 10), 1), 1000);
    const offset = Math.max(parseInt(options.offset || '0', 10), 0);
    const sourceType = options.sourceType;

    let query = 'SELECT * FROM telemetry WHERE motorId = ?';
    const params = [motorId];

    if (sourceType) {
      query += ' AND sourceType = ?';
      params.push(sourceType);
    }

    if (options.startDate) {
      query += ' AND timestamp >= ?';
      params.push(options.startDate);
    }

    if (options.endDate) {
      query += ' AND timestamp <= ?';
      params.push(options.endDate);
    }

    query += ' ORDER BY timestamp DESC, id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = this.db.prepare(query).all(...params);
    return rows.map(r => this._hydrate(r));
  }

  countByMotorId(motorId, sourceType = null) {
    if (sourceType) {
      return this.db.prepare('SELECT COUNT(*) as count FROM telemetry WHERE motorId = ? AND sourceType = ?').get(motorId, sourceType).count;
    }
    return this.db.prepare('SELECT COUNT(*) as count FROM telemetry WHERE motorId = ?').get(motorId).count;
  }
}

export const telemetryRepository = new TelemetryRepository();
