/**
 * MOTORSYNC Backend — Time-Domain Feature Extraction Service
 * 
 * Master Specification Section 16 & 21:
 * Computes exact statistical descriptors over raw time-domain waveforms.
 */

export class TimeDomainFeaturesService {
  /**
   * Compute statistical time-domain features.
   * 
   * @param {number[]} samples - Discrete signal values
   * @returns {Object} Extracted statistical features
   */
  extract(samples) {
    if (!Array.isArray(samples) || samples.length === 0) {
      return {
        magnitude: 0,
        rms: 0,
        peak: 0,
        peakToPeak: 0,
        variance: 0,
        standardDeviation: 0,
        kurtosis: 0,
        skewness: 0,
        crestFactor: 0
      };
    }

    const n = samples.length;
    let sum = 0;
    let sumSq = 0;
    let min = Infinity;
    let max = -Infinity;
    let peak = 0;

    for (let i = 0; i < n; i++) {
      const v = samples[i];
      sum += v;
      sumSq += v * v;
      if (v < min) min = v;
      if (v > max) max = v;
      const absV = Math.abs(v);
      if (absV > peak) peak = absV;
    }

    const mean = sum / n;
    const rms = Math.sqrt(sumSq / n);
    const peakToPeak = max - min;

    let varSum = 0;
    let m3Sum = 0;
    let m4Sum = 0;

    for (let i = 0; i < n; i++) {
      const diff = samples[i] - mean;
      const d2 = diff * diff;
      varSum += d2;
      m3Sum += d2 * diff;
      m4Sum += d2 * d2;
    }

    const variance = varSum / n;
    const stdDev = Math.sqrt(variance);

    // Normalized Skewness and Kurtosis
    let skewness = 0;
    let kurtosis = 3.0; // Normal gaussian default

    if (stdDev > 1e-8) {
      skewness = (m3Sum / n) / Math.pow(stdDev, 3);
      kurtosis = (m4Sum / n) / Math.pow(stdDev, 4);
    }

    const crestFactor = rms > 1e-8 ? (peak / rms) : 0;

    return {
      magnitude: parseFloat(mean.toFixed(4)),
      rms: parseFloat(rms.toFixed(4)),
      peak: parseFloat(peak.toFixed(4)),
      peakToPeak: parseFloat(peakToPeak.toFixed(4)),
      variance: parseFloat(variance.toFixed(4)),
      standardDeviation: parseFloat(stdDev.toFixed(4)),
      kurtosis: parseFloat(kurtosis.toFixed(4)),
      skewness: parseFloat(skewness.toFixed(4)),
      crestFactor: parseFloat(crestFactor.toFixed(4))
    };
  }
}

export const timeDomainFeaturesService = new TimeDomainFeaturesService();
