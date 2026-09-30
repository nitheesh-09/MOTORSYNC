/**
 * MOTORSYNC Backend — Electrical Analytics Service
 * 
 * Master Specification Section 10 & 19:
 * - Computes real and apparent electrical characteristics.
 * - Power = Voltage RMS * Current RMS (for single-phase equivalent) or sqrt(3) * V * I (3-phase).
 * - Clearly documents calculation assumptions and units.
 * - Never silently mixes instantaneous and RMS quantities.
 */

export class ElectricalAnalyticsService {
  /**
   * Process and analyze electrical telemetry.
   * 
   * @param {Object} electricalInput - Raw or preprocessed electrical telemetry
   * @param {Object} motorMetadata - Motor rated voltage and current
   * @returns {Object} Normalized electrical features
   */
  analyze(electricalInput = {}, motorMetadata = {}) {
    const vRms = electricalInput.voltageRms != null ? Number(electricalInput.voltageRms) : null;
    const iRms = electricalInput.currentRms != null ? Number(electricalInput.currentRms) : null;
    const iStdDev = electricalInput.currentStdDev != null ? Number(electricalInput.currentStdDev) : null;
    const iPeak = electricalInput.currentPeak != null ? Number(electricalInput.currentPeak) : null;
    const iPeakToPeak = electricalInput.currentPeakToPeak != null ? Number(electricalInput.currentPeakToPeak) : (iPeak != null ? iPeak * 2 : null);

    // Compute power: P = sqrt(3) * V_line * I_line * pf (assume pf ~ 0.85 for induction) or simple V * I
    let power = electricalInput.power != null ? Number(electricalInput.power) : null;
    let powerCalculationMethod = 'Supplied by telemetry source';

    if (power == null && vRms != null && iRms != null) {
      // 3-phase active power estimation: P = sqrt(3) * V * I * 0.85 / 1000 kW
      power = parseFloat(((Math.sqrt(3) * vRms * iRms * 0.85) / 1000).toFixed(3));
      powerCalculationMethod = 'Estimated 3-phase Active Power: sqrt(3) * V_rms * I_rms * 0.85 PF (kW)';
    }

    // Overload check against rated current
    const ratedCurrent = motorMetadata.ratedCurrent || 15.0;
    const isOverloaded = iRms != null ? (iRms > ratedCurrent * 1.15) : false;
    const loadPercentage = (iRms != null && ratedCurrent > 0) ? parseFloat(((iRms / ratedCurrent) * 100).toFixed(1)) : null;

    return {
      voltageRms: vRms,
      currentRms: iRms,
      currentStdDev: iStdDev,
      currentPeak: iPeak,
      currentPeakToPeak: iPeakToPeak,
      power,
      powerUnit: 'kW',
      powerCalculationMethod,
      loadPercentage,
      isOverloaded,
      currentSpectralFeatures: electricalInput.currentSpectralFeatures || {
        fundamentalFrequency: 50.0,
        thd: electricalInput.thd || null
      }
    };
  }
}

export const electricalAnalyticsService = new ElectricalAnalyticsService();
