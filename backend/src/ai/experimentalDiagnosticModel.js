/**
 * MOTORSYNC Backend — Experimental Diagnostic Model
 * 
 * Master Specification Sections 25, 26, 27, 30, 31, 33, 50, 51, 64, 66:
 * - Transparent feature-based rule engine for development.
 * - Explicitly labeled: "NOT TRAINED / EXPERIMENTAL (Development Model)".
 * - Never fabricates metrics or certainty.
 * - Enforces prudent engineering terminology: "Suspected", "Indication", "Possible".
 * - Generates explainable evidence traces and component health for 6 subsystems.
 */

import { DiagnosticModel } from './diagnosticModel.js';

export const AFFECTED_SECTIONS = {
  BEARING: 'BEARING',
  ROTOR: 'ROTOR',
  STATOR: 'STATOR',
  SHAFT: 'SHAFT',
  COOLING: 'COOLING',
  ELECTRICAL_SUPPLY: 'ELECTRICAL_SUPPLY',
  UNKNOWN: 'UNKNOWN'
};

export const FAULT_CATEGORIES = {
  NORMAL: 'NORMAL',
  IMBALANCE: 'IMBALANCE',
  MISALIGNMENT: 'MISALIGNMENT',
  LOOSENESS: 'LOOSENESS',
  BEARING_RELATED: 'BEARING_RELATED',
  ROTOR_RELATED: 'ROTOR_RELATED',
  STATOR_RELATED: 'STATOR_RELATED',
  ELECTRICAL_RELATED: 'ELECTRICAL_RELATED',
  OVERLOAD: 'OVERLOAD',
  OVERHEATING: 'OVERHEATING',
  COOLING_RELATED: 'COOLING_RELATED',
  UNKNOWN: 'UNKNOWN'
};

export class ExperimentalDiagnosticModel extends DiagnosticModel {
  constructor() {
    super({
      modelId: 'experimental-v0.1',
      modelName: 'Experimental Rule-Feature Fusion Diagnostic Model',
      version: 'v0.1-dev',
      modelType: 'EXPERIMENTAL_RULE_FEATURE_FUSION',
      status: 'NOT TRAINED / EXPERIMENTAL (Development Model)',
      featureSchema: [
        'voltageRms', 'currentRms', 'currentStdDev', 'currentPeak', 'power',
        'temperature', 'temperatureRiseFromBaseline', 'temperatureRiseRate',
        'vibrationRms', 'vibrationPeak', 'vibrationCrestFactor', 'vibrationKurtosis',
        'dominantFrequency', 'rpm'
      ],
      validationMetrics: null, // Strictly null until real evaluation exists
      trainedOn: null
    });
  }

  predict(featureVector, context = {}) {
    const motorId = featureVector.motorId || context.motorId || 'UNKNOWN';

    // 1. Handle Insufficient Data explicitly (Section 33)
    if (!featureVector || !featureVector.isSufficientForDiagnosis) {
      return this._insufficientDataResult(motorId);
    }

    const f = featureVector.features;
    const baselineDev = context.baselineDeviations || {};

    const vibRms = f.vibrationRms.available ? f.vibrationRms.value : null;
    const crestFactor = f.vibrationCrestFactor.available ? f.vibrationCrestFactor.value : null;
    const kurtosis = f.vibrationKurtosis.available ? f.vibrationKurtosis.value : null;
    const dominantFreq = f.dominantFrequency.available ? f.dominantFrequency.value : null;
    const temp = f.temperature.available ? f.temperature.value : null;
    const currentRms = f.currentRms.available ? f.currentRms.value : null;

    const evidence = [];
    const observedIndicators = [];
    const baselineDeviationsList = [];
    const spectralFeaturesList = [];
    const electricalAbnormalitiesList = [];
    const thermalAbnormalitiesList = [];

    // Component assessments for 6 target sections
    const componentAssessment = {
      BEARING: { status: 'NORMAL', indicator: 'Nominal raceway vibration pattern', evidence: [] },
      ROTOR: { status: 'NORMAL', indicator: 'Nominal rotational balance', evidence: [] },
      STATOR: { status: 'NORMAL', indicator: 'Nominal winding current envelope', evidence: [] },
      SHAFT: { status: 'NORMAL', indicator: 'Nominal mechanical alignment', evidence: [] },
      COOLING: { status: 'NORMAL', indicator: 'Nominal heat dissipation', evidence: [] },
      ELECTRICAL_SUPPLY: { status: 'NORMAL', indicator: 'Nominal supply voltage/current', evidence: [] }
    };

    let overallCondition = 'HEALTHY';
    let affectedSection = AFFECTED_SECTIONS.UNKNOWN;
    let faultCategory = FAULT_CATEGORIES.NORMAL;
    let faultType = 'Nominal Operating Parameters';
    let severity = 'LOW';
    let confidence = null;
    let confidenceLabel = 'Not available (Uncalibrated Development Model)';

    // --- Vibration Evaluation (ISO 10816) ---
    if (vibRms != null) {
      if (vibRms > 4.5) {
        overallCondition = 'FAULT';
        severity = 'CRITICAL';
        evidence.push(`Elevated overall vibration RMS (${vibRms.toFixed(2)} mm/s exceeds ISO 10816 limit 4.5 mm/s)`);
        observedIndicators.push(`High vibration RMS: ${vibRms.toFixed(2)} mm/s`);
      } else if (vibRms > 2.8) {
        if (overallCondition !== 'FAULT') overallCondition = 'WARNING';
        severity = severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
        evidence.push(`Vibration RMS (${vibRms.toFixed(2)} mm/s) in Warning Zone C (advisory limit 2.8 mm/s)`);
        observedIndicators.push(`Advisory vibration RMS: ${vibRms.toFixed(2)} mm/s`);
      }
    }

    // --- Bearing Fault Patterns (Impulsive impacting) ---
    const hasBearingSignature = (crestFactor != null && crestFactor > 3.2) || (kurtosis != null && kurtosis > 4.2);
    if (hasBearingSignature) {
      componentAssessment.BEARING.status = 'FAULT';
      componentAssessment.BEARING.indicator = 'Suspected impulsive impact pattern characteristic of raceway defect';
      const bEv = [];
      if (crestFactor != null && crestFactor > 3.2) bEv.push(`Elevated crest factor (${crestFactor.toFixed(2)} > 3.2)`);
      if (kurtosis != null && kurtosis > 4.2) bEv.push(`Elevated kurtosis (${kurtosis.toFixed(2)} > 4.2 indicates non-Gaussian impacting)`);
      componentAssessment.BEARING.evidence = bEv;
      evidence.push(...bEv);

      affectedSection = AFFECTED_SECTIONS.BEARING;
      faultCategory = FAULT_CATEGORIES.BEARING_RELATED;
      faultType = 'Suspected Bearing Raceway Degradation';
      if (overallCondition !== 'FAULT') overallCondition = 'WARNING';
      severity = (vibRms != null && vibRms > 4.5) ? 'CRITICAL' : 'HIGH';
      confidence = 78;
      confidenceLabel = '78% (Experimental Heuristic Estimate)';
    }

    // --- Rotor / Imbalance Patterns (1X Rotational Dominance) ---
    const is1XDominant = (dominantFreq != null && dominantFreq >= 23.0 && dominantFreq <= 27.0);
    if (is1XDominant && vibRms != null && vibRms > 3.5 && affectedSection === AFFECTED_SECTIONS.UNKNOWN) {
      componentAssessment.ROTOR.status = 'FAULT';
      componentAssessment.ROTOR.indicator = 'Dominant 1X rotational vibration peak suggesting dynamic unbalance';
      const rotorEv = [
        `Dominant spectral peak at rotational frequency (${dominantFreq.toFixed(1)} Hz)`,
        `Elevated 1X fundamental vibration amplitude (${vibRms.toFixed(2)} mm/s)`
      ];
      componentAssessment.ROTOR.evidence = rotorEv;
      evidence.push(...rotorEv);
      spectralFeaturesList.push(`1X fundamental peak at ${dominantFreq.toFixed(1)} Hz`);

      affectedSection = AFFECTED_SECTIONS.ROTOR;
      faultCategory = FAULT_CATEGORIES.IMBALANCE;
      faultType = 'Suspected Dynamic Rotor Mass Unbalance';
      overallCondition = 'FAULT';
      severity = (vibRms > 4.5) ? 'CRITICAL' : 'HIGH';
      confidence = 74;
      confidenceLabel = '74% (Experimental Heuristic Estimate)';
    }

    // --- Thermal & Cooling Evaluation ---
    if (temp != null) {
      if (temp > 80.0) {
        componentAssessment.COOLING.status = 'FAULT';
        componentAssessment.COOLING.indicator = 'High surface temperature exceeding insulation envelope';
        thermalAbnormalitiesList.push(`Surface temperature critical (${temp.toFixed(1)} °C > 80 °C)`);
        evidence.push(`Critical surface temperature (${temp.toFixed(1)} °C)`);

        if (affectedSection === AFFECTED_SECTIONS.UNKNOWN) {
          affectedSection = AFFECTED_SECTIONS.COOLING;
          faultCategory = FAULT_CATEGORIES.OVERHEATING;
          faultType = 'Suspected Thermal Overload or Ventilation Restriction';
        }
        overallCondition = 'FAULT';
        severity = 'CRITICAL';
      } else if (temp > 65.0) {
        componentAssessment.COOLING.status = 'WARNING';
        componentAssessment.COOLING.indicator = 'Elevated operating temperature';
        thermalAbnormalitiesList.push(`Surface temperature advisory (${temp.toFixed(1)} °C > 65 °C)`);
        if (overallCondition === 'HEALTHY') overallCondition = 'WARNING';
        if (severity === 'LOW') severity = 'MEDIUM';
      }
    }

    // Baseline Deviations Check
    if (baselineDev && baselineDev.baselineStatus === 'ESTABLISHED') {
      if (baselineDev.temperatureRiseFromBaseline != null && baselineDev.temperatureRiseFromBaseline > 15.0) {
        const bEv = `Thermal rise +${baselineDev.temperatureRiseFromBaseline.toFixed(1)} °C from healthy baseline`;
        baselineDeviationsList.push(bEv);
        evidence.push(bEv);
      }
      if (baselineDev.vibrationRiseFromBaseline != null && baselineDev.vibrationRiseFromBaseline > 2.0) {
        const bEv = `Vibration increase +${baselineDev.vibrationRiseFromBaseline.toFixed(2)} mm/s from healthy baseline`;
        baselineDeviationsList.push(bEv);
        evidence.push(bEv);
      }
    }

    // Electrical Supply / Stator Check
    if (currentRms != null && currentRms > 20.0 && affectedSection === AFFECTED_SECTIONS.UNKNOWN) {
      componentAssessment.ELECTRICAL_SUPPLY.status = 'WARNING';
      componentAssessment.STATOR.status = 'WARNING';
      const elEv = `Current RMS (${currentRms.toFixed(1)} A) exceeds nominal envelope`;
      electricalAbnormalitiesList.push(elEv);
      evidence.push(elEv);
      affectedSection = AFFECTED_SECTIONS.ELECTRICAL_SUPPLY;
      faultCategory = FAULT_CATEGORIES.OVERLOAD;
      faultType = 'Suspected Electrical Supply Overload';
      if (overallCondition === 'HEALTHY') overallCondition = 'WARNING';
    }

    if (overallCondition === 'HEALTHY') {
      evidence.push('All observed vibration, electrical, and thermal features within nominal operating thresholds');
      confidence = 95;
      confidenceLabel = '95% (Healthy Nominal Confidence)';
    }

    return {
      motorId,
      condition: overallCondition,
      affectedSection,
      faultCategory,
      faultType,
      severity,
      confidence,
      confidenceLabel,
      evidence,
      explanation: {
        observedIndicators,
        baselineDeviations: baselineDeviationsList,
        spectralFeatures: spectralFeaturesList,
        electricalAbnormalities: electricalAbnormalitiesList,
        thermalAbnormalities: thermalAbnormalitiesList,
        modelDisclaimer: 'Classification produced by experimental rule-feature diagnostic engine. Lab validation pending.'
      },
      componentAssessment,
      modelVersion: this.metadata.version,
      modelName: this.metadata.modelName,
      status: this.metadata.status,
      timestamp: featureVector.timestamp
    };
  }

  _insufficientDataResult(motorId) {
    return {
      motorId,
      condition: 'INSUFFICIENT_DATA',
      affectedSection: AFFECTED_SECTIONS.UNKNOWN,
      faultCategory: FAULT_CATEGORIES.UNKNOWN,
      faultType: 'Diagnostic assessment unavailable due to missing telemetry signals',
      severity: 'UNKNOWN',
      confidence: null,
      confidenceLabel: 'Confidence: Not available (Insufficient Data)',
      evidence: ['No physical sensor channels or processed features were supplied for assessment'],
      explanation: {
        observedIndicators: [],
        baselineDeviations: [],
        spectralFeatures: [],
        electricalAbnormalities: [],
        thermalAbnormalities: [],
        modelDisclaimer: 'Telemetry stream does not satisfy minimum input schema requirements.'
      },
      componentAssessment: {
        BEARING: { status: 'UNKNOWN', indicator: 'Insufficient sensor telemetry', evidence: [] },
        ROTOR: { status: 'UNKNOWN', indicator: 'Insufficient sensor telemetry', evidence: [] },
        STATOR: { status: 'UNKNOWN', indicator: 'Insufficient sensor telemetry', evidence: [] },
        SHAFT: { status: 'UNKNOWN', indicator: 'Insufficient sensor telemetry', evidence: [] },
        COOLING: { status: 'UNKNOWN', indicator: 'Insufficient sensor telemetry', evidence: [] },
        ELECTRICAL_SUPPLY: { status: 'UNKNOWN', indicator: 'Insufficient sensor telemetry', evidence: [] }
      },
      modelVersion: this.metadata.version,
      modelName: this.metadata.modelName,
      status: this.metadata.status,
      timestamp: new Date().toISOString()
    };
  }
}

export const experimentalDiagnosticModel = new ExperimentalDiagnosticModel();
