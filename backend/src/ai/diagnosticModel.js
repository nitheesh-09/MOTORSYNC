/**
 * MOTORSYNC Backend — Diagnostic Model Base Class
 * 
 * Master Specification Section 25, 28, 29:
 * Decoupled interface so future models (Python ML service, ONNX, Random Forest, XGBoost)
 * can be plugged in without changing the application logic.
 */

export class DiagnosticModel {
  /**
   * @param {Object} metadata
   * @param {string} metadata.modelId
   * @param {string} metadata.modelName
   * @param {string} metadata.version
   * @param {string} metadata.modelType
   * @param {string} metadata.status
   * @param {string[]} metadata.featureSchema
   * @param {Object|null} metadata.validationMetrics
   * @param {string|null} metadata.trainedOn
   */
  constructor(metadata = {}) {
    this.metadata = {
      modelId: metadata.modelId || 'unnamed-model',
      modelName: metadata.modelName || 'Unnamed Diagnostic Model',
      version: metadata.version || 'v0.0.0',
      modelType: metadata.modelType || 'EXPERIMENTAL_RULE_FEATURE_FUSION',
      status: metadata.status || 'NOT TRAINED / EXPERIMENTAL',
      featureSchema: metadata.featureSchema || [],
      validationMetrics: metadata.validationMetrics || null,
      trainedOn: metadata.trainedOn || null,
      createdAt: metadata.createdAt || new Date().toISOString()
    };
  }

  /**
   * Run prediction on normalized features.
   * 
   * @param {Object} featureVector - Prepared by FeatureBuilder
   * @param {Object} context - { motorId, baselineDeviations }
   * @returns {Object} Diagnostic result
   */
  predict(featureVector, context = {}) {
    throw new Error('predict(features, context) must be implemented by subclass');
  }

  getMetadata() {
    return { ...this.metadata };
  }
}
