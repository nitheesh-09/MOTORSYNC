/**
 * UNIFIED SIGNAL PROCESSING ENGINE
 * Motor Health Monitoring and Fault Diagnosis System
 * 
 * Reusable core processing pipeline independent of data source:
 * Raw Motor Data
 *       ↓
 * Data Validation
 *       ↓
 * Preprocessing
 *       ↓
 * Signal Processing (Time Domain & FFT)
 *       ↓
 * Feature Extraction (Harmonics & 1X Running Frequency)
 *       ↓
 * Results (Standard Analysis Result Structure)
 * 
 * Consumed by:
 * - Synthetic Telemetry Provider
 * - CSV / JSON / XML File Importers
 * - Test Suite / CI Benchmarks
 * - Future Embedded DAQ (STM32 / ESP32) Streams
 */

import { DEFAULT_SIGNAL_CONFIG } from './config.js';
import { MotorDataValidator } from './validator.js';
import { TimeDomainFeatures } from './timeDomain.js';
import { FFTAnalysis } from './fft.js';
import { RotationalSpeedAnalysis } from './rotationalSpeed.js';
import { HarmonicsAnalysis } from './harmonics.js';

export class SignalProcessingEngine {
  /**
   * Processes a multi-channel motor telemetry dataset and extracts complete engineering features.
   * 
   * @param {Object} input - Input dataset structure:
   *   {
   *     source?: string,
   *     samplingRate?: number,
   *     vibration: Array<number>,
   *     current?: Array<number>,
   *     voltage?: Array<number>,
   *     temperature?: Array<number>,
   *     timestamp?: Array<number|string>,
   *     rows?: Array<Object>,
   *     mapping?: Object,
   *     options?: Object
   *   }
   * @param {Object} configOverrides - Optional parameter overrides.
   * @returns {Object} Standard Analysis Result Structure (Requirement 10)
   */
  static processDataset(input = {}, configOverrides = {}) {
    const config = { ...DEFAULT_SIGNAL_CONFIG, ...configOverrides };
    const source = input.source || 'UNKNOWN_SOURCE';

    // 1. DATA VALIDATION
    const validation = MotorDataValidator.validateMotorDataset(input);

    const samplingRate = validation.samplingRate || input.samplingRate || config.samplingRate;
    const vibClean = validation.channelStatus.vibration?.cleanValues || [];
    const sampleCount = vibClean.length;
    const duration = samplingRate > 0 && sampleCount > 0 ? +(sampleCount / samplingRate).toFixed(3) : 0;

    // 2. TIME-DOMAIN STATISTICAL FEATURE EXTRACTION
    const vibTimeFeatures = TimeDomainFeatures.calculateVibrationFeatures(vibClean);

    const currentRaw = input.current || (input.rows && input.mapping?.current ? input.rows.map(r => r[input.mapping.current]) : null);
    const currentFeatures = TimeDomainFeatures.calculateElectricalFeatures(currentRaw, 'current');

    const voltageRaw = input.voltage || (input.rows && input.mapping?.voltage ? input.rows.map(r => r[input.mapping.voltage]) : null);
    const voltageFeatures = TimeDomainFeatures.calculateElectricalFeatures(voltageRaw, 'voltage');

    const tempRaw = input.temperature || (input.rows && input.mapping?.temperature ? input.rows.map(r => r[input.mapping.temperature]) : null);
    const tempFeatures = TimeDomainFeatures.calculateTemperatureFeatures(tempRaw);

    // 3. FREQUENCY-DOMAIN FFT ANALYSIS
    let fftResult = {
      isValid: false,
      frequencies: [],
      amplitudes: [],
      spectrum: [],
      dominantFrequency: null,
      dominantAmplitude: null,
      reason: 'No vibration data available for FFT.'
    };

    if (vibClean.length >= config.minFftSamples && samplingRate && samplingRate > 0) {
      fftResult = FFTAnalysis.computeSpectrum(vibClean, samplingRate, {
        fftSize: config.fftSize,
        maxFrequency: config.maxAnalysisFrequency,
        frequencyResolution: config.frequencyResolution
      });
    }

    // 4. 1X ROTATIONAL FREQUENCY & SPEED DETECTION
    let runningFrequency = {
      available: false,
      frequency: null,
      amplitude: null,
      confidence: 0,
      estimatedRPM: null,
      reason: 'FFT spectrum unavailable for rotational speed detection.'
    };

    if (fftResult.isValid && fftResult.spectrum.length > 0) {
      runningFrequency = RotationalSpeedAnalysis.detectRunningFrequency(fftResult.spectrum, {
        minRotationalFrequency: config.minRotationalFrequency,
        maxRotationalFrequency: config.maxRotationalFrequency,
        lineFrequency: config.lineFrequency,
        lineNotchTolerance: config.lineNotchTolerance,
        peakProminenceThreshold: config.peakProminenceThreshold,
        harmonicTolerance: config.harmonicTolerance
      });
    }

    // 5. HARMONICS ANALYSIS (1X, 2X, 3X, 4X)
    let harmonics = [];
    if (fftResult.isValid && runningFrequency.available && runningFrequency.frequency) {
      harmonics = HarmonicsAnalysis.extractHarmonics(
        fftResult.spectrum,
        runningFrequency.frequency,
        {
          maxHarmonicOrder: config.maxHarmonicOrder,
          harmonicTolerance: config.harmonicTolerance
        }
      );
    }

    // 6. ASSEMBLE STANDARD ANALYSIS RESULT OBJECT (Requirement 10)
    return {
      source,
      sampleCount,
      duration,
      samplingRate: fftResult.isValid ? samplingRate : null,

      vibration: {
        mean: vibTimeFeatures.mean,
        rms: vibTimeFeatures.rms,
        peak: vibTimeFeatures.peak,
        peakToPeak: vibTimeFeatures.peakToPeak,
        standardDeviation: vibTimeFeatures.standardDeviation,
        crestFactor: vibTimeFeatures.crestFactor,
        fft: {
          isValid: fftResult.isValid,
          frequencies: fftResult.frequencies,
          amplitudes: fftResult.amplitudes,
          spectrum: fftResult.spectrum,
          resolution: fftResult.resolution,
          nyquistFrequency: fftResult.nyquistFrequency,
          reason: fftResult.reason
        },
        dominantFrequency: fftResult.dominantFrequency,
        dominantAmplitude: fftResult.dominantAmplitude,
        runningFrequency: {
          frequency: runningFrequency.frequency,
          amplitude: runningFrequency.amplitude,
          confidence: runningFrequency.confidence,
          available: runningFrequency.available,
          reason: runningFrequency.reason,
          details: runningFrequency.details
        },
        estimatedRPM: runningFrequency.estimatedRPM,
        harmonics
      },

      current: {
        mean: currentFeatures.mean,
        rms: currentFeatures.rms,
        min: currentFeatures.min,
        max: currentFeatures.max
      },

      voltage: {
        mean: voltageFeatures.mean,
        rms: voltageFeatures.rms,
        min: voltageFeatures.min,
        max: voltageFeatures.max
      },

      temperature: {
        mean: tempFeatures.mean,
        min: tempFeatures.min,
        max: tempFeatures.max,
        rise: tempFeatures.rise
      },

      validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings
      }
    };
  }
}
