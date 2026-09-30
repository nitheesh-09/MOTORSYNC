/**
 * MOTORSYNC Backend — Data Ingestion Service
 * 
 * Master Specification Section 11:
 * Orchestrates full ingestion pipeline:
 * Incoming Payload -> Validation -> Normalization -> Storage -> Analytics -> Health -> Alerts -> Diagnostics
 */

import { payloadValidator } from '../validation/payloadValidator.js';
import { motorRepository } from '../repositories/motorRepository.js';
import { telemetryRepository } from '../repositories/telemetryRepository.js';
import { electricalAnalyticsService } from '../analytics/electricalAnalyticsService.js';
import { thermalAnalyticsService } from '../analytics/thermalAnalyticsService.js';
import { vibrationAnalyticsService } from '../analytics/vibrationAnalyticsService.js';
import { baselineService } from '../baselines/baselineService.js';
import { healthAssessmentService } from '../diagnostics/healthAssessmentService.js';
import { alertService } from '../alerts/alertService.js';
import { diagnosticService } from '../diagnostics/diagnosticService.js';
import { logger } from '../utils/logger.js';

export class DataIngestionService {
  constructor() {
    this.activeSource = 'ESP32';
  }

  setActiveSource(sourceType) {
    this.activeSource = sourceType;
    logger.info(`Active telemetry source set to: ${sourceType}`);
  }

  getActiveSource() {
    return this.activeSource;
  }

  /**
   * Process incoming payload through entire ingestion pipeline.
   * 
   * @param {Object} rawPayload - Raw incoming payload
   * @returns {Object} { success, data, error }
   */
  async ingest(rawPayload) {
    try {
      // 1. Fetch valid motor IDs for association check
      const motors = motorRepository.findAll();
      const validMotorIds = new Set(motors.map(m => m.motorId));

      // 2. Schema, data type, timestamp, quality validation
      const valResult = payloadValidator.validate(rawPayload, validMotorIds);
      if (!valResult.valid) {
        logger.warn('Telemetry ingestion rejected: validation failed', { errors: valResult.errors });
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Incoming telemetry payload failed validation checks',
            details: valResult.errors
          }
        };
      }

      const payload = valResult.normalizedPayload;
      const motor = motorRepository.findByMotorId(payload.motorId);

      // 3. Baseline deviations & Analytics
      const baselineDev = baselineService.calculateDeviations(payload.motorId, payload);
      const electrical = electricalAnalyticsService.analyze(payload.electrical, motor || {});
      const thermal = thermalAnalyticsService.analyze(payload.thermal, baselineDev.baselineValues);
      const vibration = vibrationAnalyticsService.analyze(payload.vibration, baselineDev.baselineValues);

      payload.electrical = electrical;
      payload.thermal = thermal;
      payload.vibration = vibration;

      // 4. Multi-signal Health Assessment
      const health = healthAssessmentService.evaluate(payload, baselineDev);

      // Update motor status in registry if health changed
      if (motor && motor.status !== health.state && health.state !== 'INSUFFICIENT_DATA') {
        motorRepository.updateStatus(payload.motorId, health.state);
      }

      // 5. AI Diagnostics & Model Fusion
      const diagnosticResult = diagnosticService.diagnoseAndSave(payload);

      // 6. Alert Evaluation & Persistence
      const alerts = alertService.evaluateAndSave(payload, diagnosticResult);

      // 7. Store Telemetry Record
      const savedTelemetry = telemetryRepository.save(payload);

      logger.debug(`Successfully ingested telemetry for ${payload.motorId} [${payload.sourceType}]`);

      return {
        success: true,
        data: {
          telemetry: savedTelemetry,
          health,
          diagnostics: diagnosticResult,
          alertsGenerated: alerts.length,
          baselineDeviations: baselineDev
        }
      };
    } catch (err) {
      logger.error('Unexpected error during data ingestion pipeline', err);
      return {
        success: false,
        error: {
          code: 'INGESTION_ERROR',
          message: 'An internal error occurred during telemetry processing',
          details: [err.message]
        }
      };
    }
  }
}

export const dataIngestionService = new DataIngestionService();
