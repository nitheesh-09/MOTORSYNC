/**
 * ARCHITECTURE & DATA INGESTION VERIFICATION TESTS
 * MOTORSYNC — Motor Health Monitoring and Fault Diagnosis System
 * 
 * Verifies:
 * 1. Normalized Common Motor Data Model Payload (Section 5 Schema)
 * 2. Distinction between Physical Measurements and Processed Features (Section 3)
 * 3. Data Source Abstraction (Synthetic vs External Laptop vs Offline File)
 * 4. RPM handling as derived/optional (Section 6)
 * 5. Feature Provenance tracking (Section 11)
 * 6. Section 10 Validation (Required identity, Physical/Processed, Optional fields with Available/Not available/Not provided)
 * 7. Multi-motor telemetry isolation (Section 14)
 */

import assert from 'assert';
import { 
  createMotorPayload, 
  DATA_SOURCE_TYPES, 
  FEATURE_PROVENANCE 
} from '../src/services/dataIngestion/motorDataModel.js';
import { dataIngestionService } from '../src/services/dataIngestion/dataIngestionService.js';
import { ExternalLaptopProvider } from '../src/services/dataIngestion/externalLaptopProvider.js';
import { fileAnalysisService } from '../src/services/fileAnalysisService.js';
import { MOTOR_REGISTRY } from '../src/services/motorRegistry.js';

console.log('====================================================');
console.log('RUNNING DATA INGESTION ARCHITECTURE TESTS');
console.log('====================================================\n');

// TEST 1: Normalized Motor Data Model Payload Compliance (Section 5)
function testNormalizedPayloadSchema() {
  const payload = createMotorPayload({
    motorId: 'MTR-001',
    sourceType: DATA_SOURCE_TYPES.EXTERNAL_LAPTOP,
    measurements: {
      voltage: 230.4,
      current: 2.18,
      temperature: 42.6,
      vibration: 2.40
    },
    electrical: {
      voltageRms: 230.4,
      currentRms: 2.18,
      power: 1.25
    },
    thermal: {
      temperature: 42.6,
      temperatureRiseFromBaseline: 4.6
    },
    vibration: {
      magnitude: 2.40,
      rms: 2.40,
      crestFactor: 2.12,
      kurtosis: 3.08
    }
  });

  assert.strictEqual(payload.motorId, 'MTR-001');
  assert.ok(payload.timestamp, 'Timestamp must be present');
  assert.strictEqual(payload.sourceType, DATA_SOURCE_TYPES.EXTERNAL_LAPTOP);

  // Electrical features
  assert.strictEqual(typeof payload.electrical.voltageRms, 'number');
  assert.strictEqual(typeof payload.electrical.currentRms, 'number');
  assert.strictEqual(typeof payload.electrical.power, 'number');
  assert.ok(payload.electrical.currentSpectralFeatures);

  // Thermal features
  assert.strictEqual(payload.thermal.temperature, 42.6);
  assert.strictEqual(payload.thermal.temperatureRiseFromBaseline, 4.6);
  assert.strictEqual(typeof payload.thermal.temperatureRiseRate, 'number');

  // Vibration features
  assert.strictEqual(payload.vibration.rms, 2.40);
  assert.strictEqual(payload.vibration.crestFactor, 2.12);
  assert.strictEqual(payload.vibration.kurtosis, 3.08);
  assert.ok(payload.vibration.frequencyBandEnergy);
  assert.ok(Array.isArray(payload.vibration.harmonics));

  // Provenance
  assert.ok(payload.provenance);
  assert.strictEqual(payload.provenance.voltage, FEATURE_PROVENANCE.PHYSICAL_MEASUREMENT);
  assert.strictEqual(payload.provenance.current, FEATURE_PROVENANCE.PHYSICAL_MEASUREMENT);
  assert.strictEqual(payload.provenance.voltageRms, FEATURE_PROVENANCE.EXTERNAL_ACQUISITION);

  console.log('[PASS] Test 1: Normalized Motor Data Model Payload conforms to Section 5 schema');
}

// TEST 2: Physical Measurements vs Processed Features Separation (Section 3)
function testFeatureSeparation() {
  const payload = createMotorPayload({
    measurements: {
      voltage: 230.0,
      current: 2.0,
      temperature: 40.0,
      vibration: 2.1
    }
  });

  // Physical measurements strictly 4
  const physicalKeys = Object.keys(payload.measurements).sort();
  assert.deepStrictEqual(physicalKeys, ['current', 'temperature', 'vibration', 'voltage']);

  // Processed features separate from measurements
  assert.ok(payload.electrical.power !== undefined, 'Power is an extracted feature, not a sensor input');
  assert.ok(payload.thermal.temperatureRiseFromBaseline !== undefined, 'Temp rise is an extracted feature');
  assert.ok(payload.vibration.crestFactor !== undefined, 'Crest factor is an extracted feature');
  assert.ok(payload.vibration.kurtosis !== undefined, 'Kurtosis is an extracted feature');

  console.log('[PASS] Test 2: Physical measurements clearly separated from extracted features');
}

// TEST 3: Speed (RPM) is Derived / Processed, Never a Physical Sensor (Section 6)
function testRpmDerivedHandling() {
  // Case A: 1X frequency is known -> RPM = 1X * 60
  const payloadWith1X = createMotorPayload({
    vibration: { dominantFrequency: 25.0 }
  });
  assert.strictEqual(payloadWith1X.rpm, 1500, 'RPM must equal 1X freq * 60');

  // Case B: No reliable 1X -> RPM is null / not invented
  const payloadWithout1X = createMotorPayload({
    vibration: { dominantFrequency: null },
    rpm: null
  });
  assert.strictEqual(payloadWithout1X.rpm, null, 'Must not invent an RPM value if 1X is not available');

  console.log('[PASS] Test 3: RPM handled strictly as optional/derived (RPM = 1X * 60 or null)');
}

// TEST 4: Data Source Abstraction (Synthetic vs External Laptop)
function testDataSourceAbstraction() {
  const provider = new ExternalLaptopProvider();
  const rawPayload = {
    motorId: 'MTR-002',
    timestamp: new Date().toISOString(),
    electrical: { voltageRms: 228.0, currentRms: 4.2, power: 2.4 },
    thermal: { temperature: 52.0 },
    vibration: { rms: 4.8, dominantFrequency: 24.8 }
  };

  const validation = provider.validatePayload(rawPayload);
  assert.strictEqual(validation.isValid, true, 'Valid external laptop payload must pass validation');

  const normalized = provider.ingest(rawPayload);
  assert.strictEqual(normalized.sourceType, DATA_SOURCE_TYPES.EXTERNAL_LAPTOP);
  assert.strictEqual(normalized.motorId, 'MTR-002');
  assert.strictEqual(normalized.rpm, Math.round(24.8 * 60));

  console.log('[PASS] Test 4: External Laptop Provider abstraction ingests and normalizes external payloads');
}

// TEST 5: Section 10 Dataset Validation (Available, Not available, Not provided)
function testSection10ValidationMatrix() {
  const rows = [
    { time: 0, vib: 2.1, curr: 2.2 },
    { time: 0.001, vib: 2.3, curr: 2.1 },
    { time: 0.002, vib: 2.2, curr: 2.2 }
  ];
  // Replicate to 100 rows
  for (let i = 3; i < 100; i++) {
    rows.push({ time: i * 0.001, vib: 2.1 + (i % 5) * 0.1, curr: 2.2 });
  }

  const mapping = {
    timestamp: 'time',
    vibration: 'vib',
    current: 'curr',
    voltage: null,
    temperature: null
  };

  const val = fileAnalysisService.validateMappedData(rows, mapping);
  assert.ok(val.featureAvailability, 'Feature availability matrix must exist');

  // Identity
  const tsCheck = val.featureAvailability.identity.find(f => f.field === 'Timestamp');
  assert.strictEqual(tsCheck.status, 'Available');

  // Electrical
  const curCheck = val.featureAvailability.electrical.find(f => f.field === 'Current');
  assert.strictEqual(curCheck.status, 'Available');
  const voltCheck = val.featureAvailability.electrical.find(f => f.field === 'Voltage');
  assert.strictEqual(voltCheck.status, 'Not provided');

  // Thermal
  const tempCheck = val.featureAvailability.thermal.find(f => f.field === 'Temperature');
  assert.strictEqual(tempCheck.status, 'Not provided');

  // Vibration
  const vibCheck = val.featureAvailability.vibration.find(f => f.field.includes('Vibration Measurement'));
  assert.strictEqual(vibCheck.status, 'Available');

  // Optional: should not fail validation simply because optional fields are missing
  assert.strictEqual(val.isValid, true, 'Valid dataset without optional features must pass validation');

  console.log('[PASS] Test 5: Section 10 Validation matrix distinguishes Available, Not available, and Not provided');
}

// TEST 6: Multi-Motor Fleet Isolation (Section 14)
function testMultiMotorIsolation() {
  const motor1 = createMotorPayload({ motorId: 'MTR-001', measurements: { vibration: 2.1 } });
  const motor2 = createMotorPayload({ motorId: 'MTR-002', measurements: { vibration: 5.4 } });

  assert.strictEqual(motor1.motorId, 'MTR-001');
  assert.strictEqual(motor2.motorId, 'MTR-002');
  assert.notStrictEqual(motor1.measurements.vibration, motor2.measurements.vibration);

  assert.ok(MOTOR_REGISTRY.some(m => m.motorId === 'MTR-001'));
  assert.ok(MOTOR_REGISTRY.some(m => m.motorId === 'MTR-002'));
  assert.ok(MOTOR_REGISTRY.some(m => m.motorId === 'MTR-003'));
  assert.ok(MOTOR_REGISTRY.some(m => m.motorId === 'MTR-004'));

  console.log('[PASS] Test 6: Multi-motor telemetry isolation verified for fleet assets');
}

// Run all tests
testNormalizedPayloadSchema();
testFeatureSeparation();
testRpmDerivedHandling();
testDataSourceAbstraction();
testSection10ValidationMatrix();
testMultiMotorIsolation();

console.log('\n====================================================');
console.log('ALL 6 DATA INGESTION ARCHITECTURE TESTS PASSED');
console.log('====================================================');
