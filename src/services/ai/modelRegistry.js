/**
 * MOTORSYNC — AI Diagnostic Model Registry
 * 
 * Master Specification Section 50:
 * - Manages registered diagnostic models and versioning.
 * - Enforces clean model metadata schemas.
 * - Decouples active inference model selection from presentation components.
 */

import { ExperimentalRuleFeatureModel } from './experimentalRuleFeatureModel.js';

class ModelRegistry {
  constructor() {
    this.models = new Map();
    this.activeModelId = 'experimental-v0.1';

    // Register initial development model (Section 26, 50)
    const devModel = new ExperimentalRuleFeatureModel();
    this.registerModel('experimental-v0.1', devModel);
  }

  /**
   * Register a new diagnostic model (e.g. future Random Forest, XGBoost, or Neural Net)
   * @param {string} modelId 
   * @param {DiagnosticModel} modelInstance 
   */
  registerModel(modelId, modelInstance) {
    if (!modelInstance || typeof modelInstance.predict !== 'function') {
      throw new Error(`Model ${modelId} must implement the DiagnosticModel predict() interface`);
    }
    this.models.set(modelId, modelInstance);
  }

  /**
   * Get active model instance for inference
   * @returns {DiagnosticModel}
   */
  getActiveModel() {
    return this.models.get(this.activeModelId) || this.models.get('experimental-v0.1');
  }

  /**
   * Set active model ID
   * @param {string} modelId 
   */
  setActiveModel(modelId) {
    if (!this.models.has(modelId)) {
      throw new Error(`Model ${modelId} is not registered in ModelRegistry`);
    }
    this.activeModelId = modelId;
  }

  /**
   * List all registered model metadata (Section 50)
   * @returns {Array<Object>}
   */
  listModels() {
    return Array.from(this.models.entries()).map(([id, model]) => ({
      id,
      isActive: id === this.activeModelId,
      ...model.getMetadata()
    }));
  }
}

export const modelRegistry = new ModelRegistry();
