/**
 * EXTERNAL DATA ACQUISITION LAPTOP PROVIDER
 * MOTORSYNC — Data Ingestion Layer
 * 
 * Represents the receiver for telemetry streams sent by the External Acquisition Laptop.
 * 
 * Hardware Telemetry Flow:
 * Physical Motor Sensors
 *        ↓
 * External Data Acquisition Laptop (LabVIEW / Python DAQ / MATLAB)
 *        ↓ (Signal Processing, Bandpass Filtering, FFT, Harmonics, Statistical Features)
 * JSON Telemetry Payload
 *        ↓ (Network / REST / WebSocket Receiver)
 * MOTORSYNC DataIngestionService
 *        ↓
 * Central Monitoring Dashboard & Diagnostics
 */

import { DATA_SOURCE_TYPES, createMotorPayload } from './motorDataModel.js';
import { MOTOR_REGISTRY, getMotorById } from '../motorRegistry.js';

export class ExternalLaptopProvider {
  constructor() {
    this.sourceType = DATA_SOURCE_TYPES.EXTERNAL_LAPTOP;
    this.sourceName = 'External Data Acquisition Laptop [Workstation Station-01]';
    this.isConnected = true;
    this.lastPacketTimestamp = null;
    this.packetsReceived = 0;
  }

  /**
   * Validate incoming payload from external laptop
   */
  validatePayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return { isValid: false, error: 'Empty or invalid JSON payload received from external laptop.' };
    }

    if (!payload.motorId) {
      return { isValid: false, error: 'Payload missing required motorId identifier.' };
    }

    const motor = getMotorById(payload.motorId);
    if (!motor) {
      return { isValid: false, error: `Unrecognized motorId "${payload.motorId}" not registered in MOTORSYNC plant fleet.` };
    }

    return { isValid: true, error: null };
  }

  /**
   * Ingests an incoming payload from the external laptop.
   */
  ingest(rawPayload) {
    const check = this.validatePayload(rawPayload);
    if (!check.isValid) {
      throw new Error(`DataIngestionError: ${check.error}`);
    }

    this.packetsReceived++;
    this.lastPacketTimestamp = new Date().toISOString();

    return createMotorPayload({
      ...rawPayload,
      sourceType: this.sourceType,
      sourceName: this.sourceName
    });
  }

  /**
   * Generates a live payload representing the external laptop's output for a given motor.
   * Emulates the external laptop having performed acquisition, FFT, and feature extraction.
   */
  generateExternalTelemetry(motorId = 'MTR-001') {
    const motor = getMotorById(motorId) || MOTOR_REGISTRY[0];
    const now = new Date().toISOString();

    const f1X = motor.nominalFreq1X || 25.0;
    const baseVib = motor.vibBase || 2.18;
    const baseCur = motor.curBase || 2.20;
    const baseVolt = motor.voltBase || 230.0;
    const baseTemp = motor.tempBase || 42.0;

    // Small physical transducer variations
    const curVal = +(baseCur + (Math.random() - 0.5) * 0.08).toFixed(2);
    const voltVal = +(baseVolt + (Math.random() - 0.5) * 0.8).toFixed(1);
    const tempVal = +(baseTemp + (Math.random() - 0.5) * 0.3).toFixed(1);
    const vibVal = +(baseVib + (Math.random() - 0.5) * 0.12).toFixed(2);

    const powerKw = +((voltVal * curVal * Math.sqrt(3) * 0.88) / 1000).toFixed(2);
    const tempRise = +(tempVal - 38.0).toFixed(1);

    // Build external laptop processed payload
    return createMotorPayload({
      motorId: motor.motorId,
      timestamp: now,
      sourceType: DATA_SOURCE_TYPES.EXTERNAL_LAPTOP,
      sourceName: `External Data Acquisition Laptop [DAQ-${motor.motorId}]`,

      measurements: {
        voltage: voltVal,
        current: curVal,
        temperature: tempVal,
        vibration: vibVal
      },

      electrical: {
        voltageRms: voltVal,
        currentRms: curVal,
        currentStdDev: +(curVal * 0.025).toFixed(3),
        currentPeak: +(curVal * 1.414).toFixed(2),
        currentPeakToPeak: +(curVal * 2.828).toFixed(2),
        power: powerKw,
        currentSpectralFeatures: {
          fundamentalFrequency: 50.0,
          thd: 1.8,
          phaseUnbalance: 0.9
        }
      },

      thermal: {
        temperature: tempVal,
        temperatureRiseFromBaseline: tempRise,
        temperatureRiseRate: +(0.03 + (Math.random() - 0.5) * 0.01).toFixed(3),
        temperatureVariation: 0.28
      },

      vibration: {
        magnitude: vibVal,
        rms: vibVal,
        peak: +(vibVal * 2.14).toFixed(2),
        peakToPeak: +(vibVal * 4.28).toFixed(2),
        variance: +(vibVal * vibVal * 0.12).toFixed(3),
        standardDeviation: +(vibVal * 0.35).toFixed(3),
        kurtosis: 3.08,
        skewness: 0.11,
        crestFactor: 2.14,
        dominantFrequency: f1X,
        spectralEnergy: +(vibVal * 16.5).toFixed(1),
        spectralEntropy: 0.68,
        frequencyBandEnergy: {
          lowBand: +(vibVal * 0.72).toFixed(2),
          mediumBand: +(vibVal * 0.20).toFixed(2),
          highBand: +(vibVal * 0.08).toFixed(2)
        },
        harmonics: [
          { order: '1X', frequency: f1X, amplitude: +(vibVal * 0.85).toFixed(2) },
          { order: '2X', frequency: f1X * 2, amplitude: +(vibVal * 0.22).toFixed(2) },
          { order: '3X', frequency: f1X * 3, amplitude: +(vibVal * 0.06).toFixed(2) }
        ]
      },

      rpm: Math.round(f1X * 60),
      rpmMethod: '1X Rotational Peak × 60 (Processed by External Acquisition Laptop)',
      rpmReliable: true
    });
  }
}

export const externalLaptopProvider = new ExternalLaptopProvider();
