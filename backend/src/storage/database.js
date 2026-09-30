/**
 * MOTORSYNC Backend — Database & Storage Engine
 * 
 * Uses SQLite (via better-sqlite3) for persistent, zero-configuration local development.
 * Provides clean table schemas, indexed queries, and seed data.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let dbInstance = null;

export function getDatabase(customPath = null) {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  if (dbInstance && customPath) {
    try { dbInstance.close(); } catch (_) {}
    dbInstance = null;
  }

  const dbPath = customPath || config.databasePath;

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  logger.info(`Initializing SQLite database at: ${dbPath}`);
  const db = new Database(dbPath);

  // Enable WAL mode for high concurrency
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  db.pragma('foreign_keys = ON');

  initSchema(db);
  seedInitialData(db);

  dbInstance = db;
  return db;
}

function initSchema(db) {
  db.exec(`
    -- 1. Motors Registry Table
    CREATE TABLE IF NOT EXISTS motors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      motorId TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      motorType TEXT NOT NULL,
      ratedVoltage REAL NOT NULL,
      ratedCurrent REAL NOT NULL,
      ratedRPM REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'HEALTHY',
      installationDate TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_motors_motorId ON motors(motorId);

    -- 2. Telemetry Records Table
    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      motorId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      sourceType TEXT NOT NULL,
      electrical TEXT,        -- JSON string of electrical features
      thermal TEXT,           -- JSON string of thermal features
      vibration TEXT,         -- JSON string of vibration features
      rpm REAL,               -- Derived/Processed RPM
      runningFrequency REAL,  -- Identified 1X rotational frequency (Hz)
      rawData TEXT,           -- JSON string of raw waveform / FFT if available
      metadata TEXT,          -- JSON string of ingestion metadata
      provenance TEXT,        -- JSON string of feature provenance
      quality TEXT,           -- JSON string of data quality checks
      createdAt TEXT NOT NULL,
      FOREIGN KEY (motorId) REFERENCES motors(motorId) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_telemetry_motor_time ON telemetry(motorId, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_telemetry_source ON telemetry(sourceType);

    -- 3. Offline Analyses Table
    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysisId TEXT UNIQUE NOT NULL,
      motorId TEXT NOT NULL,
      datasetName TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      sourceType TEXT NOT NULL DEFAULT 'OFFLINE_FILE',
      sampleCount INTEGER NOT NULL,
      duration REAL,
      samplingRate REAL,
      availableFeatures TEXT, -- JSON array
      results TEXT,           -- JSON object of computed metrics & FFT
      diagnosticResult TEXT,  -- JSON object of AI diagnosis
      referenceLabel TEXT,    -- e.g. "Bearing Fault (Reference Label)"
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analyses_motor ON analyses(motorId);
    CREATE INDEX IF NOT EXISTS idx_analyses_created ON analyses(createdAt DESC);

    -- 4. Baselines Table (Motor-specific healthy commissioning baselines)
    CREATE TABLE IF NOT EXISTS baselines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      motorId TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'ESTABLISHED', -- 'ESTABLISHED' | 'NOT_AVAILABLE'
      establishedDate TEXT,
      normalTemperature REAL,
      normalVibrationRms REAL,
      normalCurrentRms REAL,
      normalVoltageRms REAL,
      nominal1XFreq REAL,
      normalCrestFactor REAL,
      normalHarmonicDistortion REAL,
      metadata TEXT,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (motorId) REFERENCES motors(motorId) ON DELETE CASCADE
    );

    -- 5. Alerts Table
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alertId TEXT UNIQUE NOT NULL,
      motorId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      category TEXT NOT NULL, -- 'VIBRATION' | 'ELECTRICAL' | 'THERMAL' | 'SPEED' | 'DATA_QUALITY' | 'DIAGNOSTIC'
      severity TEXT NOT NULL, -- 'INFO' | 'WARNING' | 'CRITICAL'
      message TEXT NOT NULL,
      evidence TEXT,
      source TEXT NOT NULL,
      isAcknowledged INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (motorId) REFERENCES motors(motorId) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_motor_time ON alerts(motorId, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);

    -- 6. Diagnostics Table
    CREATE TABLE IF NOT EXISTS diagnostics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      motorId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      condition TEXT NOT NULL,        -- 'HEALTHY' | 'WARNING' | 'FAULT' | 'INSUFFICIENT_DATA'
      affectedSection TEXT NOT NULL,  -- 'BEARING' | 'ROTOR' | 'STATOR' | 'SHAFT' | 'COOLING' | 'ELECTRICAL_SUPPLY' | 'UNKNOWN'
      faultType TEXT NOT NULL,
      severity TEXT NOT NULL,         -- 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN'
      confidence REAL,                -- Calibrated percentage or null
      confidenceLabel TEXT,
      evidence TEXT,                  -- JSON array of strings
      explanation TEXT,               -- JSON object
      componentAssessment TEXT,       -- JSON object of 6 subsystems
      modelVersion TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (motorId) REFERENCES motors(motorId) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_diagnostics_motor ON diagnostics(motorId, timestamp DESC);

    -- 7. Data Sources Table
    CREATE TABLE IF NOT EXISTS data_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sourceId TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,             -- 'SYNTHETIC' | 'EXTERNAL_LAPTOP' | 'OFFLINE_FILE'
      status TEXT NOT NULL,           -- 'ACTIVE' | 'CONNECTED' | 'NOT_CONNECTED' | 'STANDBY'
      lastHeartbeatAt TEXT,
      config TEXT
    );

    -- 8. AI Models Registry Table
    CREATE TABLE IF NOT EXISTS models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      modelId TEXT UNIQUE NOT NULL,
      modelName TEXT NOT NULL,
      version TEXT NOT NULL,
      modelType TEXT NOT NULL,
      status TEXT NOT NULL,
      featureSchema TEXT,             -- JSON array
      validationMetrics TEXT,         -- JSON object or null
      trainedOn TEXT,
      createdAt TEXT NOT NULL
    );

    -- 9. Raw Telemetry Readings Table (Dedicated ESP32 raw time-series - Section 5, 20)
    CREATE TABLE IF NOT EXISTS raw_telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      motorId TEXT NOT NULL,
      timestamp REAL NOT NULL,
      voltage REAL,
      current REAL,
      temperature REAL,
      vibrationX REAL,
      vibrationY REAL,
      vibrationZ REAL,
      vibrationMagnitude REAL,
      sourceType TEXT NOT NULL DEFAULT 'ESP32',
      quality TEXT,
      metadata TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (motorId) REFERENCES motors(motorId) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_raw_telem_motor_time ON raw_telemetry(motorId, timestamp DESC);
  `);
}

function seedInitialData(db) {
  const now = new Date().toISOString();

  // 1. Seed Fleet Motors
  const countMotors = db.prepare('SELECT COUNT(*) as count FROM motors').get().count;
  if (countMotors === 0) {
    logger.info('Seeding initial fleet motors (MTR-001 through MTR-005)...');
    const insertMotor = db.prepare(`
      INSERT INTO motors (motorId, name, location, motorType, ratedVoltage, ratedCurrent, ratedRPM, status, installationDate, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const fleet = [
      ['MTR-001', 'Motor MTR-001', 'Physical Hardware Testbed', '3-Phase Induction Motor', 400.0, 14.8, 1480.0, 'HEALTHY', '2026-09-30', now, now],
      ['MTR-002', 'Cooling Tower Fan Drive', 'Utility Yard — Tower 2', '3-Phase Induction (Severe Duty)', 400.0, 8.6, 975.0, 'WARNING', '2023-11-05', now, now],
      ['MTR-003', 'Hydraulic Booster Unit', 'Compressor Bay — Cell 4', '3-Phase Induction (High Torque)', 400.0, 22.4, 2950.0, 'FAULT', '2024-01-20', now, now],
      ['MTR-004', 'Air Handling Supply Blower', 'HVAC Plant Room — Sector C', '3-Phase Induction (Standard)', 400.0, 5.2, 1450.0, 'HEALTHY', '2024-06-08', now, now],
      ['MTR-005', 'Secondary Slurry Agitator', 'Process Area — Tank 03', '3-Phase Induction (Explosion Proof)', 400.0, 11.5, 960.0, 'OFFLINE', '2024-08-15', now, now]
    ];

    const tx = db.transaction(() => {
      for (const m of fleet) {
        insertMotor.run(...m);
      }
    });
    tx();
  }

  // 2. Seed Baselines
  const countBaselines = db.prepare('SELECT COUNT(*) as count FROM baselines').get().count;
  if (countBaselines === 0) {
    logger.info('Seeding commissioning baselines...');
    const insertBaseline = db.prepare(`
      INSERT INTO baselines (motorId, status, establishedDate, normalTemperature, normalVibrationRms, normalCurrentRms, normalVoltageRms, nominal1XFreq, normalCrestFactor, normalHarmonicDistortion, metadata, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const baselines = [
      ['MTR-001', 'NOT_ESTABLISHED', null, null, null, null, null, null, null, null, JSON.stringify({ notes: 'Commissioning baseline not established: awaiting real healthy data from physical motor setup' }), now],
      ['MTR-002', 'ESTABLISHED', '2026-08-20', 48.5, 1.15, 8.4, 400.0, 16.2, 2.4, 2.1, JSON.stringify({ notes: 'Commissioned nominal baseline' }), now],
      ['MTR-003', 'ESTABLISHED', '2026-08-22', 51.0, 0.95, 21.8, 400.0, 49.2, 2.3, 1.9, JSON.stringify({ notes: 'Commissioned nominal baseline' }), now],
      ['MTR-004', 'ESTABLISHED', '2026-09-01', 45.0, 1.30, 5.1, 400.0, 24.2, 2.5, 2.4, JSON.stringify({ notes: 'Commissioned nominal baseline' }), now],
      ['MTR-005', 'NOT_AVAILABLE', null, null, null, null, null, null, null, null, JSON.stringify({ notes: 'Uncommissioned unit - no baseline' }), now]
    ];

    const tx = db.transaction(() => {
      for (const b of baselines) {
        insertBaseline.run(...b);
      }
    });
    tx();
  }

  // 3. Seed Data Sources
  const countSources = db.prepare('SELECT COUNT(*) as count FROM data_sources').get().count;
  if (countSources === 0) {
    const insertSource = db.prepare(`
      INSERT INTO data_sources (sourceId, name, type, status, lastHeartbeatAt, config)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const sources = [
      ['src-synthetic', 'Synthetic Placeholder Provider (TEST ONLY - DISABLED)', 'SYNTHETIC', 'DISABLED', now, JSON.stringify({ mode: 'DEVELOPMENT' })],
      ['src-esp32', 'ESP32 Real Hardware Ingestion Adapter', 'ESP32', 'ACTIVE', now, JSON.stringify({ protocol: 'HTTP_REST_WIFI', endpoint: '/api/v1/telemetry/raw' })],
      ['src-external', 'External Data Acquisition Laptop Adapter', 'EXTERNAL_LAPTOP', 'NOT_CONNECTED', null, JSON.stringify({ protocol: 'PENDING_SELECTION' })],
      ['src-offline', 'Offline Dataset File Parser', 'OFFLINE_FILE', 'STANDBY', now, JSON.stringify({ supportedFormats: ['CSV', 'JSON', 'XML'] })]
    ];

    const tx = db.transaction(() => {
      for (const s of sources) {
        insertSource.run(...s);
      }
    });
    tx();
  }

  // 4. Seed Models
  const countModels = db.prepare('SELECT COUNT(*) as count FROM models').get().count;
  if (countModels === 0) {
    const insertModel = db.prepare(`
      INSERT INTO models (modelId, modelName, version, modelType, status, featureSchema, validationMetrics, trainedOn, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertModel.run(
      'experimental-v0.1',
      'Experimental Rule-Feature Fusion Diagnostic Model',
      'v0.1-dev',
      'EXPERIMENTAL_RULE_FEATURE_FUSION',
      'NOT TRAINED / EXPERIMENTAL',
      JSON.stringify(['voltageRms', 'currentRms', 'vibrationRms', 'crestFactor', 'kurtosis', 'temperature', 'dominantFrequency', 'rpm']),
      null, // Validation metrics must remain null until real evaluation exists
      null,
      now
    );
  }
}

export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
