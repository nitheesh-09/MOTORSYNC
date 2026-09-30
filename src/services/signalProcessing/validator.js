/**
 * DATA VALIDATION MODULE
 * Motor Health Monitoring and Fault Diagnosis System
 * 
 * Verifies signal arrays and data tables before statistical or spectral processing.
 * Safely flags empty, corrupted, NaN, infinite, or insufficient datasets.
 */

import { DEFAULT_SIGNAL_CONFIG } from './config.js';

export class MotorDataValidator {
  /**
   * Validates a numeric array of samples (e.g. vibration waveform stream).
   * 
   * @param {Array<number>} values - Array of raw telemetry values.
   * @param {string} channelName - Name of the transducer channel being validated.
   * @param {Object} options - Validation options (minSamples, allowZero).
   * @returns {Object} Validation summary { isValid, cleanValues, errors, warnings, stats }
   */
  static validateChannelArray(values, channelName = 'vibration', options = {}) {
    const minSamples = options.minSamples || DEFAULT_SIGNAL_CONFIG.minRequiredSamples;
    const errors = [];
    const warnings = [];

    if (!values || !Array.isArray(values)) {
      return {
        isValid: false,
        cleanValues: [],
        errors: [`${channelName}: Telemetry data must be a valid array. Received ${typeof values}.`],
        warnings,
        stats: { total: 0, validCount: 0, corruptedCount: 0 }
      };
    }

    if (values.length === 0) {
      return {
        isValid: false,
        cleanValues: [],
        errors: [`${channelName}: Channel contains zero samples (empty dataset).`],
        warnings,
        stats: { total: 0, validCount: 0, corruptedCount: 0 }
      };
    }

    const cleanValues = [];
    let nanCount = 0;
    let infCount = 0;
    let nonNumericCount = 0;

    for (let i = 0; i < values.length; i++) {
      const val = values[i];

      if (typeof val !== 'number') {
        const parsed = parseFloat(val);
        if (isNaN(parsed)) {
          nonNumericCount++;
          continue;
        }
        if (!isFinite(parsed)) {
          infCount++;
          continue;
        }
        cleanValues.push(parsed);
      } else {
        if (isNaN(val)) {
          nanCount++;
        } else if (!isFinite(val)) {
          infCount++;
        } else {
          cleanValues.push(val);
        }
      }
    }

    const corruptedCount = nanCount + infCount + nonNumericCount;

    if (corruptedCount > 0) {
      warnings.push(
        `${channelName}: Filtered ${corruptedCount} invalid sample(s) (NaN: ${nanCount}, Inf: ${infCount}, Non-numeric: ${nonNumericCount}).`
      );
    }

    if (cleanValues.length < minSamples) {
      errors.push(
        `${channelName}: Insufficient valid samples for processing. Required at least ${minSamples}, found ${cleanValues.length}.`
      );
      return {
        isValid: false,
        cleanValues,
        errors,
        warnings,
        stats: { total: values.length, validCount: cleanValues.length, corruptedCount }
      };
    }

    return {
      isValid: errors.length === 0,
      cleanValues,
      errors,
      warnings,
      stats: { total: values.length, validCount: cleanValues.length, corruptedCount }
    };
  }

  /**
   * Validates dataset acquisition parameters (e.g. sampling rate fs).
   * 
   * @param {number|string} samplingRate - Stated acquisition sampling frequency in Hz.
   * @returns {Object} { isValid, samplingRate, error, warning }
   */
  static validateSamplingRate(samplingRate) {
    if (samplingRate === undefined || samplingRate === null || samplingRate === '') {
      return {
        isValid: false,
        samplingRate: null,
        error: 'Sampling rate is missing. FFT and frequency-domain analysis cannot be performed without a valid timebase.'
      };
    }

    const rate = typeof samplingRate === 'number' ? samplingRate : parseFloat(samplingRate);

    if (isNaN(rate) || !isFinite(rate) || rate <= 0) {
      return {
        isValid: false,
        samplingRate: null,
        error: `Sampling rate must be a positive finite number. Received: "${samplingRate}".`
      };
    }

    if (rate < 50) {
      return {
        isValid: true,
        samplingRate: rate,
        warning: `Sampling rate (${rate} Hz) is very low for motor vibration analysis (Nyquist = ${rate / 2} Hz). High-frequency harmonics may be aliased.`
      };
    }

    return {
      isValid: true,
      samplingRate: rate,
      error: null
    };
  }

  /**
   * Validates an entire multi-channel dataset (records or column arrays).
   * 
   * @param {Object} input - { rows, columns, mapping, samplingRate } or { vibration, current, voltage, temperature, timestamp, samplingRate }
   * @returns {Object} Comprehensive validation report { isValid, channelStatus, errors, warnings }
   */
  static validateMotorDataset(input = {}) {
    const errors = [];
    const warnings = [];
    const channelStatus = {};

    // 1. Validate Sampling Rate
    const rateCheck = this.validateSamplingRate(input.samplingRate);
    if (!rateCheck.isValid) {
      warnings.push(rateCheck.error);
    } else if (rateCheck.warning) {
      warnings.push(rateCheck.warning);
    }

    // 2. Validate Primary Core Signal: Vibration
    const vibInput = input.vibration || (input.rows && input.mapping?.vibration ? input.rows.map(r => r[input.mapping.vibration]) : null);
    const vibCheck = this.validateChannelArray(vibInput, 'vibration', { minSamples: DEFAULT_SIGNAL_CONFIG.minRequiredSamples });
    channelStatus.vibration = vibCheck;

    if (!vibCheck.isValid) {
      errors.push(...vibCheck.errors);
    }
    warnings.push(...vibCheck.warnings);

    // 3. Validate Optional Primary Sensors: Current, Voltage, Temperature
    ['current', 'voltage', 'temperature'].forEach(ch => {
      const raw = input[ch] || (input.rows && input.mapping?.[ch] ? input.rows.map(r => r[input.mapping[ch]]) : null);
      if (raw && raw.length > 0) {
        const chCheck = this.validateChannelArray(raw, ch, { minSamples: 1 });
        channelStatus[ch] = chCheck;
        warnings.push(...chCheck.warnings);
      } else {
        channelStatus[ch] = { isValid: false, cleanValues: [], errors: [], warnings: [], notProvided: true };
      }
    });

    return {
      isValid: errors.length === 0,
      samplingRate: rateCheck.samplingRate,
      channelStatus,
      errors,
      warnings
    };
  }
}
