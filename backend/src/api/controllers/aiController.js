/**
 * MOTORSYNC Backend — AI Controller
 * 
 * Master Specification Section 5, 28, 30, 31:
 * Exposes AI model status, registry list, and metadata.
 */

import { modelRegistry } from '../../ai/modelRegistry.js';
import { sendSuccess } from '../middleware/responseHandler.js';

export class AIController {
  getStatus(req, res) {
    const status = modelRegistry.getStatus();
    return sendSuccess(res, {
      ...status,
      notice: 'Current model is an experimental development rule-feature fusion engine. Not trained on production datasets.'
    });
  }

  getModels(req, res) {
    const models = modelRegistry.listModels();
    return sendSuccess(res, { models, total: models.length });
  }
}

export const aiController = new AIController();
