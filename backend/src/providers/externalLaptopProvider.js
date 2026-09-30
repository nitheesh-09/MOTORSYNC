/**
 * MOTORSYNC Backend — External Laptop Provider (Placeholder Adapter)
 * 
 * Master Specification Section 12:
 * - Decoupled adapter interface for future real-world External Data Acquisition Laptop.
 * - Initial state: NOT_CONNECTED.
 * - Methods: connect(), disconnect(), getStatus(), receiveTelemetry(), validatePayload().
 * - Does not hardcode communication protocol (ready for REST, WebSocket, MQTT, TCP).
 */

import { dataSourceRepository } from '../repositories/dataSourceRepository.js';
import { payloadValidator } from '../validation/payloadValidator.js';
import { logger } from '../utils/logger.js';

export class ExternalLaptopProvider {
  constructor(repo = null) {
    this.repo = repo || dataSourceRepository;
    this.status = 'NOT_CONNECTED';
    this.lastMessageAt = null;
    this.connectionConfig = {
      protocol: 'PENDING_SELECTION', // 'REST' | 'WEBSOCKET' | 'MQTT' | 'TCP'
      endpoint: null
    };
  }

  async connect(config = {}) {
    logger.info('ExternalLaptopProvider connect() called — placeholder connection established');
    this.status = 'CONNECTED';
    this.connectionConfig = { ...this.connectionConfig, ...config };
    this.repo.updateStatus('EXTERNAL_LAPTOP', 'CONNECTED');
    return this.getStatus();
  }

  async disconnect() {
    logger.info('ExternalLaptopProvider disconnect() called');
    this.status = 'NOT_CONNECTED';
    this.repo.updateStatus('EXTERNAL_LAPTOP', 'NOT_CONNECTED');
    return this.getStatus();
  }

  getStatus() {
    return {
      sourceType: 'EXTERNAL_LAPTOP',
      name: 'External Data Acquisition Laptop Adapter',
      status: this.status,
      lastMessageAt: this.lastMessageAt,
      protocol: this.connectionConfig.protocol,
      endpoint: this.connectionConfig.endpoint,
      isRealHardwareConnected: false, // Strictly false (Section 12, 63)
      notice: 'Production adapter awaiting physical external laptop connection'
    };
  }

  /**
   * Method called when a payload arrives from external laptop.
   */
  receiveTelemetry(rawPayload) {
    this.lastMessageAt = new Date().toISOString();
    this.repo.updateStatus('EXTERNAL_LAPTOP', 'CONNECTED', this.lastMessageAt);

    // Ensure sourceType is preserved
    const payload = {
      ...rawPayload,
      sourceType: 'EXTERNAL_LAPTOP'
    };

    return payloadValidator.validate(payload);
  }
}

export const externalLaptopProvider = new ExternalLaptopProvider();
