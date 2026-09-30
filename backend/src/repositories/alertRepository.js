/**
 * MOTORSYNC Backend — Alert Repository
 * 
 * Data access abstraction for motor and system alerts.
 */

import { getDatabase } from '../storage/database.js';

export class AlertRepository {
  constructor(db = null) {
    this._customDb = db;
  }

  get db() {
    return this._customDb || getDatabase();
  }

  save(alert) {
    const now = new Date().toISOString();
    const alertId = alert.alertId || `ALT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const stmt = this.db.prepare(`
      INSERT INTO alerts (
        alertId, motorId, timestamp, category, severity, message, evidence, source, isAcknowledged, createdAt
      ) VALUES (
        @alertId, @motorId, @timestamp, @category, @severity, @message, @evidence, @source, @isAcknowledged, @createdAt
      )
    `);

    stmt.run({
      alertId,
      motorId: alert.motorId,
      timestamp: alert.timestamp || now,
      category: alert.category,
      severity: alert.severity,
      message: alert.message,
      evidence: alert.evidence || null,
      source: alert.source || 'SYSTEM',
      isAcknowledged: alert.isAcknowledged ? 1 : 0,
      createdAt: now
    });

    return { alertId, ...alert, createdAt: now };
  }

  findAll(options = {}) {
    const limit = Math.min(Math.max(parseInt(options.limit || '100', 10), 1), 500);
    const offset = Math.max(parseInt(options.offset || '0', 10), 0);

    let query = 'SELECT * FROM alerts WHERE 1=1';
    const params = [];

    if (options.motorId) {
      query += ' AND motorId = ?';
      params.push(options.motorId);
    }
    if (options.category) {
      query += ' AND category = ?';
      params.push(options.category);
    }
    if (options.severity) {
      query += ' AND severity = ?';
      params.push(options.severity);
    }

    query += ' ORDER BY timestamp DESC, id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.prepare(query).all(...params);
  }

  findByMotorId(motorId, limit = 50) {
    return this.findAll({ motorId, limit });
  }

  findRecentSimilar(motorId, category, severity, secondsWindow = 10) {
    const cutoff = new Date(Date.now() - secondsWindow * 1000).toISOString();
    return this.db.prepare(`
      SELECT * FROM alerts 
      WHERE motorId = ? AND category = ? AND severity = ? AND timestamp >= ? 
      LIMIT 1
    `).get(motorId, category, severity, cutoff);
  }

  acknowledge(alertId) {
    const res = this.db.prepare('UPDATE alerts SET isAcknowledged = 1 WHERE alertId = ?').run(alertId);
    return res.changes > 0;
  }
}

export const alertRepository = new AlertRepository();
