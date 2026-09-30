/**
 * MOTORSYNC Backend — FFT & Spectral Decomposition Service
 * 
 * Master Specification Section 16 & 17:
 * - Computes Fast Fourier Transform (FFT) over raw vibration waveform.
 * - Extracts dominant frequency, spectral energy, spectral entropy, frequency bands, and harmonics.
 * - Enforces that sampling rate must be known; never assumes sampling rate.
 */

export class FFTService {
  /**
   * Compute frequency spectrum and spectral features.
   * 
   * @param {number[]} waveform - Raw time-domain samples
   * @param {number} samplingRate - Sampling frequency in Hz (REQUIRED)
   * @returns {Object} Spectral analysis result
   */
  computeSpectrum(waveform, samplingRate) {
    if (!samplingRate || typeof samplingRate !== 'number' || samplingRate <= 0) {
      throw new Error('Sampling rate must be a positive number. Never assume a sampling rate.');
    }

    if (!Array.isArray(waveform) || waveform.length < 4) {
      return {
        frequencies: [],
        magnitudes: [],
        dominantFrequency: null,
        dominantAmplitude: 0,
        spectralEnergy: 0,
        spectralEntropy: 0,
        frequencyBands: { low: 0, mid: 0, high: 0 },
        harmonics: [],
        binResolution: 0
      };
    }

    // Zero-pad or truncate to nearest power of 2 for fast radix-2 FFT
    const n = Math.pow(2, Math.floor(Math.log2(waveform.length)));
    const samples = waveform.slice(0, n);

    // Apply Hanning Window to reduce spectral leakage
    const windowed = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
      windowed[i] = samples[i] * w;
    }

    // Radix-2 Cooley-Tukey FFT
    const real = new Float64Array(windowed);
    const imag = new Float64Array(n);

    // Bit reversal permutation
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
      if (i < j) {
        let tempR = real[i]; real[i] = real[j]; real[j] = tempR;
        let tempI = imag[i]; imag[i] = imag[j]; imag[j] = tempI;
      }
      let k = n >> 1;
      while (k <= j) {
        j -= k;
        k >>= 1;
      }
      j += k;
    }

    // Butterfly stages
    for (let len = 2; len <= n; len <<= 1) {
      const halfLen = len >> 1;
      const angle = (-2 * Math.PI) / len;
      const wStepR = Math.cos(angle);
      const wStepI = Math.sin(angle);

      for (let i = 0; i < n; i += len) {
        let curWR = 1.0;
        let curWI = 0.0;
        for (let k = 0; k < halfLen; k++) {
          const uR = real[i + k];
          const uI = imag[i + k];
          const vR = real[i + k + halfLen] * curWR - imag[i + k + halfLen] * curWI;
          const vI = real[i + k + halfLen] * curWI + imag[i + k + halfLen] * curWR;

          real[i + k] = uR + vR;
          imag[i + k] = uI + vI;
          real[i + k + halfLen] = uR - vR;
          imag[i + k + halfLen] = uI - vI;

          const nextWR = curWR * wStepR - curWI * wStepI;
          curWI = curWR * wStepI + curWI * wStepR;
          curWR = nextWR;
        }
      }
    }

    // Single-sided magnitude spectrum (up to Nyquist = Fs / 2)
    const numBins = n / 2;
    const binRes = samplingRate / n;
    const frequencies = [];
    const magnitudes = [];

    let dominantFrequency = 0;
    let dominantAmplitude = 0;
    let spectralEnergy = 0;

    for (let i = 1; i < numBins; i++) { // Skip DC component (bin 0)
      const freq = parseFloat((i * binRes).toFixed(2));
      // Normalize magnitude: (2 / n) * sqrt(real^2 + imag^2)
      const mag = parseFloat(((2.0 / n) * Math.sqrt(real[i] * real[i] + imag[i] * imag[i])).toFixed(4));
      
      frequencies.push(freq);
      magnitudes.push(mag);

      spectralEnergy += mag * mag;

      if (mag > dominantAmplitude) {
        dominantAmplitude = mag;
        dominantFrequency = freq;
      }
    }

    // Spectral Entropy computation
    let spectralEntropy = 0;
    if (spectralEnergy > 0) {
      for (const mag of magnitudes) {
        const p = (mag * mag) / spectralEnergy;
        if (p > 1e-12) {
          spectralEntropy -= p * Math.log2(p);
        }
      }
      spectralEntropy = parseFloat((spectralEntropy / Math.log2(magnitudes.length)).toFixed(4));
    }

    // Frequency bands (e.g. Low 0-100Hz, Mid 100-500Hz, High 500Hz+)
    let lowBand = 0;
    let midBand = 0;
    let highBand = 0;

    for (let i = 0; i < frequencies.length; i++) {
      const f = frequencies[i];
      const m = magnitudes[i];
      if (f < 100) lowBand += m * m;
      else if (f < 500) midBand += m * m;
      else highBand += m * m;
    }

    // Harmonics detection (1X to 5X of dominant freq if dominant freq > 5Hz)
    const harmonics = [];
    if (dominantFrequency >= 5.0) {
      for (let order = 1; order <= 5; order++) {
        const targetFreq = dominantFrequency * order;
        // Search bin nearest target
        const nearestIdx = frequencies.reduce((prev, curr, idx) => 
          Math.abs(curr - targetFreq) < Math.abs(frequencies[prev] - targetFreq) ? idx : prev, 0);

        if (Math.abs(frequencies[nearestIdx] - targetFreq) < (binRes * 2)) {
          harmonics.push({
            order,
            frequency: frequencies[nearestIdx],
            amplitude: magnitudes[nearestIdx]
          });
        }
      }
    }

    return {
      frequencies,
      magnitudes,
      dominantFrequency: parseFloat(dominantFrequency.toFixed(2)),
      dominantAmplitude: parseFloat(dominantAmplitude.toFixed(4)),
      spectralEnergy: parseFloat(spectralEnergy.toFixed(4)),
      spectralEntropy,
      frequencyBands: {
        low: parseFloat(lowBand.toFixed(4)),
        mid: parseFloat(midBand.toFixed(4)),
        high: parseFloat(highBand.toFixed(4))
      },
      harmonics,
      binResolution: parseFloat(binRes.toFixed(3)),
      samplingRate,
      spectrum: frequencies.map((f, i) => ({ frequency: f, amplitude: magnitudes[i] }))
    };
  }
}

export const fftService = new FFTService();
