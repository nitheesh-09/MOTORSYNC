/**
 * MOTORSYNC Backend — Baseline Repository
 * 
 * Data access abstraction for motor-specific commissioning baselines.
 */

import { getDatabase } from '../storage/database.js';

export class BaselineRepository {
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
      status: row.status,
      establishedDate: row.establishedDate,
      normalTemperature: row.normalTemperature,
      normalVibrationRms: row.normalVibrationRms,
      normalCurrentRms: row.normalCurrentRms,
      normalVoltageRms: row.normalVoltageRms,
      nominal1XFreq: row.nominal1XFreq,
      normalCrestFactor: row.normalCrestFactor,
      normalHarmonicDistortion: row.normalHarmonicDistortion,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      updatedAt: row.updatedAt
    };
  }

  findByMotorId(motorId) {
    const row = this.db.prepare('SELECT * FROM baselines WHERE motorId = ?').get(motorId);
    return this._hydrate(row);
  }

  upsert(baselineData) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO baselines (
        motorId, status, establishedDate, normalTemperature, normalVibrationRms,
        normalCurrentRms, normalVoltageRms, nominal1XFreq, normalCrestFactor,
        normalHarmonicDistortion, metadata, updatedAt
      ) VALUES (
        @motorId, @status, @establishedDate, @normalTemperature, @normalVibrationRms,
        @normalCurrentRms, @normalVoltageRms, @nominal1XFreq, @normalCrestFactor,
        @normalHarmonicDistortion, @metadata, @updatedAt
      )
      ON CONFLICT(motorId) DO UPDATE SET
        status = excluded.status,
        establishedDate = excluded.establishedDate,
        normalTemperature = excluded.normalTemperature,
        normalVibrationRms = excluded.normalVibrationRms,
        normalCurrentRms = excluded.normalCurrentRms,
        normalVoltageRms = excluded.normalVoltageRms,
        nominal1XFreq = excluded.nominal1XFreq,
        normalCrestFactor = excluded.normalCrestFactor,
        normalHarmonicDistortion = excluded.normalHarmonicDistortion,
        metadata = excluded.metadata,
        updatedAt = excluded.updatedAt
    `);

    stmt.run({
      motorId: baselineData.motorId,
      status: baselineData.status || 'ESTABLISHED',
      establishedDate: baselineData.establishedDate || now.split('T')[0],
      normalTemperature: baselineData.normalTemperature != null ? Number(baselineData.normalTemperature) : null,
      normalVibrationRms: baselineData.normalVibrationRms != null ? Number(baselineData.normalVibrationRms) : null,
      normalCurrentRms: baselineData.normalCurrentRms != null ? Number(baselineData.normalCurrentRms) : null,
      normalVoltageRms: baselineData.normalVoltageRms != null ? Number(baselineData.normalVoltageRms) : null,
      nominal1XFreq: baselineData.nominal1XFreq != null ? Number(baselineData.nominal1XFreq) : null,
      normalCrestFactor: baselineData.normalCrestFactor != null ? Number(baselineData.normalCrestFactor) : null,
      normalHarmonicDistortion: baselineData.normalHarmonicDistortion != null ? Number(baselineData.normalHarmonicDistortion) : null,
      metadata: baselineData.metadata ? JSON.stringify(baselineData.metadata) : null,
      updatedAt: now
    });

    return this.findByMotorId(baselineData.motorId);
  }
}

export const baselineRepository = new BaselineRepository();
