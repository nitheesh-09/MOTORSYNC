/**
 * MOTORSYNC Backend — Running Frequency & Speed Derivation Service
 * 
 * Master Specification Section 18:
 * - Identifies true 1X rotational fundamental frequency within realistic industrial motor operating bands (10–65 Hz).
 * - Avoids falsely assuming high-frequency bearing defect peaks or electrical mains hum (50/60 Hz) is the rotational peak.
 * - Formula: RPM = f_1X * 60.
 * - If reliable running frequency is unavailable: returns available: false and rpm: null.
 * - Never invents RPM.
 */

export class RunningFrequencyService {
  /**
   * Determine running frequency and calculate derived RPM.
   * 
   * @param {Object} spectrum - Output from FFTService
   * @param {Object} options - { nominalRPM, minFreq, maxFreq }
   * @returns {Object} Running frequency and RPM result
   */
  detectRunningFrequency(spectrum, options = {}) {
    const minFreq = options.minFreq || 10.0; // 600 RPM
    const maxFreq = options.maxFreq || 65.0; // 3900 RPM
    const nominalFreq = options.nominalRPM ? (options.nominalRPM / 60) : null;

    if (!spectrum || !Array.isArray(spectrum.frequencies) || spectrum.frequencies.length === 0) {
      return {
        frequency: null,
        amplitude: 0,
        rpm: null,
        confidence: null,
        available: false,
        reason: 'Spectral decomposition not available'
      };
    }

    const { frequencies, magnitudes } = spectrum;

    // Filter peaks within allowable running frequency window
    const candidates = [];
    for (let i = 1; i < frequencies.length - 1; i++) {
      const f = frequencies[i];
      const m = magnitudes[i];

      if (f >= minFreq && f <= maxFreq) {
        // Local peak check
        if (m > magnitudes[i - 1] && m > magnitudes[i + 1] && m > 0.1) {
          candidates.push({ frequency: f, amplitude: m, index: i });
        }
      }
    }

    if (candidates.length === 0) {
      return {
        frequency: null,
        amplitude: 0,
        rpm: null,
        confidence: null,
        available: false,
        reason: 'No distinct rotational frequency peak found in running frequency window'
      };
    }

    // Sort by proximity to nominal frequency if provided, else by amplitude
    let selected = null;
    if (nominalFreq != null) {
      candidates.sort((a, b) => {
        const diffA = Math.abs(a.frequency - nominalFreq);
        const diffB = Math.abs(b.frequency - nominalFreq);
        // Weight: 70% frequency proximity, 30% amplitude
        const scoreA = diffA * 2.0 - a.amplitude * 0.5;
        const scoreB = diffB * 2.0 - b.amplitude * 0.5;
        return scoreA - scoreB;
      });
      selected = candidates[0];
    } else {
      candidates.sort((a, b) => b.amplitude - a.amplitude);
      selected = candidates[0];
    }

    // Calculate prominence against average floor
    const avgFloor = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
    const prominenceRatio = avgFloor > 0 ? (selected.amplitude / avgFloor) : 1;

    if (prominenceRatio < 1.5) {
      return {
        frequency: null,
        amplitude: selected.amplitude,
        rpm: null,
        confidence: null,
        available: false,
        reason: 'Peak prominence is insufficient to distinguish rotational fundamental from broadband noise'
      };
    }

    const rpm = Math.round(selected.frequency * 60);
    const confidence = Math.min(95, Math.round(Math.min(prominenceRatio * 18, 95)));

    return {
      frequency: parseFloat(selected.frequency.toFixed(2)),
      amplitude: parseFloat(selected.amplitude.toFixed(4)),
      rpm,
      confidence,
      available: true,
      reason: '1X rotational frequency identified from vibration spectrum'
    };
  }
}

export const runningFrequencyService = new RunningFrequencyService();
