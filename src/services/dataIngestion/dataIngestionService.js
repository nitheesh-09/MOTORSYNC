/**
 * DATA INGESTION SERVICE
 * MOTORSYNC — Data Ingestion & Source Abstraction Layer
 * 
 * Central coordinator for:
 * 1. SYNTHETIC PROVIDER (Internal test harness during development)
 * 2. EXTERNAL LAPTOP PROVIDER (Intended real-world receiver)
 * 3. OFFLINE FILE PROVIDER (Ingested CSV/JSON/XML datasets)
 * 
 * Normalizes all sources into the extensible Common Motor Data Model
 * and decouples UI dashboards from transport mechanisms.
 */

import { DATA_SOURCE_TYPES, FEATURE_PROVENANCE, createMotorPayload } from './motorDataModel.js';
import { externalLaptopProvider } from './externalLaptopProvider.js';
import { MOTOR_REGISTRY, getMotorById } from '../motorRegistry.js';

class DataIngestionService {
  constructor() {
    this.activeSource = DATA_SOURCE_TYPES.ESP32;
    this.externalLaptop = externalLaptopProvider;
    this.latestPayloads = {}; // motorId -> normalizedPayload
    this.listeners = new Set();
  }

  /**
   * Set active data source
   * @param {string} source - 'SYNTHETIC' | 'EXTERNAL_LAPTOP'
   */
  setActiveSource(source) {
    if (Object.values(DATA_SOURCE_TYPES).includes(source)) {
      this.activeSource = source;
      this.notifyListeners();
    }
  }

  getActiveSource() {
    return this.activeSource;
  }

  isExternalSourceActive() {
    return this.activeSource === DATA_SOURCE_TYPES.EXTERNAL_LAPTOP;
  }

  /**
   * Ingest payload from an external acquisition system (e.g. over HTTP POST or WebSocket)
   */
  ingestExternalPayload(payload) {
    const normalized = this.externalLaptop.ingest(payload);
    this.latestPayloads[normalized.motorId] = normalized;
    this.notifyListeners();
    return normalized;
  }

  /**
   * Normalizes incoming telemetry into the standard Common Motor Data Model
   */
  normalize(rawInput) {
    return createMotorPayload({
      ...rawInput,
      sourceType: this.activeSource
    });
  }

  /**
   * Retrieve normalized payload for a selected motor
   */
  getMotorTelemetry(motorId = 'MTR-001') {
    if (this.activeSource === DATA_SOURCE_TYPES.EXTERNAL_LAPTOP) {
      if (!this.latestPayloads[motorId]) {
        this.latestPayloads[motorId] = this.externalLaptop.generateExternalTelemetry(motorId);
      }
      return this.latestPayloads[motorId];
    }

    // Default synthetic simulation mode
    return this.latestPayloads[motorId] || null;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.activeSource);
    }
  }
}

export const dataIngestionService = new DataIngestionService();
export { DATA_SOURCE_TYPES, FEATURE_PROVENANCE, createMotorPayload };
