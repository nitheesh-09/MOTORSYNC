/**
 * MOTORSYNC Backend — Versioned API Routes (/api/v1)
 * 
 * Master Specification Section 5:
 * Complete REST route declarations.
 */

import { Router } from 'express';
import multer from 'multer';
import { systemController } from '../controllers/systemController.js';
import { motorController } from '../controllers/motorController.js';
import { telemetryController } from '../controllers/telemetryController.js';
import { diagnosticsController } from '../controllers/diagnosticsController.js';
import { baselineController } from '../controllers/baselineController.js';
import { alertController } from '../controllers/alertController.js';
import { dataSourceController } from '../controllers/dataSourceController.js';
import { offlineController } from '../controllers/offlineController.js';
import { aiController } from '../controllers/aiController.js';

const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB upload limit (Section 56)
  storage: multer.memoryStorage()
});

export const v1Router = Router();

// 1. Health & System
v1Router.get('/health', (req, res) => systemController.health(req, res));
v1Router.get('/system/status', (req, res) => systemController.status(req, res));

// 2. Motors Fleet Management
v1Router.get('/motors', (req, res) => motorController.getAll(req, res));
v1Router.post('/motors', (req, res) => motorController.create(req, res));
v1Router.get('/motors/:motorId', (req, res) => motorController.getById(req, res));
v1Router.put('/motors/:motorId', (req, res) => motorController.update(req, res));
v1Router.delete('/motors/:motorId', (req, res) => motorController.delete(req, res));

// 3. Telemetry Stream & Latest Snapshots
v1Router.post('/telemetry', (req, res) => telemetryController.ingest(req, res));

// 3a. Dedicated ESP32 Raw Hardware Ingestion (Section 2, 10, 22)
v1Router.post('/telemetry/raw', (req, res) => telemetryController.ingestRaw(req, res));
v1Router.post('/telemetry/raw/batch', (req, res) => telemetryController.ingestRawBatch(req, res));
v1Router.get('/telemetry/esp32/status', (req, res) => telemetryController.getEsp32Status(req, res));
v1Router.get('/telemetry/raw/status', (req, res) => telemetryController.getEsp32Status(req, res));

v1Router.get('/motors/:motorId/latest', (req, res) => telemetryController.getLatest(req, res));
v1Router.get('/motors/:motorId/telemetry', (req, res) => telemetryController.getTelemetry(req, res));
v1Router.get('/motors/:motorId/history', (req, res) => telemetryController.getHistory(req, res));
v1Router.get('/motors/:motorId/raw/latest', (req, res) => telemetryController.getRawLatest(req, res));
v1Router.get('/motors/:motorId/raw/history', (req, res) => telemetryController.getRawTelemetry(req, res));
v1Router.get('/motors/:motorId/esp32/status', (req, res) => telemetryController.getEsp32Status(req, res));

// 4. Diagnostics & Fault Analysis
v1Router.get('/motors/:motorId/diagnostics', (req, res) => diagnosticsController.getDiagnostics(req, res));
v1Router.post('/diagnostics/analyze', (req, res) => diagnosticsController.analyze(req, res));

// 5. Motor Baselines
v1Router.get('/motors/:motorId/baseline', (req, res) => baselineController.getBaseline(req, res));
v1Router.post('/motors/:motorId/baseline', (req, res) => baselineController.setBaseline(req, res));

// 6. Alerts
v1Router.get('/alerts', (req, res) => alertController.getAll(req, res));
v1Router.get('/motors/:motorId/alerts', (req, res) => alertController.getByMotorId(req, res));
v1Router.post('/alerts/:alertId/ack', (req, res) => alertController.acknowledge(req, res));

// 7. Data Sources
v1Router.get('/data-sources', (req, res) => dataSourceController.getAll(req, res));
v1Router.get('/data-sources/status', (req, res) => dataSourceController.getStatus(req, res));
v1Router.post('/data-sources/select', (req, res) => dataSourceController.setSource(req, res));

// 8. Offline Dataset Analysis
v1Router.post('/offline/upload', upload.single('file'), (req, res) => offlineController.upload(req, res));
v1Router.post('/offline/analyze', (req, res) => offlineController.analyze(req, res));
v1Router.get('/offline/:analysisId', (req, res) => offlineController.getById(req, res));
v1Router.post('/analysis', (req, res) => offlineController.analyze(req, res));
v1Router.get('/analysis', (req, res) => offlineController.list(req, res));
v1Router.get('/analysis/:analysisId', (req, res) => offlineController.getById(req, res));

// 9. AI Model Management
v1Router.get('/ai/status', (req, res) => aiController.getStatus(req, res));
v1Router.get('/ai/models', (req, res) => aiController.getModels(req, res));
