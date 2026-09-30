/**
 * MOTORSYNC Backend — System Status Controller
 * 
 * Master Specification Section 44:
 * Exposes health and detailed subsystem statuses.
 */

import { motorRepository } from '../../repositories/motorRepository.js';
import { telemetryRepository } from '../../repositories/telemetryRepository.js';
import { dataSourceRepository } from '../../repositories/dataSourceRepository.js';
import { externalLaptopProvider } from '../../providers/externalLaptopProvider.js';
import { esp32RawIngestionService } from '../../ingestion/esp32RawIngestionService.js';
import { dataIngestionService } from '../../ingestion/dataIngestionService.js';
import { modelRegistry } from '../../ai/modelRegistry.js';
import { sendSuccess } from '../middleware/responseHandler.js';

export class SystemController {
  health(req, res) {
    return sendSuccess(res, {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  }

  status(req, res) {
    const motors = motorRepository.findAll();
    const dataSources = dataSourceRepository.findAll();
    const extStatus = externalLaptopProvider.getStatus();
    const esp32Status = esp32RawIngestionService.getEsp32Status();
    const aiStatus = modelRegistry.getStatus();

    // Latest telemetry overall
    let latestTelemetryAt = null;
    for (const m of motors) {
      const lat = telemetryRepository.findLatestByMotorId(m.motorId);
      if (lat && (!latestTelemetryAt || new Date(lat.timestamp) > new Date(latestTelemetryAt))) {
        latestTelemetryAt = lat.timestamp;
      }
    }

    return sendSuccess(res, {
      backend: {
        status: 'ONLINE',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      },
      database: {
        engine: 'SQLite3 (WAL Mode)',
        status: 'CONNECTED',
        persistent: true
      },
      dataIngestion: {
        activeSource: dataIngestionService.getActiveSource(),
        status: 'ONLINE'
      },
      esp32Hardware: esp32Status,
      externalLaptop: extStatus,
      aiModel: aiStatus,
      fleetSummary: {
        totalMotors: motors.length,
        healthy: motors.filter(m => m.status === 'HEALTHY').length,
        warning: motors.filter(m => m.status === 'WARNING').length,
        fault: motors.filter(m => m.status === 'FAULT').length,
        offline: motors.filter(m => m.status === 'OFFLINE').length,
        latestTelemetryAt
      },
      registeredDataSources: dataSources
    });
  }
}

export const systemController = new SystemController();
