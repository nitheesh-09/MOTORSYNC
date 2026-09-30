/**
 * MOTORSYNC Backend — Baseline Controller
 * 
 * Master Specification Section 5 & 22:
 * Retrieve and set motor commissioning baselines.
 */

import { baselineService } from '../../baselines/baselineService.js';
import { motorRepository } from '../../repositories/motorRepository.js';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

export class BaselineController {
  getBaseline(req, res) {
    const { motorId } = req.params;
    const motor = motorRepository.findByMotorId(motorId);
    if (!motor) {
      return sendError(res, 'MOTOR_NOT_FOUND', `Motor ${motorId} not found`, 404);
    }

    const baseline = baselineService.getBaseline(motorId);
    return sendSuccess(res, { motorId, baseline });
  }

  setBaseline(req, res) {
    const { motorId } = req.params;
    const motor = motorRepository.findByMotorId(motorId);
    if (!motor) {
      return sendError(res, 'MOTOR_NOT_FOUND', `Motor ${motorId} not found`, 404);
    }

    const updated = baselineService.setBaseline(motorId, req.body);
    return sendSuccess(res, { motorId, baseline: updated }, { message: 'Baseline updated successfully' });
  }
}

export const baselineController = new BaselineController();
