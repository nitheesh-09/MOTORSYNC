/**
 * HARMONICS ANALYSIS MODULE
 * Motor Health Monitoring and Fault Diagnosis System
 * 
 * Inspects harmonic multiples of the fundamental 1X running frequency:
 * 1X = f, 2X = 2f, 3X = 3f, 4X = 4f
 * 
 * Extracts frequency, amplitude, and amplitude ratio relative to fundamental.
 * Makes this data cleanly available to the telemetry overview and diagnostics layers.
 * 
 * Important: Does not automatically claim or classify faults yet.
 */

import { DEFAULT_SIGNAL_CONFIG } from './config.js';

export class HarmonicsAnalysis {
  /**
   * Identifies 1X, 2X, 3X, and 4X harmonic components from an FFT spectrum.
   * 
   * @param {Array<{ frequency: number, amplitude: number }>} spectrum - Frequency spectrum bins.
   * @param {number|null} fundamental1X - Detected 1X running frequency in Hz.
   * @param {Object} options - Search options (maxOrder, tolerance).
   * @returns {Array<Object>} List of harmonic descriptors:
   *   [
   *     {
   *       order: '1X' | '2X' | '3X' | '4X',
   *       orderNumber: number,
   *       targetFrequency: number,
   *       detectedFrequency: number | null,
   *       amplitude: number,
   *       amplitudeRatioTo1X: number,
   *       isIdentified: boolean
   *     }
   *   ]
   */
  static extractHarmonics(spectrum, fundamental1X, options = {}) {
    if (!spectrum || !Array.isArray(spectrum) || spectrum.length === 0 || !fundamental1X || fundamental1X <= 0) {
      return [];
    }

    const maxOrder = options.maxHarmonicOrder || DEFAULT_SIGNAL_CONFIG.maxHarmonicOrder;
    const tolerance = options.harmonicTolerance || DEFAULT_SIGNAL_CONFIG.harmonicTolerance;

    const harmonics = [];
    let amp1X = 1.0;

    for (let order = 1; order <= maxOrder; order++) {
      const targetFreq = +(fundamental1X * order).toFixed(1);
      const deltaMax = Math.max(1.5, targetFreq * tolerance);

      // Find local peak closest to the target frequency within deltaMax
      let bestBin = null;
      let maxAmpInBand = 0;

      spectrum.forEach(b => {
        if (Math.abs(b.frequency - targetFreq) <= deltaMax) {
          if (b.amplitude > maxAmpInBand) {
            maxAmpInBand = b.amplitude;
            bestBin = b;
          }
        }
      });

      const isIdentified = bestBin !== null && bestBin.amplitude > 0.15;
      const detectedFreq = isIdentified ? bestBin.frequency : null;
      const amplitude = isIdentified ? +(bestBin.amplitude).toFixed(3) : 0;

      if (order === 1 && isIdentified) {
        amp1X = amplitude > 0 ? amplitude : 1.0;
      }

      const ratio = amp1X > 0 ? +(amplitude / amp1X).toFixed(2) : 0;

      harmonics.push({
        order: `${order}X`,
        orderNumber: order,
        targetFrequency: targetFreq,
        detectedFrequency: detectedFreq,
        amplitude,
        amplitudeRatioTo1X: ratio,
        isIdentified
      });
    }

    return harmonics;
  }
}
