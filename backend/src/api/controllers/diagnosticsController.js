/**
 * MOTORSYNC Backend — Diagnostics Controller
 * 
 * Master Specification Section 5 & 25:
 * Diagnostic status and on-demand analysis endpoints.
 */

import { diagnosticService } from '../../diagnostics/diagnosticService.js';
import { motorRepository } from '../../repositories/motorRepository.js';
import { telemetryRepository } from '../../repositories/telemetryRepository.js';
import { rawTelemetryRepository } from '../../repositories/rawTelemetryRepository.js';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

export class DiagnosticsController {
  getDiagnostics(req, res) {
    const { motorId } = req.params;
    const motor = motorRepository.findByMotorId(motorId);
    if (!motor) {
      return sendError(res, 'MOTOR_NOT_FOUND', `Motor ${motorId} not found`, 404);
    }

    const rawCount = rawTelemetryRepository.countByMotorId(motorId);
    const espCount = telemetryRepository.countByMotorId(motorId, 'ESP32');
    const telemCount = telemetryRepository.countByMotorId(motorId);
    const latest = diagnosticService.getLatestDiagnostics(motorId);

    if ((rawCount === 0 && telemCount === 0) || !latest) {
      return sendSuccess(res, {
        motorId,
        hasRealTelemetry: false,
        currentDiagnosis: {
          condition: 'INSUFFICIENT_DATA',
          status: 'INSUFFICIENT DATA',
          notice: 'NO RECENT ESP32 DATA',
          faultType: 'INSUFFICIENT DATA',
          severity: 'NONE',
          confidence: null,
          evidence: ['Insufficient real ESP32 telemetry available for this unit']
        },
        recentHistory: []
      });
    }

    const history = diagnosticService.getDiagnosticHistory(motorId, 10);

    return sendSuccess(res, {
      motorId,
      hasRealTelemetry: rawCount > 0 || espCount > 0,
      currentDiagnosis: latest,
      recentHistory: history
    });
  }

  analyze(req, res) {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return sendError(res, 'INVALID_PAYLOAD', 'Payload object is required for diagnostic analysis', 400);
    }

    const result = diagnosticService.diagnoseAndSave(payload);
    return sendSuccess(res, result, { message: 'Diagnostic analysis completed' });
  }
}

export const diagnosticsController = new DiagnosticsController();
