/**
 * MOTORSYNC — AI Inference & Diagnostic Fusion Service
 * 
 * Master Specification Section 24, 27, 52:
 * Feature Validation → Baseline Comparison → Rule/Signal Indicators → AI Diagnostic Model → Diagnostic Fusion
 */

import { modelRegistry } from './modelRegistry.js';
import { baselineService } from '../baselineService.js';

class InferenceService {
  /**
   * Run inference on an incoming telemetry payload or snapshot.
   * 
   * @param {Object} motorPayload - Normalized payload or snapshot object
   * @returns {Object} Full diagnostic assessment with explainability and component breakdown
   */
  diagnose(motorPayload = {}) {
    const motorId = motorPayload.motorId || 'MTR-001';
    
    // 1. Calculate baseline deviations (Section 23)
    const baselineDeviations = baselineService.calculateDeviations(motorId, motorPayload);

    // 2. Normalize feature vector (Section 27: handle missing features explicitly)
    const normalizedFeatures = {
      motorId,
      timestamp: motorPayload.timestamp || new Date().toISOString(),
      
      electrical: {
        voltageRms: motorPayload.electrical?.voltageRms ?? motorPayload.metrics?.voltage ?? null,
        currentRms: motorPayload.electrical?.currentRms ?? motorPayload.metrics?.current ?? null,
        currentStdDev: motorPayload.electrical?.currentStdDev ?? null,
        currentPeak: motorPayload.electrical?.currentPeak ?? null,
        power: motorPayload.electrical?.power ?? motorPayload.metrics?.power ?? null
      },

      thermal: {
        temperature: motorPayload.thermal?.temperature ?? motorPayload.metrics?.temperature ?? null,
        temperatureRiseFromBaseline: baselineDeviations.temperatureRiseFromBaseline,
        temperatureRiseRate: motorPayload.thermal?.temperatureRiseRate ?? null,
        temperatureVariation: motorPayload.thermal?.temperatureVariation ?? null
      },

      vibration: {
        rms: motorPayload.vibration?.rms ?? motorPayload.vibrationFeatures?.rms ?? motorPayload.metrics?.vibration ?? null,
        peak: motorPayload.vibration?.peak ?? motorPayload.vibrationFeatures?.peak ?? null,
        crestFactor: motorPayload.vibration?.crestFactor ?? motorPayload.vibrationFeatures?.crestFactor ?? null,
        kurtosis: motorPayload.vibration?.kurtosis ?? motorPayload.vibrationFeatures?.kurtosis ?? null,
        skewness: motorPayload.vibration?.skewness ?? motorPayload.vibrationFeatures?.skewness ?? null,
        dominantFrequency: motorPayload.vibration?.dominantFrequency ?? motorPayload.vibrationFeatures?.dominantFreq ?? null,
        spectralEnergy: motorPayload.vibration?.spectralEnergy ?? null
      },

      rpm: motorPayload.rpm ?? motorPayload.vibrationFeatures?.derivedRPM ?? null
    };

    // 3. Dispatch to active diagnostic model
    const activeModel = modelRegistry.getActiveModel();
    const modelResult = activeModel.predict(normalizedFeatures, {
      motorId,
      baselineDeviations
    });

    // 4. Diagnostic Fusion: Combine Signal Evidence + Baseline Deviations + Model Prediction (Section 52)
    return {
      motorId,
      timestamp: normalizedFeatures.timestamp,
      condition: modelResult.overallCondition,
      affectedSection: modelResult.affectedSection,
      faultType: modelResult.faultType,
      severity: modelResult.severity,
      confidence: modelResult.confidence,
      confidenceLabel: modelResult.confidenceLabel,
      evidence: modelResult.evidence,
      baselineDeviations,
      explanation: modelResult.explanation,
      componentAssessment: modelResult.componentAssessment,
      modelMetadata: {
        modelName: modelResult.modelName,
        modelVersion: modelResult.modelVersion,
        status: modelResult.status
      }
    };
  }
}

export const inferenceService = new InferenceService();
