/**
 * MOTORSYNC Backend — AI Feature Builder
 * 
 * Master Specification Section 32 & 33:
 * - Constructs normalized feature vectors with explicit availability metadata.
 * - NEVER silently replaces missing values with arbitrary zeros.
 * - Tracks { value, available, reason } for each feature channel.
 */

export class FeatureBuilder {
  /**
   * Build structured feature vector from raw or normalized payload.
   * 
   * @param {Object} payload - Incoming payload
   * @param {Object} baselineDeviations - Output from BaselineService
   * @returns {Object} Structured feature vector with availability state
   */
  build(payload = {}, baselineDeviations = {}) {
    const motorId = payload.motorId || 'UNKNOWN';
    const elec = payload.electrical || {};
    const therm = payload.thermal || {};
    const vib = payload.vibration || {};

    const features = {};

    // Helper to wrap feature with availability
    const wrap = (val, reason = 'Feature not provided in payload') => {
      if (val !== undefined && val !== null && !isNaN(Number(val))) {
        return { value: Number(val), available: true, reason: null };
      }
      return { value: null, available: false, reason };
    };

    // Electrical Features
    features.voltageRms = wrap(elec.voltageRms);
    features.currentRms = wrap(elec.currentRms);
    features.currentStdDev = wrap(elec.currentStdDev);
    features.currentPeak = wrap(elec.currentPeak);
    features.currentPeakToPeak = wrap(elec.currentPeakToPeak);
    features.power = wrap(elec.power);

    // Thermal Features
    features.temperature = wrap(therm.temperature);
    features.temperatureRiseFromBaseline = wrap(
      baselineDeviations.temperatureRiseFromBaseline ?? therm.temperatureRiseFromBaseline,
      baselineDeviations.baselineStatus === 'NOT_AVAILABLE' ? 'Baseline: Not available' : 'Thermal rise not computed'
    );
    features.temperatureRiseRate = wrap(therm.temperatureRiseRate);
    features.temperatureVariation = wrap(therm.temperatureVariation);

    // Vibration Features
    features.vibrationMagnitude = wrap(vib.magnitude ?? vib.rms);
    features.vibrationRms = wrap(vib.rms);
    features.vibrationPeak = wrap(vib.peak);
    features.vibrationPeakToPeak = wrap(vib.peakToPeak);
    features.vibrationVariance = wrap(vib.variance);
    features.vibrationStdDev = wrap(vib.standardDeviation);
    features.vibrationKurtosis = wrap(vib.kurtosis);
    features.vibrationSkewness = wrap(vib.skewness);
    features.vibrationCrestFactor = wrap(vib.crestFactor);
    features.dominantFrequency = wrap(vib.dominantFrequency);
    features.spectralEnergy = wrap(vib.spectralEnergy);
    features.spectralEntropy = wrap(vib.spectralEntropy);

    // Speed Features
    features.rpm = wrap(payload.rpm, 'Derived RPM unavailable or 1X not detected');
    features.runningFrequency = wrap(payload.runningFrequency, '1X rotational frequency not isolated');

    // Count available primary features
    const primaryKeys = ['vibrationRms', 'temperature', 'currentRms', 'voltageRms'];
    const availablePrimaryCount = primaryKeys.filter(k => features[k].available).length;

    return {
      motorId,
      features,
      availablePrimaryCount,
      isSufficientForDiagnosis: availablePrimaryCount > 0,
      timestamp: payload.timestamp || new Date().toISOString()
    };
  }
}

export const featureBuilder = new FeatureBuilder();
