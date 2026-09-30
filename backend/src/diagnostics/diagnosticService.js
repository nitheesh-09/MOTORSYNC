/**
 * MOTORSYNC Backend — Diagnostic Service
 * 
 * Master Specification Section 25:
 * Coordinates multi-sensor analytics, baseline comparison,
 * AI model inference, and diagnostic result persistence.
 */

import { diagnosticRepository } from '../repositories/diagnosticRepository.js';
import { inferenceService } from '../ai/inferenceService.js';
import { healthAssessmentService } from './healthAssessmentService.js';
import { baselineService } from '../baselines/baselineService.js';

export class DiagnosticService {
  constructor(repo = null) {
    this.repo = repo || diagnosticRepository;
  }

  /**
   * Run full diagnostics and persist outcome.
   * 
   * @param {Object} payload - Normalized telemetry payload
   * @returns {Object} Complete diagnostic result
   */
  diagnoseAndSave(payload = {}) {
    const motorId = payload.motorId || 'MTR-001';
    
    // Baseline deviations
    const baselineDeviations = baselineService.calculateDeviations(motorId, payload);

    // Multi-signal health check
    const health = healthAssessmentService.evaluate(payload, baselineDeviations);

    // AI model inference & fusion
    const diag = inferenceService.infer(payload, { health, baselineDeviations });

    // Persist to database
    this.repo.save(diag);

    return {
      ...diag,
      health
    };
  }

  getLatestDiagnostics(motorId) {
    return this.repo.findLatestByMotorId(motorId);
  }

  getDiagnosticHistory(motorId, limit = 50) {
    return this.repo.findByMotorId(motorId, limit);
  }
}

export const diagnosticService = new DiagnosticService();
