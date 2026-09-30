/**
 * MOTORSYNC Backend — Alert Engine Service
 * 
 * Master Specification Section 24:
 * Alert structure: { alertId, motorId, timestamp, category, severity, message, evidence, source }
 * Categories: VIBRATION, ELECTRICAL, THERMAL, SPEED, DATA_QUALITY, DIAGNOSTIC
 * Severities: INFO, WARNING, CRITICAL
 */

import { alertRepository } from '../repositories/alertRepository.js';

export const ALERT_CATEGORIES = {
  VIBRATION: 'VIBRATION',
  ELECTRICAL: 'ELECTRICAL',
  THERMAL: 'THERMAL',
  SPEED: 'SPEED',
  DATA_QUALITY: 'DATA_QUALITY',
  DIAGNOSTIC: 'DIAGNOSTIC'
};

export const ALERT_SEVERITIES = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL'
};

export class AlertService {
  constructor(repo = null) {
    this.repo = repo || alertRepository;
  }

  evaluateAndSave(payload = {}, diagnosticResult = {}) {
    const motorId = payload.motorId || 'MTR-001';
    const timestamp = payload.timestamp || new Date().toISOString();
    const source = payload.sourceType || 'SYNTHETIC';
    const candidateAlerts = [];

    const vib = payload.vibration || {};
    const therm = payload.thermal || {};
    const vibRms = vib.rms != null ? Number(vib.rms) : null;
    const temp = therm.temperature != null ? Number(therm.temperature) : null;

    // 1. Vibration threshold alerts (ISO 10816)
    if (vibRms != null) {
      if (vibRms > 4.5) {
        candidateAlerts.push({
          motorId,
          timestamp,
          category: ALERT_CATEGORIES.VIBRATION,
          severity: ALERT_SEVERITIES.CRITICAL,
          message: `Vibration RMS (${vibRms.toFixed(2)} mm/s) exceeds ISO 10816 Zone D trip threshold (4.5 mm/s)`,
          evidence: `Vibration RMS: ${vibRms.toFixed(2)} mm/s`,
          source
        });
      } else if (vibRms > 2.8) {
        candidateAlerts.push({
          motorId,
          timestamp,
          category: ALERT_CATEGORIES.VIBRATION,
          severity: ALERT_SEVERITIES.WARNING,
          message: `Vibration RMS (${vibRms.toFixed(2)} mm/s) in Warning Zone C (advisory limit 2.8 mm/s)`,
          evidence: `Vibration RMS: ${vibRms.toFixed(2)} mm/s`,
          source
        });
      }
    }

    // 2. Thermal threshold alerts
    if (temp != null) {
      if (temp > 80.0) {
        candidateAlerts.push({
          motorId,
          timestamp,
          category: ALERT_CATEGORIES.THERMAL,
          severity: ALERT_SEVERITIES.CRITICAL,
          message: `Critical Surface Temperature (${temp.toFixed(1)} °C) exceeding insulation envelope`,
          evidence: `Temperature: ${temp.toFixed(1)} °C`,
          source
        });
      } else if (temp > 65.0) {
        candidateAlerts.push({
          motorId,
          timestamp,
          category: ALERT_CATEGORIES.THERMAL,
          severity: ALERT_SEVERITIES.WARNING,
          message: `Elevated Operating Temperature Warning (${temp.toFixed(1)} °C)`,
          evidence: `Temperature: ${temp.toFixed(1)} °C`,
          source
        });
      }
    }

    // 3. Diagnostic alerts
    if (diagnosticResult.condition === 'FAULT' && diagnosticResult.affectedSection && diagnosticResult.affectedSection !== 'UNKNOWN') {
      candidateAlerts.push({
        motorId,
        timestamp,
        category: ALERT_CATEGORIES.DIAGNOSTIC,
        severity: ALERT_SEVERITIES.CRITICAL,
        message: `Fault Indication: ${diagnosticResult.faultType} (${diagnosticResult.affectedSection})`,
        evidence: diagnosticResult.evidence?.[0] || 'Multi-feature diagnostic pattern triggered',
        source
      });
    }

    // Deduplicate against recent alerts (5 seconds window) and persist
    const saved = [];
    for (const alert of candidateAlerts) {
      const recent = this.repo.findRecentSimilar(alert.motorId, alert.category, alert.severity, 5);
      if (!recent) {
        saved.push(this.repo.save(alert));
      }
    }

    return saved;
  }

  getAlerts(options = {}) {
    return this.repo.findAll(options);
  }

  getAlertsForMotor(motorId, limit = 50) {
    return this.repo.findByMotorId(motorId, limit);
  }

  acknowledge(alertId) {
    return this.repo.acknowledge(alertId);
  }
}

export const alertService = new AlertService();
