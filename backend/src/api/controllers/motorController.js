/**
 * MOTORSYNC Backend — Motor Controller
 * 
 * Master Specification Section 5 & 7:
 * RESTful CRUD endpoints for Fleet Motors.
 */

import { motorRepository } from '../../repositories/motorRepository.js';
import { telemetryRepository } from '../../repositories/telemetryRepository.js';
import { baselineRepository } from '../../repositories/baselineRepository.js';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

export class MotorController {
  getAll(req, res) {
    const motors = motorRepository.findAll();

    // Attach latest real ESP32 telemetry snapshot to each motor for fast fleet overview (Task 3, 5)
    const fleetWithLatest = motors.map(m => {
      const latest = telemetryRepository.findLatestByMotorId(m.motorId, 'ESP32');
      const baseline = baselineRepository.findByMotorId(m.motorId);
      const isEsp32 = latest?.sourceType === 'ESP32';
      return {
        ...m,
        latestTelemetry: latest || null,
        hasRealTelemetry: isEsp32,
        dataSourceType: isEsp32 ? 'ESP32' : 'NO_DATA',
        baselineStatus: baseline?.status || 'NOT_AVAILABLE'
      };
    });

    return sendSuccess(res, { motors: fleetWithLatest, total: fleetWithLatest.length });
  }

  getById(req, res) {
    const { motorId } = req.params;
    const motor = motorRepository.findByMotorId(motorId);
    if (!motor) {
      return sendError(res, 'MOTOR_NOT_FOUND', `Motor with ID ${motorId} not found`, 404);
    }

    const latest = telemetryRepository.findLatestByMotorId(motorId, 'ESP32');
    const baseline = baselineRepository.findByMotorId(motorId);

    return sendSuccess(res, {
      motor,
      latestTelemetry: latest || null,
      hasRealTelemetry: latest?.sourceType === 'ESP32',
      baseline
    });
  }

  create(req, res) {
    const { motorId, name, location, motorType, ratedVoltage, ratedCurrent, ratedRPM } = req.body;

    if (!motorId || !name) {
      return sendError(res, 'INVALID_PAYLOAD', 'Fields motorId and name are required', 400);
    }

    const existing = motorRepository.findByMotorId(motorId);
    if (existing) {
      return sendError(res, 'MOTOR_ALREADY_EXISTS', `Motor ${motorId} is already registered`, 409);
    }

    const created = motorRepository.create({
      motorId,
      name,
      location: location || 'Plant Floor',
      motorType: motorType || '3-Phase Induction',
      ratedVoltage: ratedVoltage || 400.0,
      ratedCurrent: ratedCurrent || 10.0,
      ratedRPM: ratedRPM || 1500.0,
      status: 'HEALTHY'
    });

    return sendSuccess(res, { motor: created }, { message: 'Motor registered successfully' }, 201);
  }

  update(req, res) {
    const { motorId } = req.params;
    const updated = motorRepository.update(motorId, req.body);
    if (!updated) {
      return sendError(res, 'MOTOR_NOT_FOUND', `Motor ${motorId} not found`, 404);
    }

    return sendSuccess(res, { motor: updated }, { message: 'Motor updated successfully' });
  }

  delete(req, res) {
    const { motorId } = req.params;
    const success = motorRepository.delete(motorId);
    if (!success) {
      return sendError(res, 'MOTOR_NOT_FOUND', `Motor ${motorId} not found`, 404);
    }

    return sendSuccess(res, { deletedMotorId: motorId }, { message: 'Motor deleted successfully' });
  }
}

export const motorController = new MotorController();
