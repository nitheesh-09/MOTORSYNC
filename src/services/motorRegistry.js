/**
 * MOTOR REGISTRY SERVICE
 * Centralized registry of all industrial motors monitored in the facility.
 * 
 * Provides:
 * - Unique Motor ID (MTR-001, MTR-002, ...)
 * - Motor metadata (Name, Location, Type, Ratings, Installation info)
 * - Baseline operating parameters for signal processing and simulation
 */

export const MOTOR_REGISTRY = [
  {
    motorId: 'MTR-001',
    name: 'Motor MTR-001',
    shortName: 'MTR-001',
    location: 'Physical Hardware Testbed',
    facilityArea: 'Hardware Laboratory',
    type: '3-Phase Induction Motor',
    powerKw: 1.5,
    ratedVoltage: '230 V (Phase-to-Neutral)',
    ratedCurrent: '3.50 A RMS',
    ratedRPM: 1500,
    nominalFreq1X: 25.0, // 25.0 Hz * 60 = 1500 RPM
    installDate: '2026-09-30',
    serialNumber: 'SN-REAL-ESP32-001',
    sensorChannels: ['ESP32 Potential Transducer', 'ESP32 Current CT', 'ESP32 Temperature Probe', 'ESP32 Triaxial Accelerometer (X, Y, Z)'],
    defaultMode: 'ESP32 Real Hardware',
    baseStatus: 'HEALTHY',
    healthScore: 94,
    vibBase: null,
    tempBase: null,
    curBase: null,
    voltBase: null
  },
  {
    motorId: 'MTR-002',
    name: 'Centrifugal Compressor Motor',
    shortName: 'Compressor Motor',
    location: 'Compressor Room (Bay 2)',
    facilityArea: 'High-Pressure Pneumatics Plant',
    type: 'Heavy-Duty Industrial Induction',
    powerKw: 2.2,
    ratedVoltage: '230 V (Phase-to-Neutral)',
    ratedCurrent: '5.20 A RMS',
    ratedRPM: 1500,
    nominalFreq1X: 24.8, // 24.8 Hz * 60 = 1488 RPM (mild slip)
    installDate: '2023-11-05',
    serialNumber: 'SN-IND-2023-4412',
    sensorChannels: ['IEPE Accelerometer Ch-2', 'Hall CT-2', 'Diff PT-2', 'PT100 RTD Ch-2'],
    defaultMode: 'Imbalance — Simulated',
    baseStatus: 'WARNING',
    healthScore: 72,
    vibBase: 5.2,
    tempBase: 51.4,
    curBase: 4.10,
    voltBase: 229.8
  },
  {
    motorId: 'MTR-003',
    name: 'Assembly Line Conveyor Motor',
    shortName: 'Conveyor Motor',
    location: 'Production Line #1',
    facilityArea: 'Assembly & Packaging Section',
    type: 'Inverter-Duty Induction Motor',
    powerKw: 1.1,
    ratedVoltage: '230 V (Phase-to-Neutral)',
    ratedCurrent: '2.80 A RMS',
    ratedRPM: 1500,
    nominalFreq1X: 25.0, // 25.0 Hz * 60 = 1500 RPM
    installDate: '2024-01-20',
    serialNumber: 'SN-IND-2024-1109',
    sensorChannels: ['IEPE Accelerometer Ch-3', 'Hall CT-3', 'Diff PT-3', 'PT100 RTD Ch-3'],
    defaultMode: 'Healthy',
    baseStatus: 'HEALTHY',
    healthScore: 96,
    vibBase: 1.8,
    tempBase: 39.2,
    curBase: 1.95,
    voltBase: 231.2
  },
  {
    motorId: 'MTR-004',
    name: 'Chiller Exhaust Cooling Fan',
    shortName: 'Cooling Fan Motor',
    location: 'HVAC Chiller Plant (Roof)',
    facilityArea: 'Facility Heat Rejection',
    type: 'Direct-Drive High-Flow Induction',
    powerKw: 0.75,
    ratedVoltage: '230 V (Phase-to-Neutral)',
    ratedCurrent: '1.90 A RMS',
    ratedRPM: 1800, // 4-pole 60Hz or 2-pole equivalent fan drive
    nominalFreq1X: 30.0, // 30.0 Hz * 60 = 1800 RPM
    installDate: '2022-08-15',
    serialNumber: 'SN-IND-2022-9023',
    sensorChannels: ['IEPE Accelerometer Ch-4', 'Hall CT-4', 'Diff PT-4', 'PT100 RTD Ch-4'],
    defaultMode: 'Bearing Fault — Simulated',
    baseStatus: 'FAULT',
    healthScore: 54,
    vibBase: 6.8,
    tempBase: 58.2,
    curBase: 2.45,
    voltBase: 228.6
  },
  {
    motorId: 'MTR-005',
    name: 'Chemical Reactor Agitator Motor',
    shortName: 'Process Agitator',
    location: 'Chemical Processing Bay 4',
    facilityArea: 'Mixing & Reaction Vessels',
    type: 'Explosion-Proof Induction Motor',
    powerKw: 3.0,
    ratedVoltage: '400 V (Phase-to-Phase)',
    ratedCurrent: '6.10 A RMS',
    ratedRPM: 1000, // 6-pole induction drive
    nominalFreq1X: 16.67, // 16.67 Hz * 60 = 1000 RPM
    installDate: '2023-06-30',
    serialNumber: 'SN-IND-2023-7721',
    sensorChannels: ['IEPE Accelerometer Ch-5', 'Hall CT-5', 'Diff PT-5', 'PT100 RTD Ch-5'],
    defaultMode: 'Healthy',
    baseStatus: 'HEALTHY',
    healthScore: 92,
    vibBase: 1.5,
    tempBase: 40.5,
    curBase: 3.20,
    voltBase: 400.1
  }
];

export const ACTIVE_MONITORED_MOTOR_ID = 'MTR-001';

export const getActiveMonitoredMotors = () => {
  return [MOTOR_REGISTRY[0]];
};

export const getMotorById = (motorId) => {
  return MOTOR_REGISTRY.find(m => m.motorId === motorId) || MOTOR_REGISTRY[0];
};

export const getAllMotorIds = () => {
  return ['MTR-001'];
};
