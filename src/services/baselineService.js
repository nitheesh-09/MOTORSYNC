/**
 * MOTORSYNC — Baseline Management Service
 * 
 * Provides motor-specific healthy operating baselines and calculates deviations.
 * Adheres to Master Specification Section 23:
 * - Does NOT fabricate baselines.
 * - Supports "Baseline: Not available" if a baseline has not been established.
 * - Compares temperature rise, vibration increase, current deviation, and spectral changes.
 */

// Baseline registry for fleet motors
// In real operations, baselines are computed from healthy commissioning run telemetry.
const DEFAULT_MOTOR_BASELINES = {
  'MTR-001': {
    status: 'ESTABLISHED',
    establishedDate: '2026-08-15',
    normalTemperature: 42.0,      // °C
    normalVibrationRms: 0.82,     // mm/s
    normalCurrentRms: 2.15,       // A
    normalVoltageRms: 230.0,      // V
    nominal1XFreq: 24.7,          // Hz (~1482 RPM)
    normalCrestFactor: 2.2,
    normalHarmonicDistortion: 1.8 // %
  },
  'MTR-002': {
    status: 'ESTABLISHED',
    establishedDate: '2026-08-20',
    normalTemperature: 48.5,      // °C
    normalVibrationRms: 1.15,     // mm/s
    normalCurrentRms: 8.40,       // A
    normalVoltageRms: 400.0,      // V
    nominal1XFreq: 24.5,          // Hz (~1470 RPM)
    normalCrestFactor: 2.4,
    normalHarmonicDistortion: 2.1 // %
  },
  'MTR-003': {
    status: 'ESTABLISHED',
    establishedDate: '2026-08-22',
    normalTemperature: 51.0,      // °C
    normalVibrationRms: 0.95,     // mm/s
    normalCurrentRms: 18.2,       // A
    normalVoltageRms: 400.0,      // V
    nominal1XFreq: 49.3,          // Hz (~2958 RPM)
    normalCrestFactor: 2.3,
    normalHarmonicDistortion: 1.9 // %
  },
  'MTR-004': {
    status: 'ESTABLISHED',
    establishedDate: '2026-09-01',
    normalTemperature: 45.0,      // °C
    normalVibrationRms: 1.30,     // mm/s
    normalCurrentRms: 4.80,       // A
    normalVoltageRms: 230.0,      // V
    nominal1XFreq: 16.2,          // Hz (~972 RPM)
    normalCrestFactor: 2.5,
    normalHarmonicDistortion: 2.4 // %
  },
  'MTR-005': {
    // Demonstration of an uncommissioned unit with NO baseline established (Section 23)
    status: 'NOT_AVAILABLE',
    establishedDate: null,
    normalTemperature: null,
    normalVibrationRms: null,
    normalCurrentRms: null,
    normalVoltageRms: null,
    nominal1XFreq: null,
    normalCrestFactor: null,
    normalHarmonicDistortion: null
  }
};

class BaselineService {
  constructor() {
    this.baselines = { ...DEFAULT_MOTOR_BASELINES };
  }

  /**
   * Retrieve baseline for a specific motor
   * @param {string} motorId
   * @returns {Object|null}
   */
  getMotorBaseline(motorId) {
    return this.baselines[motorId] || {
      status: 'NOT_AVAILABLE',
      establishedDate: null,
      normalTemperature: null,
      normalVibrationRms: null,
      normalCurrentRms: null,
      normalVoltageRms: null,
      nominal1XFreq: null
    };
  }

  /**
   * Set or update baseline for a motor
   * @param {string} motorId 
   * @param {Object} baselineData 
   */
  setMotorBaseline(motorId, baselineData) {
    this.baselines[motorId] = {
      ...baselineData,
      status: baselineData.status || 'ESTABLISHED',
      establishedDate: baselineData.establishedDate || (baselineData.status === 'ESTABLISHED' ? new Date().toISOString().split('T')[0] : null)
    };
  }

  /**
   * Calculate deviations of incoming telemetry from the established baseline.
   * If baseline is NOT available or insufficient, all deviations return null (Master Specification Section 23).
   * 
   * @param {string} motorId 
   * @param {Object} currentData - { temperature, vibrationRms, currentRms, voltageRms, dominantFreq, crestFactor }
   * @returns {Object} deviations
   */
  calculateDeviations(motorId, currentData = {}) {
    const base = this.getMotorBaseline(motorId);

    if (!base || base.status !== 'ESTABLISHED') {
      const isInsufficient = base?.status === 'INSUFFICIENT_REAL_DATA';
      const label = isInsufficient ? 'BASELINE: INSUFFICIENT REAL DATA' : 'Baseline: Not available';
      return {
        baselineStatus: base?.status || 'NOT_AVAILABLE',
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

    // Safely extract measurements
    const currentTemp = currentData.temperature ?? currentData.thermal?.temperature;
    const currentVib = currentData.vibrationRms ?? currentData.vibration?.rms;
    const currentCurrent = currentData.currentRms ?? currentData.electrical?.currentRms;
    const currentVolt = currentData.voltageRms ?? currentData.electrical?.voltageRms;
    const currentCrest = currentData.crestFactor ?? currentData.vibration?.crestFactor;
    const currentFreq = currentData.dominantFrequency ?? currentData.vibration?.dominantFrequency;

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
