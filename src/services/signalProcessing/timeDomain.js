/**
 * TIME-DOMAIN FEATURE EXTRACTION MODULE
 * Motor Health Monitoring and Fault Diagnosis System
 * 
 * Implements rigorous statistical calculations for physical sensor channels:
 * - Vibration: Mean, RMS, Peak, Peak-to-Peak, Standard Deviation, Crest Factor
 * - Current & Voltage: Mean, RMS, Min, Max
 * - Temperature: Mean, Min, Max, Thermal Rise (ΔT)
 * 
 * Safety: Gracefully handles empty, single-sample, NaN, and corrupt inputs.
 */

import { MotorDataValidator } from './validator.js';

export class TimeDomainFeatures {
  /**
   * Calculates time-domain statistical metrics for vibration signal.
   * 
   * Definitions:
   * - Mean: sum(x) / N
   * - RMS: sqrt(mean(x²)) = sqrt(sum(x²) / N)
   * - Peak: max(|x|)
   * - Peak-to-Peak: max(x) - min(x)
   * - Standard Deviation: sqrt(sum((x - mean)²) / N)
   * - Crest Factor: Peak / RMS
   * 
   * @param {Array<number>} rawValues - Time-domain vibration samples (velocity / acceleration).
   * @returns {Object} { mean, rms, peak, peakToPeak, standardDeviation, crestFactor, sampleCount, isValid }
   */
  static calculateVibrationFeatures(rawValues) {
    const valResult = MotorDataValidator.validateChannelArray(rawValues, 'vibration');
    if (!valResult.isValid || valResult.cleanValues.length === 0) {
      return {
        isValid: false,
        sampleCount: 0,
        mean: null,
        rms: null,
        peak: null,
        peakToPeak: null,
        standardDeviation: null,
        crestFactor: null,
        reason: valResult.errors.join('; ') || 'Insufficient or invalid vibration samples.'
      };
    }

    const values = valResult.cleanValues;
    const N = values.length;

    let sum = 0;
    let sumSq = 0;
    let minVal = Infinity;
    let maxVal = -Infinity;
    let peakAbs = 0;

    for (let i = 0; i < N; i++) {
      const v = values[i];
      sum += v;
      sumSq += v * v;
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
      const absV = Math.abs(v);
      if (absV > peakAbs) peakAbs = absV;
    }

    const mean = sum / N;
    const rms = Math.sqrt(sumSq / N);
    const peakToPeak = maxVal - minVal;

    // Standard deviation: sqrt(mean((x - mean)²))
    let varianceSum = 0;
    for (let i = 0; i < N; i++) {
      const diff = values[i] - mean;
      varianceSum += diff * diff;
    }
    const standardDeviation = Math.sqrt(varianceSum / N);

    // Crest factor: Peak / RMS
    const crestFactor = rms > 1e-9 ? peakAbs / rms : 0;

    return {
      isValid: true,
      sampleCount: N,
      mean: +mean.toFixed(3),
      rms: +rms.toFixed(3),
      peak: +peakAbs.toFixed(3),
      peakToPeak: +peakToPeak.toFixed(3),
      standardDeviation: +standardDeviation.toFixed(3),
      crestFactor: +crestFactor.toFixed(3),
      min: +minVal.toFixed(3),
      max: +maxVal.toFixed(3)
    };
  }

  /**
   * Calculates electrical channel statistics (Current or Voltage).
   * 
   * @param {Array<number>} rawValues - Sample array.
   * @param {string} channelName - 'current' or 'voltage'.
   * @returns {Object} { mean, rms, min, max, isValid }
   */
  static calculateElectricalFeatures(rawValues, channelName = 'electrical') {
    const valResult = MotorDataValidator.validateChannelArray(rawValues, channelName, { minSamples: 1 });
    if (!valResult.isValid || valResult.cleanValues.length === 0) {
      return {
        isValid: false,
        sampleCount: 0,
        mean: null,
        rms: null,
        min: null,
        max: null
      };
    }

    const values = valResult.cleanValues;
    const N = values.length;
    let sum = 0;
    let sumSq = 0;
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let i = 0; i < N; i++) {
      const v = values[i];
      sum += v;
      sumSq += v * v;
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }

    const mean = sum / N;
    const rms = Math.sqrt(sumSq / N);

    return {
      isValid: true,
      sampleCount: N,
      mean: +(mean).toFixed(2),
      rms: +(rms).toFixed(2),
      min: +(minVal).toFixed(2),
      max: +(maxVal).toFixed(2)
    };
  }

  /**
   * Calculates thermal channel statistics (Temperature sensor).
   * Includes temperature rise over the recording duration (ΔT).
   * 
   * @param {Array<number>} rawValues - Sample array in °C.
   * @returns {Object} { mean, min, max, rise, initialTemp, finalTemp, isValid }
   */
  static calculateTemperatureFeatures(rawValues) {
    const valResult = MotorDataValidator.validateChannelArray(rawValues, 'temperature', { minSamples: 1 });
    if (!valResult.isValid || valResult.cleanValues.length === 0) {
      return {
        isValid: false,
        sampleCount: 0,
        mean: null,
        min: null,
        max: null,
        rise: null
      };
    }

    const values = valResult.cleanValues;
    const N = values.length;
    let sum = 0;
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let i = 0; i < N; i++) {
      const v = values[i];
      sum += v;
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }

    const mean = sum / N;
    const initialTemp = values[0];
    const finalTemp = values[N - 1];
    const rise = finalTemp - initialTemp;

    return {
      isValid: true,
      sampleCount: N,
      mean: +mean.toFixed(1),
      min: +minVal.toFixed(1),
      max: +maxVal.toFixed(1),
      rise: +rise.toFixed(2),
      initialTemp: +initialTemp.toFixed(1),
      finalTemp: +finalTemp.toFixed(1)
    };
  }
}
