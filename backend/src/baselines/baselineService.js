/**
 * MOTORSYNC Backend — Baseline Service
 * 
 * Master Specification Section 22:
 * - Manages per-motor healthy operating baselines.
 * - Computes deviations for incoming telemetry.
 * - If baseline is not established, returns "Baseline: Not available" without fabricating numbers.
 */

import { baselineRepository } from '../repositories/baselineRepository.js';

export class BaselineService {
  constructor(repo = null) {
    this.repo = repo || baselineRepository;
  }

  getBaseline(motorId) {
    return this.repo.findByMotorId(motorId) || {
      status: 'NOT_AVAILABLE',
      establishedDate: null,
      normalTemperature: null,
      normalVibrationRms: null,
      normalCurrentRms: null,
      normalVoltageRms: null,
      nominal1XFreq: null,
      normalCrestFactor: null,
      normalHarmonicDistortion: null
    };
  }

  setBaseline(motorId, baselineData) {
    return this.repo.upsert({
      motorId,
      ...baselineData,
      status: 'ESTABLISHED',
      establishedDate: baselineData.establishedDate || new Date().toISOString().split('T')[0]
    });
  }

  /**
   * Calculate deviations of current features from baseline.
   * 
   * @param {string} motorId 
   * @param {Object} currentFeatures - { temperature, vibrationRms, currentRms, voltageRms, dominantFrequency, crestFactor }
   * @returns {Object} Deviation metrics
   */
  calculateDeviations(motorId, currentFeatures = {}) {
    const base = this.getBaseline(motorId);

    if (!base || base.status !== 'ESTABLISHED') {
      const isInsufficient = base?.status === 'INSUFFICIENT_REAL_DATA';
      const label = isInsufficient ? 'BASELINE: INSUFFICIENT REAL DATA' : 'Baseline: Not available';
      return {
        baselineStatus: base?.status || 'INSUFFICIENT_REAL_DATA',
        temperatureRiseFromBaseline: null,
        temperatureRiseLabel: label,
        vibrationRiseFromBaseline: null,
        vibrationRiseLabel: label,
        currentDeviationFromBaseline: null,
        currentDeviationLabel: label,
        voltageDeviationFromBaseline: null,
        voltageDeviationLabel: label,
        crestFactorDeviation: null,
        spectralShift: null,
        hasSignificantDeviation: false,
        summary: isInsufficient ? 'BASELINE: INSUFFICIENT REAL DATA' : 'Baseline not established for this unit'
      };
    }

    const currentTemp = currentFeatures.temperature ?? currentFeatures.thermal?.temperature;
    const currentVib = currentFeatures.vibrationRms ?? currentFeatures.vibration?.rms;
    const currentCurrent = currentFeatures.currentRms ?? currentFeatures.electrical?.currentRms;
    const currentVolt = currentFeatures.voltageRms ?? currentFeatures.electrical?.voltageRms;
    const currentCrest = currentFeatures.crestFactor ?? currentFeatures.vibration?.crestFactor;
    const currentFreq = currentFeatures.dominantFrequency ?? currentFeatures.vibration?.dominantFrequency;

    const tempRise = (currentTemp != null && base.normalTemperature != null)
      ? parseFloat((currentTemp - base.normalTemperature).toFixed(2))
      : null;

    const vibRise = (currentVib != null && base.normalVibrationRms != null)
      ? parseFloat((currentVib - base.normalVibrationRms).toFixed(2))
      : null;

    const currDev = (currentCurrent != null && base.normalCurrentRms != null)
      ? parseFloat((currentCurrent - base.normalCurrentRms).toFixed(2))
      : null;

    const voltDev = (currentVolt != null && base.normalVoltageRms != null)
      ? parseFloat((currentVolt - base.normalVoltageRms).toFixed(2))
      : null;

    const crestDev = (currentCrest != null && base.normalCrestFactor != null)
      ? parseFloat((currentCrest - base.normalCrestFactor).toFixed(2))
      : null;

    const freqShift = (currentFreq != null && base.nominal1XFreq != null)
      ? parseFloat(Math.abs(currentFreq - base.nominal1XFreq).toFixed(2))
      : null;

    const hasSignificantDeviation = Boolean(
      (tempRise != null && tempRise > 10.0) ||
      (vibRise != null && vibRise > 1.5) ||
      (currDev != null && Math.abs(currDev) > (base.normalCurrentRms * 0.25)) ||
      (crestDev != null && crestDev > 1.0)
    );

    return {
      baselineStatus: 'ESTABLISHED',
      establishedDate: base.establishedDate,
      baselineValues: base,
      temperatureRiseFromBaseline: tempRise,
      temperatureRiseLabel: tempRise != null ? `${tempRise > 0 ? '+' : ''}${tempRise.toFixed(1)} °C` : 'N/A',
      vibrationRiseFromBaseline: vibRise,
      vibrationRiseLabel: vibRise != null ? `${vibRise > 0 ? '+' : ''}${vibRise.toFixed(2)} mm/s` : 'N/A',
      currentDeviationFromBaseline: currDev,
      currentDeviationLabel: currDev != null ? `${currDev > 0 ? '+' : ''}${currDev.toFixed(2)} A` : 'N/A',
      voltageDeviationFromBaseline: voltDev,
      crestFactorDeviation: crestDev,
      spectralShift: freqShift,
      hasSignificantDeviation,
      summary: hasSignificantDeviation ? 'Significant baseline deviation observed' : 'Operating within nominal baseline tolerance'
    };
  }
}

export const baselineService = new BaselineService();
