/**
 * MOTORSYNC Backend — Health Assessment Service
 * 
 * Master Specification Section 23:
 * - Transparent health evaluation layer before AI diagnosis.
 * - States: HEALTHY, WARNING, FAULT, OFFLINE, INSUFFICIENT_DATA.
 * - Does not assume missing values are zero.
 * - All thresholds configurable and marked EXPERIMENTAL.
 */

export const HEALTH_STATES = {
  HEALTHY: 'HEALTHY',
  WARNING: 'WARNING',
  FAULT: 'FAULT',
  OFFLINE: 'OFFLINE',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA'
};

export class HealthAssessmentService {
  /**
   * Evaluate multi-signal health state.
   * 
   * @param {Object} payload - Normalized telemetry payload
   * @param {Object} deviations - Baseline deviations
   * @returns {Object} Health assessment result
   */
  evaluate(payload = {}, deviations = {}) {
    const motorId = payload.motorId;
    const vib = payload.vibration || {};
    const therm = payload.thermal || {};
    const elec = payload.electrical || {};

    const vibRms = vib.rms != null ? Number(vib.rms) : null;
    const temp = therm.temperature != null ? Number(therm.temperature) : null;
    const currentRms = elec.currentRms != null ? Number(elec.currentRms) : null;
    const voltageRms = elec.voltageRms != null ? Number(elec.voltageRms) : null;

    // Check if telemetry is empty
    const availableSignals = [vibRms, temp, currentRms, voltageRms].filter(v => v != null).length;
    if (availableSignals === 0) {
      return {
        motorId,
        state: HEALTH_STATES.INSUFFICIENT_DATA,
        score: null,
        indicators: ['No transducer measurements or processed features supplied'],
        evaluationType: 'EXPERIMENTAL_MULTI_SIGNAL_CHECK'
      };
    }

    const indicators = [];
    let state = HEALTH_STATES.HEALTHY;
    let score = 96;

    // 1. Vibration rules (ISO 10816)
    if (vibRms != null) {
      if (vibRms > 4.5) {
        state = HEALTH_STATES.FAULT;
        score = Math.min(score, 32);
        indicators.push(`Vibration RMS (${vibRms.toFixed(2)} mm/s) exceeds ISO 10816 Zone D trip threshold (4.5 mm/s)`);
      } else if (vibRms > 2.8) {
        if (state !== HEALTH_STATES.FAULT) state = HEALTH_STATES.WARNING;
        score = Math.min(score, 68);
        indicators.push(`Vibration RMS (${vibRms.toFixed(2)} mm/s) in ISO Zone C advisory limit (2.8 mm/s)`);
      }
    }

    // 2. Impulsive impacting (Crest factor / Kurtosis)
    if (vib.crestFactor != null && vib.crestFactor > 3.2) {
      if (state !== HEALTH_STATES.FAULT) state = HEALTH_STATES.WARNING;
      score = Math.min(score, 60);
      indicators.push(`Elevated crest factor (${vib.crestFactor.toFixed(2)} > 3.2 indicates impulsive impacting)`);
    }

    // 3. Thermal rules
    if (temp != null) {
      if (temp > 80.0) {
        state = HEALTH_STATES.FAULT;
        score = Math.min(score, 25);
        indicators.push(`Operating temperature (${temp.toFixed(1)} °C) exceeds critical limit (80 °C)`);
      } else if (temp > 65.0) {
        if (state !== HEALTH_STATES.FAULT) state = HEALTH_STATES.WARNING;
        score = Math.min(score, 65);
        indicators.push(`Operating temperature (${temp.toFixed(1)} °C) in warning zone (> 65 °C)`);
      }
    }

    // 4. Baseline deviation impact
    if (deviations.baselineStatus === 'ESTABLISHED') {
      if (deviations.temperatureRiseFromBaseline != null && deviations.temperatureRiseFromBaseline > 15.0) {
        if (state !== HEALTH_STATES.FAULT) state = HEALTH_STATES.WARNING;
        score = Math.min(score, 55);
        indicators.push(`Excessive thermal rise: +${deviations.temperatureRiseFromBaseline.toFixed(1)} °C from healthy baseline`);
      }
      if (deviations.vibrationRiseFromBaseline != null && deviations.vibrationRiseFromBaseline > 2.0) {
        if (state !== HEALTH_STATES.FAULT) state = HEALTH_STATES.WARNING;
        score = Math.min(score, 45);
        indicators.push(`Excessive vibration rise: +${deviations.vibrationRiseFromBaseline.toFixed(2)} mm/s from baseline`);
      }
    }

    if (indicators.length === 0) {
      indicators.push('All observed telemetry features within nominal operating envelope');
    }

    return {
      motorId,
      state,
      score,
      indicators,
      evaluationType: 'EXPERIMENTAL_MULTI_SIGNAL_CHECK'
    };
  }
}

export const healthAssessmentService = new HealthAssessmentService();
