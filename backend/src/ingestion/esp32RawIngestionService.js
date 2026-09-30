/**
 * MOTORSYNC Backend — ESP32 Raw Hardware Ingestion Service
 * 
 * Master Specification (ESP32 Ingestion Integration):
 * - Accepts raw time-series sensor readings: timestamp, voltage, current, temperature, vibration_x, vibration_y, vibration_z.
 * - Validates finite numbers, timestamps, and motor registry association.
 * - Stores raw unadulterated readings into raw_telemetry table.
 * - Preserves 3-axis vibration (X, Y, Z) and computes magnitude: sqrt(x^2 + y^2 + z^2).
 * - Maintains rolling in-memory vibration sample buffer per motor for FFT and statistical feature extraction.
 * - Tracks sampling rate (Reported vs Configured).
 * - Triggers electrical, thermal, vibration analytics, 1X rotational tracking, and AI diagnostics.
 * - Manages ESP32 hardware connection status (CONNECTED vs STALE / DISCONNECTED).
 */

import { rawTelemetryRepository } from '../repositories/rawTelemetryRepository.js';
import { motorRepository } from '../repositories/motorRepository.js';
import { telemetryRepository } from '../repositories/telemetryRepository.js';
import { dataSourceRepository } from '../repositories/dataSourceRepository.js';
import { timeDomainFeaturesService } from '../processing/timeDomainFeaturesService.js';
import { fftService } from '../processing/fftService.js';
import { runningFrequencyService } from '../processing/runningFrequencyService.js';
import { electricalAnalyticsService } from '../analytics/electricalAnalyticsService.js';
import { thermalAnalyticsService } from '../analytics/thermalAnalyticsService.js';
import { baselineService } from '../baselines/baselineService.js';
import { healthAssessmentService } from '../diagnostics/healthAssessmentService.js';
import { alertService } from '../alerts/alertService.js';
import { diagnosticService } from '../diagnostics/diagnosticService.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class Esp32RawIngestionService {
  constructor() {
    // Rolling sample buffer per motor: motorId -> Array of { timestamp, x, y, z, magnitude, voltage, current, temperature }
    this.vibrationBuffers = new Map();
    // Heartbeat tracking per motor: motorId -> epoch ms
    this.lastPacketTimes = new Map();
    // Reported sampling rates per motor: motorId -> number
    this.reportedSamplingRates = new Map();
  }

  /**
   * Check if a sample has valid finite numeric fields.
   */
  _validateNumericSample(sample) {
    const required = ['voltage', 'current', 'temperature', 'vibration_x', 'vibration_y', 'vibration_z'];
    for (const field of required) {
      if (sample[field] === undefined || sample[field] === null || sample[field] === '') {
        return { valid: false, error: `Missing required sensor field: ${field}` };
      }
      const num = Number(sample[field]);
      if (isNaN(num) || !isFinite(num)) {
        return { valid: false, error: `Field '${field}' must be a finite numeric value, got: ${sample[field]}` };
      }
    }
    return { valid: true };
  }

  /**
   * Process a single raw ESP32 telemetry packet.
   * 
   * @param {Object} rawPacket - Incoming raw payload from ESP32
   * @returns {Object} { success, data, error }
   */
  async ingestSingle(rawPacket) {
    if (!rawPacket || typeof rawPacket !== 'object' || Array.isArray(rawPacket)) {
      return {
        success: false,
        error: { code: 'INVALID_SENSOR_PAYLOAD', message: 'Payload must be a valid JSON object' }
      };
    }

    // 1. Motor ID resolution and validation
    const motorId = rawPacket.motorId || config.defaultMotorId;
    const motor = motorRepository.findByMotorId(motorId);
    if (!motor) {
      return {
        success: false,
        error: { code: 'UNKNOWN_MOTOR_ID', message: `Motor '${motorId}' is not registered in the system.` }
      };
    }

    // 2. Validate sensor fields
    const val = this._validateNumericSample(rawPacket);
    if (!val.valid) {
      return {
        success: false,
        error: { code: 'INVALID_SENSOR_PAYLOAD', message: val.error }
      };
    }

    // 3. Normalize timestamp
    let ts = rawPacket.timestamp;
    if (ts === undefined || ts === null) {
      ts = Date.now();
    } else if (typeof ts === 'string') {
      const parsed = new Date(ts).getTime();
      ts = isNaN(parsed) ? Date.now() : parsed;
    } else {
      ts = Number(ts);
    }

    const vx = Number(rawPacket.vibration_x);
    const vy = Number(rawPacket.vibration_y);
    const vz = Number(rawPacket.vibration_z);
    const magnitude = parseFloat(Math.sqrt(vx * vx + vy * vy + vz * vz).toFixed(4));
    const volt = Number(rawPacket.voltage);
    const curr = Number(rawPacket.current);
    const temp = Number(rawPacket.temperature);

    // 4. Save raw sensor readings into raw_telemetry table (Section 5, 20)
    const rawRecord = {
      motorId,
      timestamp: ts,
      voltage: volt,
      current: curr,
      temperature: temp,
      vibrationX: vx,
      vibrationY: vy,
      vibrationZ: vz,
      vibrationMagnitude: magnitude,
      sourceType: 'ESP32',
      quality: { isClean: true },
      metadata: { ingestionPath: 'POST /api/v1/telemetry/raw' }
    };
    rawTelemetryRepository.save(rawRecord);

    // 5. Update heartbeat & buffer
    this.lastPacketTimes.set(motorId, Date.now());
    this._appendBuffer(motorId, {
      timestamp: ts,
      x: vx,
      y: vy,
      z: vz,
      magnitude,
      voltage: volt,
      current: curr,
      temperature: temp
    });

    // 6. Process features from window and persist processed telemetry
    const processedResult = await this._processAndPersistBuffer(motorId, motor);

    // Update data sources table
    dataSourceRepository.updateStatus('ESP32', 'ACTIVE', new Date().toISOString());

    return {
      success: true,
      data: {
        accepted: true,
        motorId,
        timestamp: ts,
        sourceType: 'ESP32',
        rawSampleId: rawRecord.id,
        processedTelemetry: processedResult?.telemetry || null,
        bufferCount: this._getBuffer(motorId).length
      }
    };
  }

  /**
   * Process a batch of raw ESP32 telemetry samples (Section 10).
   * 
   * @param {Object} batchPacket - { motorId, samplingRate, samples: [...] }
   * @returns {Object} { success, data, error }
   */
  async ingestBatch(batchPacket) {
    if (!batchPacket || typeof batchPacket !== 'object') {
      return {
        success: false,
        error: { code: 'INVALID_BATCH_PAYLOAD', message: 'Batch payload must be a JSON object' }
      };
    }

    const motorId = batchPacket.motorId || config.defaultMotorId;
    const motor = motorRepository.findByMotorId(motorId);
    if (!motor) {
      return {
        success: false,
        error: { code: 'UNKNOWN_MOTOR_ID', message: `Motor '${motorId}' is not registered.` }
      };
    }

    if (!Array.isArray(batchPacket.samples) || batchPacket.samples.length === 0) {
      return {
        success: false,
        error: { code: 'EMPTY_BATCH', message: 'Field "samples" must be a non-empty array of sensor readings.' }
      };
    }

    if (batchPacket.samplingRate && Number(batchPacket.samplingRate) > 0) {
      this.reportedSamplingRates.set(motorId, Number(batchPacket.samplingRate));
    }

    const rawRecords = [];
    const bufferItems = [];

    for (let i = 0; i < batchPacket.samples.length; i++) {
      const s = batchPacket.samples[i];
      const val = this._validateNumericSample(s);
      if (!val.valid) {
        return {
          success: false,
          error: { code: 'INVALID_SENSOR_PAYLOAD', message: `Sample at index ${i}: ${val.error}` }
        };
      }

      let ts = s.timestamp;
      if (ts === undefined || ts === null) ts = Date.now() + i;
      else if (typeof ts === 'string') {
        const parsed = new Date(ts).getTime();
        ts = isNaN(parsed) ? Date.now() + i : parsed;
      } else {
        ts = Number(ts);
      }

      const vx = Number(s.vibration_x);
      const vy = Number(s.vibration_y);
      const vz = Number(s.vibration_z);
      const magnitude = parseFloat(Math.sqrt(vx * vx + vy * vy + vz * vz).toFixed(4));
      const volt = Number(s.voltage);
      const curr = Number(s.current);
      const temp = Number(s.temperature);

      rawRecords.push({
        motorId,
        timestamp: ts,
        voltage: volt,
        current: curr,
        temperature: temp,
        vibrationX: vx,
        vibrationY: vy,
        vibrationZ: vz,
        vibrationMagnitude: magnitude,
        sourceType: 'ESP32',
        quality: { isClean: true },
        metadata: { batchIndex: i }
      });

      bufferItems.push({
        timestamp: ts,
        x: vx,
        y: vy,
        z: vz,
        magnitude,
        voltage: volt,
        current: curr,
        temperature: temp
      });
    }

    // Atomic transaction batch save to SQLite
    rawTelemetryRepository.saveBatch(rawRecords);

    // Update heartbeat and append to buffer
    this.lastPacketTimes.set(motorId, Date.now());
    for (const item of bufferItems) {
      this._appendBuffer(motorId, item);
    }

    // Process buffer and update telemetry
    const processedResult = await this._processAndPersistBuffer(motorId, motor);

    dataSourceRepository.updateStatus('ESP32', 'ACTIVE', new Date().toISOString());

    return {
      success: true,
      data: {
        accepted: true,
        motorId,
        samplesReceived: rawRecords.length,
        sourceType: 'ESP32',
        bufferCount: this._getBuffer(motorId).length,
        processedTelemetry: processedResult?.telemetry || null
      }
    };
  }

  /**
   * Internal buffer append with max capacity windowing.
   */
  _appendBuffer(motorId, item) {
    if (!this.vibrationBuffers.has(motorId)) {
      this.vibrationBuffers.set(motorId, []);
    }
    const buf = this.vibrationBuffers.get(motorId);
    buf.push(item);
    const maxSize = config.vibrationBufferSize || 1024;
    if (buf.length > maxSize) {
      buf.splice(0, buf.length - maxSize);
    }
  }

  _getBuffer(motorId) {
    return this.vibrationBuffers.get(motorId) || [];
  }

  /**
   * Process rolling sample buffer into statistical features, FFT, speed and health.
   */
  async _processAndPersistBuffer(motorId, motor) {
    const buf = this._getBuffer(motorId);
    if (buf.length === 0) return null;

    const latestSample = buf[buf.length - 1];
    const nowIso = new Date().toISOString();

    // 1. Separate 3 vibration axes and magnitude
    const xSamples = buf.map(s => s.x);
    const ySamples = buf.map(s => s.y);
    const zSamples = buf.map(s => s.z);
    const magSamples = buf.map(s => s.magnitude);

    const xFeatures = timeDomainFeaturesService.extract(xSamples);
    const yFeatures = timeDomainFeaturesService.extract(ySamples);
    const zFeatures = timeDomainFeaturesService.extract(zSamples);
    const magFeatures = timeDomainFeaturesService.extract(magSamples);

    // 2. Determine sampling rate (Reported vs Configured)
    let samplingRate = this.reportedSamplingRates.get(motorId) || null;
    let samplingRateSource = 'CONFIGURED';

    if (samplingRate) {
      samplingRateSource = 'REPORTED';
    } else if (buf.length >= 4) {
      // Check timestamp delta if timestamp has microsecond or millisecond diffs
      const deltas = [];
      for (let i = 1; i < Math.min(buf.length, 10); i++) {
        const dt = buf[i].timestamp - buf[i - 1].timestamp;
        if (dt > 0) deltas.push(dt);
      }
      if (deltas.length >= 3) {
        const avgDtMs = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        if (avgDtMs < 100) { // High frequency sampling (dt < 100ms)
          samplingRate = Math.round(1000 / avgDtMs);
          samplingRateSource = 'DERIVED_FROM_TIMESTAMPS';
        }
      }
    }

    if (!samplingRate || samplingRate <= 0) {
      samplingRate = config.vibrationSamplingRate || 2560;
      samplingRateSource = 'CONFIGURED';
    }

    // 3. FFT on vibration magnitude buffer when sufficient samples exist (>= 32)
    let spectrum = null;
    let speedAnalysis = { frequency: null, rpm: null, available: false };

    if (magSamples.length >= 32) {
      spectrum = fftService.computeSpectrum(magSamples, samplingRate);
      speedAnalysis = runningFrequencyService.detectRunningFrequency(spectrum, {
        nominalRPM: motor?.ratedRPM || 1500
      });
    }

    // 4. Electrical analytics (power, load %, RMS)
    const voltSamples = buf.map(s => s.voltage);
    const currSamples = buf.map(s => s.current);
    const voltRms = Math.sqrt(voltSamples.reduce((a, v) => a + v * v, 0) / voltSamples.length);
    const currRms = Math.sqrt(currSamples.reduce((a, v) => a + v * v, 0) / currSamples.length);

    const electrical = electricalAnalyticsService.analyze({
      voltageRms: parseFloat(voltRms.toFixed(1)),
      currentRms: parseFloat(currRms.toFixed(2)),
      currentPeak: parseFloat(Math.max(...currSamples.map(Math.abs)).toFixed(2)),
      currentPeakToPeak: parseFloat((Math.max(...currSamples) - Math.min(...currSamples)).toFixed(2))
    }, motor || {});

    // 5. Thermal analytics (surface temp & baseline delta)
    const tempSamples = buf.map(s => s.temperature);
    const currentTemp = latestSample.temperature;
    const tempRiseRate = tempSamples.length > 1 
      ? parseFloat(((tempSamples[tempSamples.length - 1] - tempSamples[0]) / tempSamples.length).toFixed(3))
      : 0;

    const baselineDev = baselineService.calculateDeviations(motorId, {
      temperature: currentTemp,
      vibrationRms: magFeatures.rms,
      currentRms: electrical.currentRms,
      voltageRms: electrical.voltageRms
    });

    const thermal = {
      temperature: currentTemp,
      temperatureRiseFromBaseline: baselineDev.temperatureRiseFromBaseline,
      temperatureRiseRate: tempRiseRate,
      temperatureVariation: parseFloat((Math.max(...tempSamples) - Math.min(...tempSamples)).toFixed(2)),
      baselineComparison: baselineDev.temperatureRiseLabel
    };

    // 6. Complete Vibration Feature Structure (Preserving X, Y, Z + Magnitude)
    const vibration = {
      magnitude: magFeatures.magnitude,
      rms: magFeatures.rms,
      peak: magFeatures.peak,
      peakToPeak: magFeatures.peakToPeak,
      variance: magFeatures.variance,
      standardDeviation: magFeatures.standardDeviation,
      kurtosis: magFeatures.kurtosis,
      skewness: magFeatures.skewness,
      crestFactor: magFeatures.crestFactor,
      dominantFrequency: spectrum?.dominantFrequency || null,
      spectralEnergy: spectrum?.spectralEnergy || null,
      spectralEntropy: spectrum?.spectralEntropy || null,
      frequencyBandEnergy: spectrum?.frequencyBands || {},
      harmonics: spectrum?.harmonics || [],
      fft: spectrum || { isValid: false, spectrum: [], samplingRate },
      samplingRate,
      samplingRateSource,
      bufferSampleCount: buf.length,
      // Section 6: Preserve 3-axis specific statistical features
      axes: {
        x: xFeatures,
        y: yFeatures,
        z: zFeatures,
        magnitude: magFeatures
      }
    };

    // 7. Full Normalized Payload
    const normalizedPayload = {
      motorId,
      timestamp: nowIso,
      sourceType: 'ESP32',
      electrical,
      thermal,
      vibration,
      rpm: speedAnalysis.rpm,
      runningFrequency: speedAnalysis.frequency,
      rawData: {
        vibrationX_latest: latestSample.x,
        vibrationY_latest: latestSample.y,
        vibrationZ_latest: latestSample.z,
        vibrationMagnitude_latest: latestSample.magnitude,
        samplingRate,
        samplingRateSource
      },
      metadata: {
        dataSource: 'ESP32 Real Hardware',
        samplingRateSource,
        bufferWindowSamples: buf.length
      },
      provenance: {
        physical: ['voltage', 'current', 'temperature', 'vibrationX', 'vibrationY', 'vibrationZ'],
        externallyProcessed: [],
        derived: ['vibrationMagnitude', 'rms', 'crestFactor', 'kurtosis', 'power', 'rpm', 'healthState', 'diagnostics']
      },
      quality: { isClean: true, bufferCount: buf.length }
    };

    // 8. Health assessment & AI diagnostics
    const health = healthAssessmentService.evaluate(normalizedPayload, baselineDev);
    if (motor && motor.status !== health.state && health.state !== 'INSUFFICIENT_DATA') {
      motorRepository.updateStatus(motorId, health.state);
    }

    const diagnosticResult = diagnosticService.diagnoseAndSave(normalizedPayload);
    alertService.evaluateAndSave(normalizedPayload, diagnosticResult);

    // 9. Store in telemetry table
    const saved = telemetryRepository.save(normalizedPayload);

    return {
      telemetry: saved,
      health,
      diagnostics: diagnosticResult,
      baselineDeviations: baselineDev
    };
  }

  /**
   * Check connection status of ESP32 for a specific motor (Task 11).
   * Status logic:
   * - CONNECTED: recent ESP32 data is arriving within the configured freshness interval (15s)
   * - STALE: ESP32 data exists in database but has not arrived recently
   * - DISCONNECTED: no ESP32 data has ever been received
   */
  getEsp32Status(motorId = 'MTR-001') {
    let lastTime = this.lastPacketTimes.get(motorId);
    const timeoutMs = config.esp32StaleTimeoutMs || 15000;

    // If not in in-memory session, check database for real ESP32 records
    if (!lastTime) {
      const rawLatest = rawTelemetryRepository.findLatestByMotorId(motorId);
      if (rawLatest) {
        const parsed = rawLatest.createdAt ? new Date(rawLatest.createdAt).getTime() : Number(rawLatest.timestamp);
        lastTime = !isNaN(parsed) && parsed > 0 ? parsed : null;
      }
      if (!lastTime) {
        const telemLatest = telemetryRepository.findLatestByMotorId(motorId, 'ESP32');
        if (telemLatest) {
          const parsed = telemLatest.createdAt ? new Date(telemLatest.createdAt).getTime() : new Date(telemLatest.timestamp).getTime();
          lastTime = !isNaN(parsed) && parsed > 0 ? parsed : null;
        }
      }
      if (lastTime) {
        this.lastPacketTimes.set(motorId, lastTime);
      }
    }

    if (!lastTime) {
      return {
        motorId,
        sourceType: 'ESP32',
        status: 'NOT_CONNECTED',
        connectionState: 'DISCONNECTED',
        isConnected: false,
        isStale: false,
        isDisconnected: true,
        lastPacketAt: null,
        bufferCount: this._getBuffer(motorId).length,
        notice: 'No real ESP32 data received yet'
      };
    }

    const elapsedMs = Math.max(0, Date.now() - lastTime);
    const isConnected = elapsedMs <= timeoutMs;

    return {
      motorId,
      sourceType: 'ESP32',
      status: isConnected ? 'CONNECTED' : 'STALE / DISCONNECTED',
      connectionState: isConnected ? 'CONNECTED' : 'STALE',
      isConnected,
      isStale: !isConnected,
      isDisconnected: false,
      lastPacketAt: new Date(lastTime).toISOString(),
      elapsedSeconds: parseFloat((elapsedMs / 1000).toFixed(1)),
      bufferCount: this._getBuffer(motorId).length,
      configuredSamplingRate: config.vibrationSamplingRate,
      reportedSamplingRate: this.reportedSamplingRates.get(motorId) || null,
      notice: isConnected 
        ? 'Real ESP32 hardware streaming live sensor data' 
        : `ESP32 data exists but is stale (last packet ${Math.round(elapsedMs / 1000)}s ago)`
    };
  }

  /**
   * Check if ESP32 telemetry is actively streaming for this motor.
   */
  isEsp32ActiveForMotor(motorId) {
    const lastTime = this.lastPacketTimes.get(motorId);
    if (!lastTime) return false;
    return (Date.now() - lastTime) <= (config.esp32StaleTimeoutMs || 15000);
  }

  /**
   * Reset buffer and state (useful for tests).
   */
  reset() {
    this.vibrationBuffers.clear();
    this.lastPacketTimes.clear();
    this.reportedSamplingRates.clear();
  }
}

export const esp32RawIngestionService = new Esp32RawIngestionService();
