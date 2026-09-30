/**
 * MOTORSYNC Backend — Thermal Analytics Service
 * 
 * Master Specification Section 11 & 20:
 * - Monitors surface and winding temperature.
 * - Computes thermal rise from healthy baseline (Delta T) and rise rate.
 * - If baseline is not available, explicitly marks baseline comparison as unavailable.
 * - Never fabricates healthy baseline values.
 */

export class ThermalAnalyticsService {
  /**
   * Process thermal telemetry against healthy baseline.
   * 
   * @param {Object} thermalInput - { temperature, temperatureRiseRate, temperatureVariation }
   * @param {Object} baseline - Motor baseline from BaselineService
   * @returns {Object} Normalized thermal features
   */
  analyze(thermalInput = {}, baseline = null) {
    const temp = thermalInput.temperature != null ? Number(thermalInput.temperature) : null;
    const riseRate = thermalInput.temperatureRiseRate != null ? Number(thermalInput.temperatureRiseRate) : null;
    const variation = thermalInput.temperatureVariation != null ? Number(thermalInput.temperatureVariation) : null;

    let tempRiseFromBaseline = null;
    let baselineComparison = 'Baseline: Not available';

    if (temp != null && baseline && baseline.status === 'ESTABLISHED' && baseline.normalTemperature != null) {
      tempRiseFromBaseline = parseFloat((temp - baseline.normalTemperature).toFixed(2));
      baselineComparison = `${tempRiseFromBaseline > 0 ? '+' : ''}${tempRiseFromBaseline.toFixed(1)} °C relative to baseline (${baseline.normalTemperature} °C)`;
    }

    // Thermal envelope evaluation (NEMA / IEC standard class B/F limits)
    let thermalStatus = 'NORMAL';
    if (temp != null) {
      if (temp > 80.0) thermalStatus = 'CRITICAL';
      else if (temp > 65.0) thermalStatus = 'WARNING';
    }

    return {
      temperature: temp,
      temperatureRiseFromBaseline: tempRiseFromBaseline,
      temperatureRiseRate: riseRate,
      temperatureVariation: variation,
      baselineComparison,
      thermalStatus
    };
  }
}

export const thermalAnalyticsService = new ThermalAnalyticsService();
