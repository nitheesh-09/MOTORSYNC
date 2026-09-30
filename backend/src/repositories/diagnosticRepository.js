/**
 * MOTORSYNC Backend — Diagnostic Repository
 * 
 * Data access abstraction for motor health assessments and AI diagnostic results.
 */

import { getDatabase } from '../storage/database.js';

export class DiagnosticRepository {
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
      condition: row.condition,
      affectedSection: row.affectedSection,
      faultType: row.faultType,
      severity: row.severity,
      confidence: row.confidence,
      confidenceLabel: row.confidenceLabel,
      evidence: row.evidence ? JSON.parse(row.evidence) : [],
      explanation: row.explanation ? JSON.parse(row.explanation) : null,
      componentAssessment: row.componentAssessment ? JSON.parse(row.componentAssessment) : null,
      modelVersion: row.modelVersion,
      status: row.status,
      createdAt: row.createdAt
    };
  }

  save(diag) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO diagnostics (
        motorId, timestamp, condition, affectedSection, faultType, severity,
        confidence, confidenceLabel, evidence, explanation, componentAssessment,
        modelVersion, status, createdAt
      ) VALUES (
        @motorId, @timestamp, @condition, @affectedSection, @faultType, @severity,
        @confidence, @confidenceLabel, @evidence, @explanation, @componentAssessment,
        @modelVersion, @status, @createdAt
      )
    `);

    stmt.run({
      motorId: diag.motorId,
      timestamp: diag.timestamp || now,
      condition: diag.condition || 'HEALTHY',
      affectedSection: diag.affectedSection || 'UNKNOWN',
      faultType: diag.faultType || 'Nominal Operation',
      severity: diag.severity || 'LOW',
      confidence: diag.confidence != null ? Number(diag.confidence) : null,
      confidenceLabel: diag.confidenceLabel || 'Not available',
      evidence: diag.evidence ? JSON.stringify(diag.evidence) : JSON.stringify([]),
      explanation: diag.explanation ? JSON.stringify(diag.explanation) : null,
      componentAssessment: diag.componentAssessment ? JSON.stringify(diag.componentAssessment) : null,
      modelVersion: diag.modelVersion || 'v0.1-dev',
      status: diag.status || 'EXPERIMENTAL',
      createdAt: now
    });

    return { ...diag, createdAt: now };
  }

  findLatestByMotorId(motorId) {
    const row = this.db.prepare(`
      SELECT * FROM diagnostics 
      WHERE motorId = ? 
      ORDER BY timestamp DESC, id DESC 
      LIMIT 1
    `).get(motorId);

    return this._hydrate(row);
  }

  findByMotorId(motorId, limit = 50) {
    const rows = this.db.prepare(`
      SELECT * FROM diagnostics 
      WHERE motorId = ? 
      ORDER BY timestamp DESC, id DESC 
      LIMIT ?
    `).all(motorId, limit);

    return rows.map(r => this._hydrate(r));
  }
}

export const diagnosticRepository = new DiagnosticRepository();
