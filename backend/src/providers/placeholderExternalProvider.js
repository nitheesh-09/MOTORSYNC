/**
 * MOTORSYNC Backend — Placeholder External Provider (Synthetic Telemetry Generator)
 * 
 * [TEST ONLY FIXTURE — NOT FOR RUNTIME PRODUCTION]
 * Master Specification Section 13, 14, 15:
 * - Kept strictly as a test fixture for automated test suites.
 * - Runtime synthetic generation is DISABLED. Real ESP32 hardware data is the source of truth.
 * - Strictly marks every record sourceType = "SYNTHETIC".
 */

export const SIMULATION_SCENARIOS = {
  HEALTHY: 'HEALTHY',
  IMBALANCE_SIMULATED: 'IMBALANCE_SIMULATED',
  BEARING_SIMULATED: 'BEARING_SIMULATED',
  OVERLOAD_SIMULATED: 'OVERLOAD_SIMULATED',
  OVERHEATING_SIMULATED: 'OVERHEATING_SIMULATED',
  ELECTRICAL_SIMULATED: 'ELECTRICAL_SIMULATED'
};

export class PlaceholderExternalProvider {
  constructor() {
    this.status = 'ACTIVE';
    this.generatorInterval = null;
    this.motorModes = {
      'MTR-001': SIMULATION_SCENARIOS.HEALTHY,
      'MTR-002': SIMULATION_SCENARIOS.IMBALANCE_SIMULATED,
      'MTR-003': SIMULATION_SCENARIOS.BEARING_SIMULATED,
      'MTR-004': SIMULATION_SCENARIOS.HEALTHY,
      'MTR-005': SIMULATION_SCENARIOS.OVERHEATING_SIMULATED
    };
  }

  setMotorScenario(motorId, scenario) {
    if (SIMULATION_SCENARIOS[scenario]) {
      this.motorModes[motorId] = scenario;
    }
  }

  getStatus() {
    return {
      sourceType: 'SYNTHETIC',
      name: 'Synthetic Placeholder Provider',
      status: this.status,
      activeScenarios: this.motorModes,
      notice: 'SYNTHETIC DEVELOPMENT DATA — NOT REAL HARDWARE'
    };
  }

  /**
   * Generate realistic payload for a given motor.
   */
  generatePayload(motorId = 'MTR-001') {
    const scenario = this.motorModes[motorId] || SIMULATION_SCENARIOS.HEALTHY;
    const now = new Date().toISOString();
    const jitter = () => (Math.random() - 0.5) * 0.08;

    // Default healthy baseline base values
    let voltageRms = 400.0 + (Math.random() - 0.5) * 2.0;
    let currentRms = 12.5 + (Math.random() - 0.5) * 0.4;
    let currentStdDev = 0.45 + jitter();
    let currentPeak = currentRms * 1.414 + jitter();
    let currentPeakToPeak = currentPeak * 2;
    let power = parseFloat(((Math.sqrt(3) * voltageRms * currentRms * 0.85) / 1000).toFixed(2));

    let temperature = 42.0 + (Math.random() - 0.5) * 1.5;
    let tempRiseRate = 0.01;
    let tempVariation = 0.4;

    let vibRms = 0.85 + (Math.random() - 0.5) * 0.1;
    let vibPeak = vibRms * 1.42;
    let crestFactor = 2.15 + (Math.random() - 0.5) * 0.1;
    let kurtosis = 3.05 + (Math.random() - 0.5) * 0.15;
    let skewness = (Math.random() - 0.5) * 0.1;
    let dominantFreq = 24.7; // ~1482 RPM (1X)
    let rpm = 1482;
    let spectralEnergy = 12.5;

    // Apply scenario modifications
    switch (scenario) {
      case SIMULATION_SCENARIOS.BEARING_SIMULATED:
        vibRms = 3.8 + Math.random() * 0.4;
        vibPeak = 14.2 + Math.random() * 1.5;
        crestFactor = 3.75 + Math.random() * 0.3; // Impulsive
        kurtosis = 5.2 + Math.random() * 0.6;    // High impulsiveness
        dominantFreq = 145.0; // Bearing pass frequency
        temperature = 52.0;
        break;

      case SIMULATION_SCENARIOS.IMBALANCE_SIMULATED:
        vibRms = 4.8 + Math.random() * 0.5; // High 1X vibration > 4.5 mm/s
        vibPeak = 6.8 + Math.random() * 0.6;
        crestFactor = 2.2; // Sinusoidal
        kurtosis = 3.0;
        dominantFreq = 24.7; // 1X fundamental
        spectralEnergy = 45.0;
        break;

      case SIMULATION_SCENARIOS.OVERLOAD_SIMULATED:
        currentRms = 24.2 + (Math.random() - 0.5) * 0.8;
        currentPeak = currentRms * 1.5;
        power = parseFloat(((Math.sqrt(3) * voltageRms * currentRms * 0.85) / 1000).toFixed(2));
        temperature = 68.5;
        break;

      case SIMULATION_SCENARIOS.OVERHEATING_SIMULATED:
        temperature = 84.5 + Math.random() * 2.0;
        tempRiseRate = 0.12;
        break;

      case SIMULATION_SCENARIOS.ELECTRICAL_SIMULATED:
        voltageRms = 360.0; // Phase voltage sag
        currentRms = 18.5;
        currentStdDev = 2.1;
        break;

      default:
        break;
    }

    return {
      motorId,
      timestamp: now,
      sourceType: 'SYNTHETIC',
      electrical: {
        voltageRms: parseFloat(voltageRms.toFixed(1)),
        currentRms: parseFloat(currentRms.toFixed(2)),
        currentStdDev: parseFloat(currentStdDev.toFixed(3)),
        currentPeak: parseFloat(currentPeak.toFixed(2)),
        currentPeakToPeak: parseFloat(currentPeakToPeak.toFixed(2)),
        power,
        currentSpectralFeatures: { fundamentalFrequency: 50.0, thd: 1.8 }
      },
      thermal: {
        temperature: parseFloat(temperature.toFixed(1)),
        temperatureRiseFromBaseline: null, // Will be computed by Ingestion against Baseline
        temperatureRiseRate: tempRiseRate,
        temperatureVariation: tempVariation
      },
      vibration: {
        magnitude: parseFloat(vibRms.toFixed(2)),
        rms: parseFloat(vibRms.toFixed(2)),
        peak: parseFloat(vibPeak.toFixed(2)),
        peakToPeak: parseFloat((vibPeak * 2).toFixed(2)),
        variance: parseFloat((vibRms * vibRms).toFixed(4)),
        standardDeviation: parseFloat(vibRms.toFixed(2)),
        kurtosis: parseFloat(kurtosis.toFixed(2)),
        skewness: parseFloat(skewness.toFixed(2)),
        crestFactor: parseFloat(crestFactor.toFixed(2)),
        dominantFrequency: dominantFreq,
        spectralEnergy,
        spectralEntropy: 0.45,
        frequencyBandEnergy: { low: 25.0, mid: 10.0, high: 2.0 },
        harmonics: [
          { order: 1, frequency: dominantFreq, amplitude: vibRms * 0.8 }
        ]
      },
      rpm,
      runningFrequency: dominantFreq,
      metadata: {
        dataSource: 'Synthetic Placeholder Provider',
        simulationScenario: scenario,
        isSimulated: true
      },
      provenance: {
        physical: ['voltage', 'current', 'temperature', 'vibration'],
        externallyProcessed: ['vibrationRms', 'crestFactor', 'kurtosis', 'power'],
        derived: ['rpm', 'healthState', 'diagnostics']
      }
    };
  }
}

export const placeholderExternalProvider = new PlaceholderExternalProvider();
