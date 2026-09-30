/**
 * MOTORSYNC Unified Test Runner
 * 
 * Runs all frontend DSP / ingestion tests and all backend SQLite / API / diagnostic tests.
 * Cross-platform runner compatible with Windows PowerShell, CMD, and Unix shells.
 */

import { spawn } from 'child_process';
import path from 'path';

const testFiles = [
  // Frontend DSP & Architecture Tests
  'tests/signalProcessing.test.js',
  'tests/phase3DatasetIntegration.test.js',
  'tests/dataIngestionArchitecture.test.js',
  'tests/aiAndDiagnostics.test.js',

  // Backend Repositories, Ingestion, API & E2E Integration Tests
  'backend/tests/dbRepositories.test.js',
  'backend/tests/ingestionAndValidation.test.js',
  'backend/tests/offlineAnalysis.test.js',
  'backend/tests/apiEndpoints.test.js',
  'backend/tests/endToEndIntegration.test.js',
  'backend/tests/esp32HardwareIngestion.test.js'
];

async function runTest(file) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [file], { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test', DATABASE_PATH: ':memory:' }
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Test file failed with exit code ${code}: ${file}`));
    });
  });
}

async function main() {
  console.log('====================================================');
  console.log(`EXECUTING MOTORSYNC FULL TEST SUITE (${testFiles.length} Test Modules)`);
  console.log('====================================================\n');

  const startTime = Date.now();
  for (const file of testFiles) {
    await runTest(file);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('====================================================');
  console.log(`ALL ${testFiles.length} TEST MODULES PASSED IN ${duration}s!`);
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('\n[FATAL] Test execution failed:\n', err.message);
  process.exit(1);
});
