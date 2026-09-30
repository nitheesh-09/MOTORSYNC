/**
 * MOTORSYNC Backend — Configuration
 * 
 * Central environment configuration with defaults.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  env: process.env.NODE_ENV || 'development',
  
  // Storage
  databasePath: process.env.DATABASE_PATH || (process.env.NODE_ENV === 'test' ? ':memory:' : path.join(rootDir, 'data', 'motorsync.db')),
  
  // Data Sources
  defaultDataSource: process.env.DATA_SOURCE || 'ESP32', // 'ESP32' | 'EXTERNAL_LAPTOP'
  
  // Upload limits
  uploadLimitMb: parseInt(process.env.UPLOAD_LIMIT_MB || '50', 10),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Active AI Model
  activeAiModel: process.env.AI_MODEL || 'experimental-v0.1',

  // ESP32 Hardware Ingestion Configuration (Section 4, 9, 29)
  defaultMotorId: process.env.DEFAULT_MOTOR_ID || 'MTR-001',
  vibrationSamplingRate: parseInt(process.env.VIBRATION_SAMPLING_RATE || '2560', 10),
  esp32StaleTimeoutMs: parseInt(process.env.ESP32_STALE_TIMEOUT_MS || '15000', 10),
  vibrationBufferSize: parseInt(process.env.VIBRATION_BUFFER_SIZE || '1024', 10)
};
