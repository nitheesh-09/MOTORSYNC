/**
 * MOTORSYNC Backend — Motor Repository
 * 
 * Data access abstraction for Motors.
 */

import { getDatabase } from '../storage/database.js';

export class MotorRepository {
  constructor(db = null) {
    this._customDb = db;
  }

  get db() {
    return this._customDb || getDatabase();
  }

  findAll() {
    return this.db.prepare('SELECT * FROM motors ORDER BY motorId ASC').all();
  }

  findByMotorId(motorId) {
    return this.db.prepare('SELECT * FROM motors WHERE motorId = ?').get(motorId) || null;
  }

  create(motorData) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO motors (motorId, name, location, motorType, ratedVoltage, ratedCurrent, ratedRPM, status, installationDate, createdAt, updatedAt)
      VALUES (@motorId, @name, @location, @motorType, @ratedVoltage, @ratedCurrent, @ratedRPM, @status, @installationDate, @createdAt, @updatedAt)
    `);

    const result = stmt.run({
      motorId: motorData.motorId,
      name: motorData.name,
      location: motorData.location,
      motorType: motorData.motorType,
      ratedVoltage: Number(motorData.ratedVoltage) || 400.0,
      ratedCurrent: Number(motorData.ratedCurrent) || 10.0,
      ratedRPM: Number(motorData.ratedRPM) || 1500.0,
      status: motorData.status || 'HEALTHY',
      installationDate: motorData.installationDate || now.split('T')[0],
      createdAt: now,
      updatedAt: now
    });

    return this.findByMotorId(motorData.motorId);
  }

  update(motorId, updateData) {
    const existing = this.findByMotorId(motorId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const merged = {
      ...existing,
      ...updateData,
      updatedAt: now
    };

    this.db.prepare(`
      UPDATE motors 
      SET name = @name, location = @location, motorType = @motorType, 
          ratedVoltage = @ratedVoltage, ratedCurrent = @ratedCurrent, 
          ratedRPM = @ratedRPM, status = @status, updatedAt = @updatedAt
      WHERE motorId = @motorId
    `).run({
      motorId,
      name: merged.name,
      location: merged.location,
      motorType: merged.motorType,
      ratedVoltage: Number(merged.ratedVoltage),
      ratedCurrent: Number(merged.ratedCurrent),
      ratedRPM: Number(merged.ratedRPM),
      status: merged.status,
      updatedAt: merged.updatedAt
    });

    return this.findByMotorId(motorId);
  }

  updateStatus(motorId, status) {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE motors SET status = ?, updatedAt = ? WHERE motorId = ?').run(status, now, motorId);
  }

  delete(motorId) {
    const result = this.db.prepare('DELETE FROM motors WHERE motorId = ?').run(motorId);
    return result.changes > 0;
  }
}

export const motorRepository = new MotorRepository();
