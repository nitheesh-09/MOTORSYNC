/**
 * MOTORSYNC Backend — AI Model Registry
 * 
 * Master Specification Section 31 & 50:
 * - Decouples model registration and active inference selection.
 * - Stores metadata: modelName, version, modelType, featureSchema, trainedOn, validationMetrics, createdAt.
 * - Validation metrics strictly remain null until real evaluation exists.
 */

import { modelRepository } from '../repositories/modelRepository.js';
import { experimentalDiagnosticModel } from './experimentalDiagnosticModel.js';

class ModelRegistry {
  constructor(repo = null) {
    this.repo = repo || modelRepository;
    this.models = new Map();
    this.activeModelId = 'experimental-v0.1';

    // Register initial experimental development model
    this.registerModel('experimental-v0.1', experimentalDiagnosticModel);
  }

  registerModel(modelId, modelInstance) {
    if (!modelInstance || typeof modelInstance.predict !== 'function') {
      throw new Error(`Model ${modelId} must implement the DiagnosticModel predict() interface`);
    }
    this.models.set(modelId, modelInstance);

    // Sync metadata to database
    try {
      this.repo.upsert(modelInstance.getMetadata());
    } catch (e) {
      // Allow in-memory fallback during isolated unit tests
    }
  }

  getActiveModel() {
    return this.models.get(this.activeModelId) || this.models.get('experimental-v0.1');
  }

  setActiveModel(modelId) {
    if (!this.models.has(modelId)) {
      throw new Error(`Model ${modelId} is not registered in ModelRegistry`);
    }
    this.activeModelId = modelId;
  }

  listModels() {
    return Array.from(this.models.entries()).map(([id, model]) => ({
      id,
      isActive: id === this.activeModelId,
      ...model.getMetadata()
    }));
  }

  getStatus() {
    const active = this.getActiveModel();
    return {
      activeModelId: this.activeModelId,
      modelName: active.metadata.modelName,
      version: active.metadata.version,
      modelType: active.metadata.modelType,
      status: active.metadata.status,
      registeredCount: this.models.size
    };
  }
}

export const modelRegistry = new ModelRegistry();
