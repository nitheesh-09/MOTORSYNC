/**
 * MOTORSYNC Backend — AI Inference Service
 * 
 * Master Specification Section 25, 28, 34:
 * Coordinates FeatureBuilder, active diagnostic model inference,
 * and diagnostic explainability.
 */

import { featureBuilder } from './featureBuilder.js';
import { modelRegistry } from './modelRegistry.js';
import { baselineService } from '../baselines/baselineService.js';

export class InferenceService {
  /**
   * Run diagnostic inference on incoming telemetry payload.
   * 
   * @param {Object} payload - Incoming payload
   * @param {Object} context - Optional context
   * @returns {Object} Diagnostic assessment
   */
  infer(payload = {}, context = {}) {
    const motorId = payload.motorId || context.motorId || 'MTR-001';

    // 1. Calculate baseline deviations
    const baselineDeviations = baselineService.calculateDeviations(motorId, payload);

    // 2. Build normalized feature vector with explicit availability tracking
    const featureVector = featureBuilder.build(payload, baselineDeviations);

    // 3. Dispatch to active diagnostic model
    const activeModel = modelRegistry.getActiveModel();
    const result = activeModel.predict(featureVector, {
      motorId,
      baselineDeviations,
      ...context
    });

    return {
      ...result,
      baselineDeviations
    };
  }
}

export const inferenceService = new InferenceService();
