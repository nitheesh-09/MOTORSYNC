/**
 * MOTORSYNC Backend — Telemetry Controller
 * 
 * Master Specification Section 5 & 8:
 * Ingestion and retrieval endpoints for motor telemetry.
 */

import { dataIngestionService } from '../../ingestion/dataIngestionService.js';
import { esp32RawIngestionService } from '../../ingestion/esp32RawIngestionService.js';
import { telemetryRepository } from '../../repositories/telemetryRepository.js';
import { rawTelemetryRepository } from '../../repositories/rawTelemetryRepository.js';
import { motorRepository } from '../../repositories/motorRepository.js';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

export class TelemetryController {
  async ingest(req, res) {
    const result = await dataIngestionService.ingest(req.body);
    if (!result.success) {
      return sendError(res, result.error.code, result.error.message, 400, result.error.details);
    }

    return sendSuccess(res, result.data, { message: 'Telemetry successfully ingested' }, 201);
  }

  /**
   * Dedicated single-sample raw ESP32 ingestion endpoint (Section 2, 3, 22).
   * POST /api/v1/telemetry/raw
   */
  async ingestRaw(req, res) {
    const result = await esp32RawIngestionService.ingestSingle(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data
    });
  }

  /**
   * Dedicated high-frequency batch raw ESP32 ingestion endpoint (Section 10).
   * POST /api/v1/telemetry/raw/batch
   */
  async ingestRawBatch(req, res) {
    const result = await esp32RawIngestionService.ingestBatch(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data
    });
  }

  /**
   * Get ESP32 hardware connection & buffer status (Section 29).
   * GET /api/v1/telemetry/esp32/status or GET /api/v1/telemetry/raw/status
   */
  getEsp32Status(req, res) {
    const motorId = req.params.motorId || req.query.motorId || 'MTR-001';
    const status = esp32RawIngestionService.getEsp32Status(motorId);
    return sendSuccess(res, status);
  }

  /**
   * Get latest raw sensor telemetry reading.
   * GET /api/v1/motors/:motorId/raw/latest
   */
  getRawLatest(req, res) {
    const { motorId } = req.params;
    const motor = motorRepository.findByMotorId(motorId);
    if (!motor) {
      return sendError(res, 'MOTOR_NOT_FOUND', `Motor ${motorId} not found`, 404);
    }

    const latest = rawTelemetryRepository.findLatestByMotorId(motorId);
    return sendSuccess(res, { motorId, latest });
  }

  /**
   * Query raw sensor telemetry history.
   * GET /api/v1/motors/:motorId/raw/history
   */
  getRawTelemetry(req, res) {
    const { motorId } = req.params;
    const { limit, offset, startDate, endDate } = req.query;

    const motor = motorRepository.findByMotorId(motorId);
    if (!motor) {
      return sendError(res, 'MOTOR_NOT_FOUND', `Motor ${motorId} not found`, 404);
    }

    const records = rawTelemetryRepository.findByMotorId(motorId, {
      limit,
      offset,
      startDate,
      endDate
    });
    const total = rawTelemetryRepository.countByMotorId(motorId);

    return sendSuccess(res, {
      motorId,
      records,
      total,
      limit: parseInt(limit || '100', 10),
      offset: parseInt(offset || '0', 10)
    });
  }

  getLatest(req, res) {
    const { motorId } = req.params;
    const { sourceType } = req.query;
    const motor = motorRepository.findByMotorId(motorId);
    if (!motor) {
      return sendError(res, 'MOTOR_NOT_FOUND', `Motor ${motorId} not found`, 404);
    }

    let latest = null;
    if (sourceType) {
      latest = telemetryRepository.findLatestByMotorId(motorId, sourceType === 'ALL' ? null : sourceType);
    } else {
      // Prioritize real ESP32 telemetry first (Task 1, 2, 4)
      latest = telemetryRepository.findLatestByMotorId(motorId, 'ESP32');
      if (!latest) {
        latest = telemetryRepository.findLatestByMotorId(motorId, null);
      }
    }

    const hasRealTelemetry = latest?.sourceType === 'ESP32';
    const notice = !latest 
      ? 'NO RECENT ESP32 DATA' 
      : (hasRealTelemetry ? 'REAL ESP32 HARDWARE STREAM' : `SOURCE: ${latest.sourceType}`);

    return sendSuccess(res, { 
      motorId, 
      latest: latest || null,
      hasRealTelemetry,
      notice
    });
  }

  getTelemetry(req, res) {
    const { motorId } = req.params;
    let { limit, offset, sourceType, startDate, endDate, includeSynthetic } = req.query;

    const motor = motorRepository.findByMotorId(motorId);
    if (!motor) {
      return sendError(res, 'MOTOR_NOT_FOUND', `Motor ${motorId} not found`, 404);
    }

    // Task 3 & 4: In runtime production, filter out synthetic data unless explicitly requested
    if (!sourceType && includeSynthetic !== 'true') {
      const espCount = telemetryRepository.countByMotorId(motorId, 'ESP32');
      if (espCount > 0) {
        sourceType = 'ESP32';
      }
    }

    const records = telemetryRepository.findByMotorId(motorId, {
      limit,
      offset,
      sourceType,
      startDate,
      endDate
    });
    const total = telemetryRepository.countByMotorId(motorId, sourceType);

    return sendSuccess(res, {
      motorId,
      records,
      total,
      sourceFilter: sourceType || 'ALL',
      limit: parseInt(limit || '100', 10),
      offset: parseInt(offset || '0', 10)
    });
  }

  getHistory(req, res) {
    return this.getTelemetry(req, res);
  }
}

export const telemetryController = new TelemetryController();
