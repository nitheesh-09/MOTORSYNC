/**
 * MOTORSYNC Backend — Vibration Analytics Service
 * 
 * Master Specification Section 12 & 21:
 * - Processes vibration statistical descriptors and frequency-domain components.
 * - ISO 10816 vibration severity zone classification.
 * - Extracts impulsive impacting indicators (Crest Factor, Kurtosis).
 */

export class VibrationAnalyticsService {
  /**
   * Process and analyze vibration telemetry.
   * 
   * @param {Object} vibInput - Vibration features or raw extraction
   * @param {Object} baseline - Commissioning baseline
   * @returns {Object} Normalized vibration features
   */
  analyze(vibInput = {}, baseline = null) {
    const rms = vibInput.rms != null ? Number(vibInput.rms) : (vibInput.vibrationRms != null ? Number(vibInput.vibrationRms) : null);
    const peak = vibInput.peak != null ? Number(vibInput.peak) : (vibInput.vibrationPeak != null ? Number(vibInput.vibrationPeak) : null);
    const peakToPeak = vibInput.peakToPeak != null ? Number(vibInput.peakToPeak) : (peak != null ? peak * 2 : null);
    const magnitude = vibInput.magnitude != null ? Number(vibInput.magnitude) : rms;
    const variance = vibInput.variance != null ? Number(vibInput.variance) : (rms != null ? Number((rms * rms).toFixed(4)) : null);
    const standardDeviation = vibInput.standardDeviation != null ? Number(vibInput.standardDeviation) : rms;
    const crestFactor = vibInput.crestFactor != null ? Number(vibInput.crestFactor) : ((peak != null && rms != null && rms > 0) ? Number((peak / rms).toFixed(2)) : null);
    const kurtosis = vibInput.kurtosis != null ? Number(vibInput.kurtosis) : 3.0;
    const skewness = vibInput.skewness != null ? Number(vibInput.skewness) : 0.0;
    const dominantFreq = vibInput.dominantFrequency != null ? Number(vibInput.dominantFrequency) : null;
    const spectralEnergy = vibInput.spectralEnergy != null ? Number(vibInput.spectralEnergy) : null;
    const spectralEntropy = vibInput.spectralEntropy != null ? Number(vibInput.spectralEntropy) : null;

    // ISO 10816-3 Evaluation (Rigid/Flexible support class II/III industrial motors)
    let isoZone = 'ZONE_A'; // Good
    let isoStatus = 'HEALTHY';
    if (rms != null) {
      if (rms > 4.5) {
        isoZone = 'ZONE_D'; // Unacceptable / Damage danger
        isoStatus = 'FAULT';
      } else if (rms > 2.8) {
        isoZone = 'ZONE_C'; // Restricted operation / Warning
        isoStatus = 'WARNING';
      } else if (rms > 1.4) {
        isoZone = 'ZONE_B'; // Acceptable
        isoStatus = 'HEALTHY';
      }
    }

    // Impulsive impacting evaluation (Bearing defect indicators)
    const isImpulsive = (crestFactor != null && crestFactor > 3.2) || (kurtosis != null && kurtosis > 4.2);

    return {
      magnitude,
      rms,
      peak,
      peakToPeak,
      variance,
      standardDeviation,
      crestFactor,
      kurtosis,
      skewness,
      dominantFrequency: dominantFreq,
      spectralEnergy,
      spectralEntropy,
      frequencyBandEnergy: vibInput.frequencyBandEnergy || {},
      harmonics: vibInput.harmonics || [],
      isoZone,
      isoStatus,
      isImpulsive
    };
  }
}

export const vibrationAnalyticsService = new VibrationAnalyticsService();
