/**
 * MOTORSYNC Backend — Data Source Repository
 * 
 * Tracks active data sources (Synthetic, External Laptop, Offline File) and heartbeat statuses.
 */

import { getDatabase } from '../storage/database.js';

export class DataSourceRepository {
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
      sourceId: row.sourceId,
      name: row.name,
      type: row.type,
      status: row.status,
      lastHeartbeatAt: row.lastHeartbeatAt,
      config: row.config ? JSON.parse(row.config) : null
    };
  }

  findAll() {
    return this.db.prepare('SELECT * FROM data_sources').all().map(r => this._hydrate(r));
  }

  findByType(type) {
    const row = this.db.prepare('SELECT * FROM data_sources WHERE type = ?').get(type);
    return this._hydrate(row);
  }

  updateStatus(type, status, lastHeartbeatAt = new Date().toISOString()) {
    this.db.prepare(`
      UPDATE data_sources 
      SET status = ?, lastHeartbeatAt = ? 
      WHERE type = ?
    `).run(status, lastHeartbeatAt, type);
  }
}

export const dataSourceRepository = new DataSourceRepository();
