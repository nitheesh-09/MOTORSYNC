/**
 * MOTORSYNC Backend — Raw Telemetry Repository
 * 
 * Master Specification Section 5 & 20:
 * Dedicated persistence layer for raw ESP32 transducer readings.
 * Preserves exact raw X, Y, Z vibration, voltage, current, and temperature.
 * Never overwrites raw data with calculated values.
 */

import { getDatabase } from '../storage/database.js';

export class RawTelemetryRepository {
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
      voltage: row.voltage,
      current: row.current,
      temperature: row.temperature,
      vibrationX: row.vibrationX,
      vibrationY: row.vibrationY,
      vibrationZ: row.vibrationZ,
      vibrationMagnitude: row.vibrationMagnitude,
      sourceType: row.sourceType,
      quality: row.quality ? JSON.parse(row.quality) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      createdAt: row.createdAt
    };
  }

  /**
   * Save a single raw telemetry sample.
   */
  save(sample) {
    const now = new Date().toISOString();
    const mag = sample.vibrationMagnitude != null
      ? sample.vibrationMagnitude
      : Math.sqrt(
          Math.pow(sample.vibrationX || 0, 2) +
          Math.pow(sample.vibrationY || 0, 2) +
          Math.pow(sample.vibrationZ || 0, 2)
        );

    const stmt = this.db.prepare(`
      INSERT INTO raw_telemetry (
        motorId, timestamp, voltage, current, temperature,
        vibrationX, vibrationY, vibrationZ, vibrationMagnitude,
        sourceType, quality, metadata, createdAt
      ) VALUES (
        @motorId, @timestamp, @voltage, @current, @temperature,
        @vibrationX, @vibrationY, @vibrationZ, @vibrationMagnitude,
        @sourceType, @quality, @metadata, @createdAt
      )
    `);

    const result = stmt.run({
      motorId: sample.motorId,
      timestamp: sample.timestamp,
      voltage: sample.voltage != null ? Number(sample.voltage) : null,
      current: sample.current != null ? Number(sample.current) : null,
      temperature: sample.temperature != null ? Number(sample.temperature) : null,
      vibrationX: sample.vibrationX != null ? Number(sample.vibrationX) : null,
      vibrationY: sample.vibrationY != null ? Number(sample.vibrationY) : null,
      vibrationZ: sample.vibrationZ != null ? Number(sample.vibrationZ) : null,
      vibrationMagnitude: parseFloat(mag.toFixed(4)),
      sourceType: sample.sourceType || 'ESP32',
      quality: sample.quality ? JSON.stringify(sample.quality) : null,
      metadata: sample.metadata ? JSON.stringify(sample.metadata) : null,
      createdAt: now
    });

    return {
      id: result.lastInsertRowid,
      ...sample,
      vibrationMagnitude: parseFloat(mag.toFixed(4)),
      createdAt: now
    };
  }

  /**
   * Save a batch of raw samples within an atomic transaction.
   */
  saveBatch(samples) {
    if (!Array.isArray(samples) || samples.length === 0) return [];

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO raw_telemetry (
        motorId, timestamp, voltage, current, temperature,
        vibrationX, vibrationY, vibrationZ, vibrationMagnitude,
        sourceType, quality, metadata, createdAt
      ) VALUES (
        @motorId, @timestamp, @voltage, @current, @temperature,
        @vibrationX, @vibrationY, @vibrationZ, @vibrationMagnitude,
        @sourceType, @quality, @metadata, @createdAt
      )
    `);

    const saved = [];
    const tx = this.db.transaction((batch) => {
      for (const s of batch) {
        const mag = s.vibrationMagnitude != null
          ? s.vibrationMagnitude
          : Math.sqrt(
              Math.pow(s.vibrationX || 0, 2) +
              Math.pow(s.vibrationY || 0, 2) +
              Math.pow(s.vibrationZ || 0, 2)
            );

        const res = stmt.run({
          motorId: s.motorId,
          timestamp: s.timestamp,
          voltage: s.voltage != null ? Number(s.voltage) : null,
          current: s.current != null ? Number(s.current) : null,
          temperature: s.temperature != null ? Number(s.temperature) : null,
          vibrationX: s.vibrationX != null ? Number(s.vibrationX) : null,
          vibrationY: s.vibrationY != null ? Number(s.vibrationY) : null,
          vibrationZ: s.vibrationZ != null ? Number(s.vibrationZ) : null,
          vibrationMagnitude: parseFloat(mag.toFixed(4)),
          sourceType: s.sourceType || 'ESP32',
          quality: s.quality ? JSON.stringify(s.quality) : null,
          metadata: s.metadata ? JSON.stringify(s.metadata) : null,
          createdAt: now
        });
        saved.push({ id: res.lastInsertRowid, ...s, vibrationMagnitude: parseFloat(mag.toFixed(4)), createdAt: now });
      }
    });

    tx(samples);
    return saved;
  }

  findByMotorId(motorId, options = {}) {
    const limit = typeof options === 'number' ? options : parseInt(options?.limit || 100, 10);
    const offset = typeof options === 'object' && options?.offset ? parseInt(options.offset, 10) : 0;
    
    let query = `
      SELECT * FROM raw_telemetry
      WHERE motorId = ?
    `;
    const params = [motorId];

    if (typeof options === 'object' && options?.startDate) {
      query += ` AND timestamp >= ?`;
      params.push(Number(options.startDate));
    }
    if (typeof options === 'object' && options?.endDate) {
      query += ` AND timestamp <= ?`;
      params.push(Number(options.endDate));
    }

    query += ` ORDER BY timestamp DESC, id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = this.db.prepare(query).all(...params);
    return rows.map(r => this._hydrate(r));
  }

  findLatestByMotorId(motorId) {
    const row = this.db.prepare(`
      SELECT * FROM raw_telemetry
      WHERE motorId = ?
      ORDER BY timestamp DESC, id DESC
      LIMIT 1
    `).get(motorId);

    return this._hydrate(row);
  }

  countByMotorId(motorId) {
    return this.db.prepare('SELECT COUNT(*) as count FROM raw_telemetry WHERE motorId = ?').get(motorId).count;
  }
}

export const rawTelemetryRepository = new RawTelemetryRepository();
