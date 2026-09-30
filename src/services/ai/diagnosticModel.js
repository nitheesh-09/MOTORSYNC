/**
 * MOTORSYNC — Diagnostic Model Base Class / Interface
 * 
 * Master Specification Sections 24-25, 28, 50:
 * - Common interface for all diagnostic models (rule engines, supervised classifiers, anomaly detectors).
 * - Decouples UI from specific ML frameworks (TensorFlow, PyTorch, Scikit-learn, ONNX).
 * - Requires explicit model metadata, versioning, and feature schemas.
 */

export class DiagnosticModel {
  /**
   * @param {Object} metadata
   * @param {string} metadata.modelName
   * @param {string} metadata.version
   * @param {string} metadata.modelType - 'EXPERIMENTAL_RULE_FEATURE_FUSION' | 'RANDOM_FOREST' | 'XGBOOST' | 'NEURAL_NET' | 'ANOMALY_DETECTOR'
   * @param {string} metadata.status - 'Experimental / Development' | 'Production / Validated'
   * @param {string[]} metadata.featureSchema - list of expected feature names
   * @param {Object|null} metadata.validationMetrics - { accuracy, precision, recall, f1, valLoss } or null if not trained
   * @param {string|null} metadata.trainedOn - dataset reference or null
   */
  constructor(metadata = {}) {
    this.metadata = {
      modelName: metadata.modelName || 'Unnamed Diagnostic Model',
      version: metadata.version || 'v0.0.0',
      modelType: metadata.modelType || 'EXPERIMENTAL_RULE_FEATURE_FUSION',
      status: metadata.status || 'Experimental / Development',
      featureSchema: metadata.featureSchema || [],
      validationMetrics: metadata.validationMetrics || null,
      trainedOn: metadata.trainedOn || null,
      createdAt: metadata.createdAt || new Date().toISOString()
    };
  }

  /**
   * Perform diagnostic prediction on incoming normalized features.
   * 
   * @param {Object} features - Normalized feature payload
   * @param {Object} context - Optional context (motorId, baseline deviations, previous state)
   * @returns {Object} Diagnostic result matching Section 25 & 30 schema
   */
  predict(features, context = {}) {
    throw new Error('predict() must be implemented by subclass');
  }

  /**
   * Return model metadata
   * @returns {Object}
   */
  getMetadata() {
    return { ...this.metadata };
  }
}
