/**
 * MOTORSYNC — Alert Management Service
 * 
 * Master Specification Section 34:
 * Alert schema:
 * {
 *   alertId,
 *   motorId,
 *   timestamp,
 *   category,
 *   severity,
 *   message,
 *   evidence,
 *   source
 * }
 * Categories: VIBRATION, ELECTRICAL, THERMAL, SPEED, DIAGNOSTIC, DATA_QUALITY
 * Severity: INFO, WARNING, CRITICAL
 */

export const ALERT_CATEGORIES = {
  VIBRATION: 'Vibration',
  ELECTRICAL: 'Electrical',
  THERMAL: 'Thermal',
  SPEED: 'Speed',
  DIAGNOSTIC: 'Diagnostic',
  DATA_QUALITY: 'Data Quality'
};

export const ALERT_SEVERITIES = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL'
};

class AlertService {
  constructor() {
    this.alerts = [];
    this.maxHistory = 100;
  }

  /**
   * Evaluate telemetry payload and diagnostic assessment to generate alerts.
   * Prevents spamming duplicate alerts.
   * 
   * @param {Object} motorPayload 
   * @param {Object} diagnosticResult 
   * @returns {Array<Object>} newly generated alerts
   */
  evaluate(motorPayload = {}, diagnosticResult = {}) {
    const motorId = motorPayload.motorId || 'MTR-001';
    const timestamp = motorPayload.timestamp || new Date().toISOString();
    const source = motorPayload.sourceType || 'SYNTHETIC';
    const newAlerts = [];

    const vib = motorPayload.vibration?.rms ?? motorPayload.metrics?.vibration;
    const temp = motorPayload.thermal?.temperature ?? motorPayload.metrics?.temperature;
    const curr = motorPayload.electrical?.currentRms ?? motorPayload.metrics?.current;

    // 1. Vibration threshold alerts (ISO 10816)
    if (vib != null) {
      if (vib > 4.5) {
        newAlerts.push(this._createAlert(
          motorId,
          ALERT_CATEGORIES.VIBRATION,
          ALERT_SEVERITIES.CRITICAL,
          `Vibration RMS (${vib.toFixed(2)} mm/s) exceeds ISO 10816 Zone D Trip Threshold (4.5 mm/s)`,
          `RMS: ${vib.toFixed(2)} mm/s, ISO threshold: 4.5 mm/s`,
          source,
          timestamp
        ));
      } else if (vib > 2.8) {
        newAlerts.push(this._createAlert(
          motorId,
          ALERT_CATEGORIES.VIBRATION,
          ALERT_SEVERITIES.WARNING,
          `Vibration RMS (${vib.toFixed(2)} mm/s) in Warning Zone C (advisory limit 2.8 mm/s)`,
          `RMS: ${vib.toFixed(2)} mm/s`,
          source,
          timestamp
        ));
      }
    }

    // 2. Thermal threshold alerts
    if (temp != null) {
      if (temp > 80.0) {
        newAlerts.push(this._createAlert(
          motorId,
          ALERT_CATEGORIES.THERMAL,
          ALERT_SEVERITIES.CRITICAL,
          `Critical Stator / Frame Surface Temperature (${temp.toFixed(1)} °C)`,
          `Surface temp exceeds class B thermal limit (80 °C)`,
          source,
          timestamp
        ));
      } else if (temp > 65.0) {
        newAlerts.push(this._createAlert(
          motorId,
          ALERT_CATEGORIES.THERMAL,
          ALERT_SEVERITIES.WARNING,
          `Elevated Temperature Warning (${temp.toFixed(1)} °C)`,
          `Temperature exceeds normal operating threshold 65 °C`,
          source,
          timestamp
        ));
      }
    }

    // 3. Diagnostic Fault alerts
    if (diagnosticResult.condition === 'FAULT' && diagnosticResult.affectedSection !== 'UNKNOWN') {
      newAlerts.push(this._createAlert(
        motorId,
        ALERT_CATEGORIES.DIAGNOSTIC,
        ALERT_SEVERITIES.CRITICAL,
        `Fault Indication: ${diagnosticResult.faultType} (${diagnosticResult.affectedSection})`,
        diagnosticResult.evidence?.[0] || 'Multi-feature diagnostic classifier threshold triggered',
        source,
        timestamp
      ));
    }

    // 4. Data Quality alerts
    if (diagnosticResult.condition === 'INSUFFICIENT DATA') {
      newAlerts.push(this._createAlert(
        motorId,
        ALERT_CATEGORIES.DATA_QUALITY,
        ALERT_SEVERITIES.WARNING,
        'Telemetry stream missing mandatory transducer channels',
        'Physical sensor channels are unpopulated or disconnected',
        source,
        timestamp
      ));
    }

    // Dedup and append
    const nonDuplicateAlerts = newAlerts.filter(alert => {
      // Check if an identical category + severity alert exists for this motor within last 5 seconds
      const exists = this.alerts.some(a => 
        a.motorId === alert.motorId && 
        a.category === alert.category && 
        a.severity === alert.severity &&
        Math.abs(new Date(alert.timestamp).getTime() - new Date(a.timestamp).getTime()) < 5000
      );
      return !exists;
    });

    nonDuplicateAlerts.forEach(alert => {
      this.alerts.unshift(alert);
    });

    if (this.alerts.length > this.maxHistory) {
      this.alerts = this.alerts.slice(0, this.maxHistory);
    }

    return nonDuplicateAlerts;
  }

  _createAlert(motorId, category, severity, message, evidence, source, timestamp) {
    return {
      alertId: `ALT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
      motorId,
      timestamp,
      category,
      severity,
      message,
      evidence,
      source
    };
  }

  getAlertsForMotor(motorId) {
    return this.alerts.filter(a => !motorId || a.motorId === motorId);
  }

  getAllAlerts() {
    return [...this.alerts];
  }

  clearAlerts() {
    this.alerts = [];
  }
}

export const alertService = new AlertService();
