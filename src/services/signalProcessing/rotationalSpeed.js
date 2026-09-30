/**
 * 1X ROTATIONAL FREQUENCY & ESTIMATED RPM DETECTION MODULE
 * Motor Health Monitoring and Fault Diagnosis System
 * 
 * Engineering Principle:
 * Identifies the 1X rotational running frequency through harmonic peak searching
 * and prominence validation rather than naively selecting the highest FFT peak.
 * 
 * In real electric motors, bearing defect frequencies (BPFO/BPFI), imbalance, 
 * or electrical harmonics often produce amplitudes exceeding the running speed component.
 * 
 * Formulations:
 * - 1X = f_rotational (Hz)
 * - Estimated RPM = f_1X * 60
 */

import { DEFAULT_SIGNAL_CONFIG } from './config.js';

export class RotationalSpeedAnalysis {
  /**
   * Identifies candidate 1X rotational running speed from a frequency spectrum.
   * 
   * @param {Array<{ frequency: number, amplitude: number }>} spectrum - FFT spectrum bins.
   * @param {Object} options - Search and validation tolerances.
   * @returns {Object} Running frequency result:
   *   {
   *     available: boolean,
   *     frequency: number | null,
   *     amplitude: number | null,
   *     confidence: number, // 0 - 100%
   *     estimatedRPM: number | null,
   *     reason: string,
   *     details: Object
   *   }
   */
  static detectRunningFrequency(spectrum, options = {}) {
    if (!spectrum || !Array.isArray(spectrum) || spectrum.length === 0) {
      return {
        available: false,
        frequency: null,
        amplitude: null,
        confidence: 0,
        estimatedRPM: null,
        reason: 'Empty or invalid frequency spectrum provided.'
      };
    }

    const minFreq = options.minRotationalFrequency ?? DEFAULT_SIGNAL_CONFIG.minRotationalFrequency;
    const maxFreq = options.maxRotationalFrequency ?? DEFAULT_SIGNAL_CONFIG.maxRotationalFrequency;
    const lineFreq = options.lineFrequency ?? DEFAULT_SIGNAL_CONFIG.lineFrequency;
    const lineNotch = options.lineNotchTolerance ?? DEFAULT_SIGNAL_CONFIG.lineNotchTolerance;
    const minProminence = options.peakProminenceThreshold ?? DEFAULT_SIGNAL_CONFIG.peakProminenceThreshold;
    const harmonicTol = options.harmonicTolerance ?? DEFAULT_SIGNAL_CONFIG.harmonicTolerance;

    // 1. Filter bins within the plausible motor running speed range [minFreq, maxFreq]
    // and exclude grid AC line frequency (50 Hz / 60 Hz hum)
    const rotationalBandBins = spectrum.filter(bin => {
      if (bin.frequency < minFreq || bin.frequency > maxFreq) return false;
      if (Math.abs(bin.frequency - lineFreq) <= lineNotch) return false;
      return true;
    });

    if (rotationalBandBins.length === 0) {
      return {
        available: false,
        frequency: null,
        amplitude: null,
        confidence: 0,
        estimatedRPM: null,
        reason: `No spectral bins found in rotational band (${minFreq} Hz - ${maxFreq} Hz).`
      };
    }

    // 2. Estimate average noise floor in the search band
    const avgNoiseFloor = rotationalBandBins.reduce((sum, b) => sum + b.amplitude, 0) / rotationalBandBins.length;

    // 3. Identify local spectral peaks (local maxima in rotational band)
    const localPeaks = [];
    for (let i = 1; i < spectrum.length - 1; i++) {
      const prev = spectrum[i - 1].amplitude;
      const curr = spectrum[i].amplitude;
      const next = spectrum[i + 1].amplitude;
      const freq = spectrum[i].frequency;

      if (curr >= prev && curr >= next && curr > (avgNoiseFloor + minProminence)) {
        if (freq >= minFreq && freq <= maxFreq && Math.abs(freq - lineFreq) > lineNotch) {
          localPeaks.push(spectrum[i]);
        }
      }
    }

    // If no distinct local peaks found, check the max bin in band
    let candidate = null;
    if (localPeaks.length > 0) {
      // Sort local peaks by amplitude descending
      localPeaks.sort((a, b) => b.amplitude - a.amplitude);
      candidate = localPeaks[0];
    } else {
      let maxBandAmp = 0;
      rotationalBandBins.forEach(b => {
        if (b.amplitude > maxBandAmp) {
          maxBandAmp = b.amplitude;
          candidate = b;
        }
      });
    }

    // 4. Validate candidate prominence against noise floor
    if (!candidate || candidate.amplitude < minProminence) {
      return {
        available: false,
        frequency: null,
        amplitude: null,
        confidence: 0,
        estimatedRPM: null,
        reason: 'Unable to identify a reliable 1X running-frequency component (amplitudes below threshold).'
      };
    }

    const candidateFreq = candidate.frequency;
    const candidateAmp = candidate.amplitude;

    // 5. Look for companion 2X harmonic peak (f_2X ≈ 2 * f_1X) to boost detection confidence
    const target2X = candidateFreq * 2.0;
    const maxDelta2X = target2X * harmonicTol;
    let found2X = false;
    let amp2X = 0;
    let freq2X = null;

    spectrum.forEach(b => {
      if (Math.abs(b.frequency - target2X) <= maxDelta2X) {
        if (b.amplitude > amp2X) {
          amp2X = b.amplitude;
          freq2X = b.frequency;
          if (amp2X > (avgNoiseFloor * 1.2)) {
            found2X = true;
          }
        }
      }
    });

    // 6. Calculate Confidence Metric (0 - 100%)
    let confidence = 70; // Base confidence for prominent peak in band
    const signalToNoise = candidateAmp / (avgNoiseFloor || 0.05);

    if (signalToNoise > 4.0) confidence += 15;
    else if (signalToNoise > 2.0) confidence += 8;

    if (found2X) {
      confidence += 15; // Harmonic reinforcement gives high confidence
    }

    confidence = Math.min(98, Math.max(10, Math.round(confidence)));

    // 7. Calculate Estimated RPM: RPM = f_1X * 60
    const estimatedRPM = Math.round(candidateFreq * 60);

    // Flag the candidate bin in the spectrum if it exists
    candidate.is1X = true;

    return {
      available: true,
      frequency: +(candidateFreq).toFixed(2),
      amplitude: +(candidateAmp).toFixed(3),
      confidence,
      estimatedRPM,
      reason: `Reliable 1X rotational peak detected at ${candidateFreq} Hz (SNR: ${signalToNoise.toFixed(1)}x).`,
      details: {
        peakAmplitude: +(candidateAmp).toFixed(3),
        averageNoiseFloor: +(avgNoiseFloor).toFixed(3),
        signalToNoise: +signalToNoise.toFixed(1),
        hasHarmonic2X: found2X,
        harmonic2XFrequency: freq2X,
        harmonic2XAmplitude: amp2X ? +amp2X.toFixed(3) : 0
      }
    };
  }

  /**
   * Helper to derive RPM from rotational frequency in Hz.
   * 
   * @param {number|null} runningFrequencyHz - 1X frequency in Hz.
   * @returns {number|null} Calculated RPM or null.
   */
  static calculateRPM(runningFrequencyHz) {
    if (typeof runningFrequencyHz !== 'number' || isNaN(runningFrequencyHz) || runningFrequencyHz <= 0) {
      return null;
    }
    return Math.round(runningFrequencyHz * 60);
  }
}
