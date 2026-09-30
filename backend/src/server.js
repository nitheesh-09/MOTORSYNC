/**
 * MOTORSYNC Backend — HTTP Server Entry Point
 * 
 * Boots SQLite database, seeds development telemetry, launches background
 * synthetic telemetry ticker for development, and binds HTTP listener.
 */

import { app } from './app.js';
import { config } from './config/index.js';
import { getDatabase, closeDatabase } from './storage/database.js';
import { motorRepository } from './repositories/motorRepository.js';
import { telemetryRepository } from './repositories/telemetryRepository.js';
import { placeholderExternalProvider } from './providers/placeholderExternalProvider.js';
import { dataIngestionService } from './ingestion/dataIngestionService.js';
import { esp32RawIngestionService } from './ingestion/esp32RawIngestionService.js';
import { logger } from './utils/logger.js';

let server = null;
let telemetryInterval = null;

async function bootstrap() {
  logger.info('====================================================');
  logger.info('STARTING MOTORSYNC INDUSTRIAL PLATFORM BACKEND');
  logger.info('PRIMARY DATA SOURCE: REAL ESP32 HARDWARE INGESTION');
  logger.info('====================================================');

  // 1. Initialize SQLite Database & Schema
  getDatabase();

  // 2. Set primary data source to real ESP32 hardware
  dataIngestionService.setActiveSource('ESP32');
  logger.info('Active telemetry ingestion source set to: ESP32');

  // Note: Automatic synthetic telemetry generation has been DISABLED for runtime/production.
  // Real ESP32 hardware streaming over HTTP POST (/api/v1/telemetry/raw) is the primary source.
  // Test fixtures (placeholderExternalProvider) remain strictly for automated unit tests.

  // 4. Bind HTTP Listener
  server = app.listen(config.port, config.host, () => {
    logger.info(`MOTORSYNC REST API listening at: http://${config.host}:${config.port}/api/v1`);
    logger.info(`Health check: http://localhost:${config.port}/api/v1/health`);
    logger.info(`System status: http://localhost:${config.port}/api/v1/system/status`);
    logger.info(`Motors fleet: http://localhost:${config.port}/api/v1/motors`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    logger.info('Shutting down MOTORSYNC backend gracefully...');
    if (telemetryInterval) clearInterval(telemetryInterval);
    if (server) {
      server.close(() => {
        closeDatabase();
        logger.info('MOTORSYNC server closed.');
        process.exit(0);
      });
    } else {
      closeDatabase();
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Start if executed directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  bootstrap().catch(err => {
    logger.error('Fatal error during backend bootstrap:', err);
    process.exit(1);
  });
}

export { bootstrap };
