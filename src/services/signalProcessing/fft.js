/**
 * FFT / FREQUENCY SPECTRUM PROCESSING MODULE
 * Motor Health Monitoring and Fault Diagnosis System
 * 
 * Computes frequency spectrum decomposition using physical acquisition sampling rate.
 * Produces frequency arrays, magnitude/amplitude arrays, and dominant peak identification.
 * 
 * Safety: Validates sampling rate fs. Fails gracefully if fs is missing or non-positive.
 */

import { DEFAULT_SIGNAL_CONFIG } from './config.js';
import { MotorDataValidator } from './validator.js';

export class FFTAnalysis {
  /**
   * Computes the Discrete Fourier Transform / Frequency Spectrum of a time-domain vibration signal.
   * 
   * @param {Array<number>} rawValues - Time-domain vibration samples.
   * @param {number} samplingRate - Real sampling rate in Hz (e.g. 2560 Hz).
   * @param {Object} options - FFT configuration options.
   * @returns {Object} Spectrum result:
   *   {
   *     isValid: boolean,
   *     samplingRate: number,
   *     frequencies: Array<number>,
   *     amplitudes: Array<number>,
   *     spectrum: Array<{ frequency: number, amplitude: number, isDominant: boolean, is1X: boolean }>,
   *     dominantFrequency: number | null,
   *     dominantAmplitude: number | null,
   *     nyquistFrequency: number,
   *     resolution: number,
   *     reason?: string
   *   }
   */
  static computeSpectrum(rawValues, samplingRate, options = {}) {
    // 1. Validate Sampling Rate
    const rateCheck = MotorDataValidator.validateSamplingRate(samplingRate);
    if (!rateCheck.isValid) {
      return {
        isValid: false,
        samplingRate: null,
        frequencies: [],
        amplitudes: [],
        spectrum: [],
        dominantFrequency: null,
        dominantAmplitude: null,
        nyquistFrequency: 0,
        resolution: 0,
        reason: rateCheck.error || 'Cannot perform FFT: Sampling rate is missing or invalid.'
      };
    }

    const fs = rateCheck.samplingRate;

    // 2. Validate Input Signal
    const valResult = MotorDataValidator.validateChannelArray(rawValues, 'vibration', {
      minSamples: DEFAULT_SIGNAL_CONFIG.minFftSamples
    });

    if (!valResult.isValid || valResult.cleanValues.length === 0) {
      return {
        isValid: false,
        samplingRate: fs,
        frequencies: [],
        amplitudes: [],
        spectrum: [],
        dominantFrequency: null,
        dominantAmplitude: null,
        nyquistFrequency: fs / 2,
        resolution: 0,
        reason: valResult.errors.join('; ') || 'Insufficient samples for frequency analysis.'
      };
    }

    const values = valResult.cleanValues;
    const maxFreq = options.maxFrequency || DEFAULT_SIGNAL_CONFIG.maxAnalysisFrequency;
    const freqStep = options.frequencyResolution || DEFAULT_SIGNAL_CONFIG.frequencyResolution;
    const applyHanning = options.applyHanning !== false; // Default true to suppress spectral leakage

    // Determine processing window N
    const maxN = options.fftSize || DEFAULT_SIGNAL_CONFIG.fftSize;
    const N = Math.min(values.length, maxN);
    const windowedVals = new Float64Array(N);

    // Apply Hanning window: w[n] = 0.5 * (1 - cos(2*pi*n / (N-1)))
    // with coherent amplitude recovery factor = 2.0
    const windowFactor = applyHanning ? 2.0 : 1.0;
    for (let n = 0; n < N; n++) {
      if (applyHanning) {
        const w = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * n) / (N - 1)));
        windowedVals[n] = values[n] * w;
      } else {
        windowedVals[n] = values[n];
      }
    }

    const frequencies = [];
    const amplitudes = [];
    const spectrum = [];

    let maxAmp = 0;
    let dominantFreq = null;

    // Calculate discrete frequency bins up to maxFreq (or Nyquist fs / 2)
    const upperLimit = Math.min(maxFreq, fs / 2);
    const numBins = Math.floor(upperLimit / freqStep) + 1;

    for (let k = 0; k < numBins; k++) {
      const freq = +(k * freqStep).toFixed(1);
      let real = 0;
      let imag = 0;

      // Physical Discrete Fourier Sum: X(f) = sum(x[n] * e^(-j * 2*pi * f * n / fs))
      const twoPiFreqOverFs = (2.0 * Math.PI * freq) / fs;

      // Downsample summation step if N is large for performance
      const stride = N > 1024 ? 2 : 1;
      for (let n = 0; n < N; n += stride) {
        const angle = twoPiFreqOverFs * n;
        real += windowedVals[n] * Math.cos(angle);
        imag -= windowedVals[n] * Math.sin(angle);
      }

      const effectiveN = N / stride;
      // Single-sided spectral amplitude scaling (magnitude normalized by effectiveN/2)
      let amp = (Math.sqrt(real * real + imag * imag) / (effectiveN / 2)) * windowFactor;
      if (k === 0) amp = amp / 2; // DC component scaling

      const cleanAmp = +amp.toFixed(3);
      frequencies.push(freq);
      amplitudes.push(cleanAmp);

      // Track dominant peak, ignoring DC drift (< 2.0 Hz)
      if (cleanAmp > maxAmp && freq >= 2.0) {
        maxAmp = cleanAmp;
        dominantFreq = freq;
      }

      spectrum.push({
        frequency: freq,
        amplitude: cleanAmp,
        isDominant: false,
        is1X: false
      });
    }

    // Flag the dominant frequency bin in spectrum array
    if (dominantFreq !== null) {
      spectrum.forEach(b => {
        if (Math.abs(b.frequency - dominantFreq) < (freqStep / 2 + 1e-4)) {
          b.isDominant = true;
        }
      });
    }

    return {
      isValid: true,
      samplingRate: fs,
      frequencies,
      amplitudes,
      spectrum,
      dominantFrequency: dominantFreq,
      dominantAmplitude: +maxAmp.toFixed(3),
      nyquistFrequency: +(fs / 2).toFixed(1),
      resolution: freqStep,
      sampleCountUsed: N
    };
  }
}
