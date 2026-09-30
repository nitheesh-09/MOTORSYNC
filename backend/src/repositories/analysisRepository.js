/**
 * MOTORSYNC Backend — Analysis Repository
 * 
 * Data access abstraction for Offline Dataset Analyses.
 */

import { getDatabase } from '../storage/database.js';

export class AnalysisRepository {
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
      analysisId: row.analysisId,
      motorId: row.motorId,
      datasetName: row.datasetName,
      timestamp: row.timestamp,
      sourceType: row.sourceType,
      sampleCount: row.sampleCount,
      duration: row.duration,
      samplingRate: row.samplingRate,
      availableFeatures: row.availableFeatures ? JSON.parse(row.availableFeatures) : [],
      results: row.results ? JSON.parse(row.results) : null,
      diagnosticResult: row.diagnosticResult ? JSON.parse(row.diagnosticResult) : null,
      referenceLabel: row.referenceLabel,
      createdAt: row.createdAt
    };
  }

  save(analysis) {
    const now = new Date().toISOString();
    const analysisId = analysis.analysisId || `ANL-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const stmt = this.db.prepare(`
      INSERT INTO analyses (
        analysisId, motorId, datasetName, timestamp, sourceType, sampleCount,
        duration, samplingRate, availableFeatures, results, diagnosticResult, referenceLabel, createdAt
      ) VALUES (
        @analysisId, @motorId, @datasetName, @timestamp, @sourceType, @sampleCount,
        @duration, @samplingRate, @availableFeatures, @results, @diagnosticResult, @referenceLabel, @createdAt
      )
    `);

    stmt.run({
      analysisId,
      motorId: analysis.motorId,
      datasetName: analysis.datasetName,
      timestamp: analysis.timestamp || now,
      sourceType: analysis.sourceType || 'OFFLINE_FILE',
      sampleCount: analysis.sampleCount,
      duration: analysis.duration != null ? Number(analysis.duration) : null,
      samplingRate: analysis.samplingRate != null ? Number(analysis.samplingRate) : null,
      availableFeatures: analysis.availableFeatures ? JSON.stringify(analysis.availableFeatures) : null,
      results: analysis.results ? JSON.stringify(analysis.results) : null,
      diagnosticResult: analysis.diagnosticResult ? JSON.stringify(analysis.diagnosticResult) : null,
      referenceLabel: analysis.referenceLabel || null,
      createdAt: now
    });

    return this.findByAnalysisId(analysisId);
  }

  findByAnalysisId(analysisId) {
    const row = this.db.prepare('SELECT * FROM analyses WHERE analysisId = ?').get(analysisId);
    return this._hydrate(row);
  }

  findAll(options = {}) {
    const limit = Math.min(Math.max(parseInt(options.limit || '50', 10), 1), 200);
    const offset = Math.max(parseInt(options.offset || '0', 10), 0);

    let query = 'SELECT * FROM analyses WHERE 1=1';
    const params = [];

    if (options.motorId) {
      query += ' AND motorId = ?';
      params.push(options.motorId);
    }

    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.prepare(query).all(...params).map(r => this._hydrate(r));
  }
}

export const analysisRepository = new AnalysisRepository();
