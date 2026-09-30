/**
 * MOTORSYNC Backend — Alert Controller
 * 
 * Master Specification Section 5 & 24:
 * Alert query and acknowledgment endpoints.
 */

import { alertService } from '../../alerts/alertService.js';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

export class AlertController {
  getAll(req, res) {
    const { motorId, category, severity, limit, offset } = req.query;
    const alerts = alertService.getAlerts({ motorId, category, severity, limit, offset });
    return sendSuccess(res, { alerts, total: alerts.length });
  }

  getByMotorId(req, res) {
    const { motorId } = req.params;
    const { limit } = req.query;
    const alerts = alertService.getAlertsForMotor(motorId, parseInt(limit || '50', 10));
    return sendSuccess(res, { motorId, alerts, total: alerts.length });
  }

  acknowledge(req, res) {
    const { alertId } = req.params;
    const success = alertService.acknowledge(alertId);
    if (!success) {
      return sendError(res, 'ALERT_NOT_FOUND', `Alert ${alertId} not found`, 404);
    }
    return sendSuccess(res, { alertId, isAcknowledged: true }, { message: 'Alert acknowledged' });
  }
}

export const alertController = new AlertController();
