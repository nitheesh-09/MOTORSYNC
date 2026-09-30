/**
 * MOTORSYNC Backend — AI Model Repository
 * 
 * Persistent storage and registration for diagnostic AI models (Section 50).
 */

import { getDatabase } from '../storage/database.js';

export class ModelRepository {
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
      modelId: row.modelId,
      modelName: row.modelName,
      version: row.version,
      modelType: row.modelType,
      status: row.status,
      featureSchema: row.featureSchema ? JSON.parse(row.featureSchema) : [],
      validationMetrics: row.validationMetrics ? JSON.parse(row.validationMetrics) : null,
      trainedOn: row.trainedOn,
      createdAt: row.createdAt
    };
  }

  findAll() {
    return this.db.prepare('SELECT * FROM models ORDER BY createdAt DESC').all().map(r => this._hydrate(r));
  }

  findByModelId(modelId) {
    const row = this.db.prepare('SELECT * FROM models WHERE modelId = ?').get(modelId);
    return this._hydrate(row);
  }

  upsert(modelData) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO models (
        modelId, modelName, version, modelType, status, featureSchema, validationMetrics, trainedOn, createdAt
      ) VALUES (
        @modelId, @modelName, @version, @modelType, @status, @featureSchema, @validationMetrics, @trainedOn, @createdAt
      )
      ON CONFLICT(modelId) DO UPDATE SET
        modelName = excluded.modelName,
        version = excluded.version,
        modelType = excluded.modelType,
        status = excluded.status,
        featureSchema = excluded.featureSchema,
        validationMetrics = excluded.validationMetrics,
        trainedOn = excluded.trainedOn
    `);

    stmt.run({
      modelId: modelData.modelId,
      modelName: modelData.modelName,
      version: modelData.version,
      modelType: modelData.modelType,
      status: modelData.status || 'NOT TRAINED / EXPERIMENTAL',
      featureSchema: modelData.featureSchema ? JSON.stringify(modelData.featureSchema) : JSON.stringify([]),
      validationMetrics: modelData.validationMetrics ? JSON.stringify(modelData.validationMetrics) : null,
      trainedOn: modelData.trainedOn || null,
      createdAt: now
    });

    return this.findByModelId(modelData.modelId);
  }
}

export const modelRepository = new ModelRepository();
