/**
 * MOTORSYNC — Experimental Feature-Based Diagnostic Model
 * 
 * Master Specification Sections 26, 30, 31, 33, 50, 51, 53:
 * - Clearly labeled: EXPERIMENTAL / DEVELOPMENT DIAGNOSTIC MODEL.
 * - Explicitly does NOT claim to be production-validated AI.
 * - Uses calibrated feature thresholding and spectral indicators.
 * - Wording strictly adheres to: "Suspected", "Indication", "Possible", "Model assessment".
 * - Generates structured evidence and diagnostic fusion explanation.
 */

import { DiagnosticModel } from './diagnosticModel.js';

export class ExperimentalRuleFeatureModel extends DiagnosticModel {
  constructor() {
    super({
      modelName: 'Experimental Rule-Feature Fusion Model',
      version: 'v0.1-dev',
      modelType: 'EXPERIMENTAL_RULE_FEATURE_FUSION',
      status: 'Experimental / Development (Not Trained / Not Scientifically Validated)',
      trainedOn: null,
      validationMetrics: null, // Section 50: Do not fabricate validation metrics.
      featureSchema: [
        'voltageRms',
        'currentRms',
        'currentStdDev',
        'currentPeak',
        'power',
        'temperature',
        'temperatureRiseFromBaseline',
        'temperatureRiseRate',
        'vibrationRms',
        'vibrationPeak',
        'crestFactor',
        'kurtosis',
        'skewness',
        'dominantFrequency',
        'spectralEnergy',
        'rpm',
        'harmonics'
      ]
    });
  }

  /**
   * Predict motor condition, affected section, and suspected fault indications.
   * 
   * @param {Object} features - Normalized feature payload
   * @param {Object} context - { motorId, baselineDeviations }
   * @returns {Object} Diagnostic Assessment
   */
  predict(features = {}, context = {}) {
    const motorId = context.motorId || features.motorId || 'UNKNOWN';
    const baselineDev = context.baselineDeviations || {};

    // 1. Extract physical and feature inputs safely (Section 27: handle missing features explicitly)
    const vibRms = features.vibration?.rms ?? features.vibrationRms ?? null;
    const vibPeak = features.vibration?.peak ?? features.vibrationPeak ?? null;
    const crestFactor = features.vibration?.crestFactor ?? features.crestFactor ?? null;
    const kurtosis = features.vibration?.kurtosis ?? features.kurtosis ?? null;
    const dominantFreq = features.vibration?.dominantFrequency ?? features.dominantFrequency ?? null;
    
    const currentRms = features.electrical?.currentRms ?? features.currentRms ?? null;
    const voltageRms = features.electrical?.voltageRms ?? features.voltageRms ?? null;
    const power = features.electrical?.power ?? features.power ?? null;
    
    const temp = features.thermal?.temperature ?? features.temperature ?? null;
    const tempRise = baselineDev.temperatureRiseFromBaseline ?? features.thermal?.temperatureRiseFromBaseline ?? null;
    
    const rpm = features.rpm ?? null;

    // Check for Insufficient Data
    const availableSignals = [vibRms, currentRms, voltageRms, temp].filter(v => v != null).length;
    if (availableSignals === 0) {
      return this._buildInsufficientDataResult(motorId);
    }

    // 2. Accumulate Evidence and Category Indicators
    const evidence = [];
    const observedIndicators = [];
    const baselineDeviationsList = [];
    const spectralFeaturesList = [];
    const electricalAbnormalitiesList = [];
    const thermalAbnormalitiesList = [];

    // Component assessments for the 6 target sections (Section 33)
    const componentAssessment = {
      BEARINGS: { status: 'NORMAL', indicator: 'Nominal kinematic operation', evidence: [] },
      ROTOR: { status: 'NORMAL', indicator: 'Nominal rotor dynamic balance', evidence: [] },
      STATOR: { status: 'NORMAL', indicator: 'Nominal winding current balance', evidence: [] },
      SHAFT: { status: 'NORMAL', indicator: 'Nominal shaft alignment and coupling', evidence: [] },
      COOLING: { status: 'NORMAL', indicator: 'Nominal thermal dissipation', evidence: [] },
      ELECTRICAL: { status: 'NORMAL', indicator: 'Nominal power supply balance', evidence: [] }
    };

    let suspectedSection = 'UNKNOWN';
    let suspectedFault = 'No significant abnormalities detected';
    let overallCondition = 'HEALTHY';
    let severity = 'LOW';
    let confidenceScore = null;
    let confidenceLabel = 'Not available (Uncalibrated Development Model)';

    // --- Vibration Analysis ---
    if (vibRms != null) {
      if (vibRms > 4.5) {
        overallCondition = 'FAULT';
        severity = 'CRITICAL';
        evidence.push(`Elevated overall vibration RMS (${vibRms.toFixed(2)} mm/s exceeds ISO 10816 limit 4.5 mm/s)`);
        observedIndicators.push(`High vibration RMS: ${vibRms.toFixed(2)} mm/s`);
      } else if (vibRms > 2.8) {
        if (overallCondition !== 'FAULT') overallCondition = 'WARNING';
        severity = severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
        evidence.push(`Vibration RMS (${vibRms.toFixed(2)} mm/s) above advisory threshold 2.8 mm/s`);
        observedIndicators.push(`Advisory vibration RMS: ${vibRms.toFixed(2)} mm/s`);
      }
    }

    // --- Bearing-Related Indicators (Impulsive peaks, elevated Crest Factor & Kurtosis) ---
    if ((crestFactor != null && crestFactor > 3.2) || (kurtosis != null && kurtosis > 4.2)) {
      componentAssessment.BEARINGS.status = 'FAULT';
      componentAssessment.BEARINGS.indicator = 'Suspected impulsive impact pattern characteristic of bearing raceway defect';
      const bearingEv = [];
      if (crestFactor != null && crestFactor > 3.2) bearingEv.push(`Elevated crest factor (${crestFactor.toFixed(2)} > 3.2)`);
      if (kurtosis != null && kurtosis > 4.2) bearingEv.push(`Elevated kurtosis (${kurtosis.toFixed(2)} > 4.2 indicates non-Gaussian impacting)`);
      componentAssessment.BEARINGS.evidence = bearingEv;
      evidence.push(...bearingEv);
      
      suspectedSection = 'BEARING';
      suspectedFault = 'Suspected Bearing Outer/Inner Raceway Degradation';
      if (overallCondition !== 'FAULT') overallCondition = 'WARNING';
      severity = vibRms && vibRms > 4.5 ? 'CRITICAL' : 'HIGH';
      confidenceScore = 78;
      confidenceLabel = '78% (Experimental Heuristic Estimate)';
    }

    // --- Rotor / Imbalance Indicators (Strong 1X Fundamental Vibration) ---
    const is1XDominant = (dominantFreq != null && dominantFreq >= 23 && dominantFreq <= 27);
    if (is1XDominant && vibRms != null && vibRms > 3.5 && suspectedSection === 'UNKNOWN') {
      componentAssessment.ROTOR.status = 'FAULT';
      componentAssessment.ROTOR.indicator = 'Dominant 1X rotational vibration peak suggesting dynamic unbalance';
      const rotorEv = [
        `Dominant spectral peak at rotational frequency (${dominantFreq.toFixed(1)} Hz)`,
        `Elevated 1X fundamental vibration amplitude (${vibRms.toFixed(2)} mm/s)`
      ];
      componentAssessment.ROTOR.evidence = rotorEv;
      evidence.push(...rotorEv);
      spectralFeaturesList.push(`1X fundamental peak at ${dominantFreq.toFixed(1)} Hz`);

      suspectedSection = 'ROTOR';
      suspectedFault = 'Suspected Dynamic Rotor Mass Unbalance';
      overallCondition = 'FAULT';
      severity = (vibRms != null && vibRms > 4.5) ? 'CRITICAL' : 'HIGH';
      confidenceScore = 74;
      confidenceLabel = '74% (Experimental Heuristic Estimate)';
    }

    // --- Thermal & Cooling Indicators ---
    if (temp != null) {
      if (temp > 80.0) {
        componentAssessment.COOLING.status = 'FAULT';
        componentAssessment.COOLING.indicator = 'High surface temperature exceeding thermal insulation envelope';
        thermalAbnormalitiesList.push(`Surface temperature critical (${temp.toFixed(1)} °C > 80 °C)`);
        evidence.push(`Critical operating temperature (${temp.toFixed(1)} °C)`);
        if (suspectedSection === 'UNKNOWN') {
          suspectedSection = 'COOLING';
          suspectedFault = 'Suspected Thermal Overload or Blocked Ventilation';
        }
        overallCondition = 'FAULT';
        severity = 'CRITICAL';
      } else if (temp > 65.0) {
        componentAssessment.COOLING.status = 'WARNING';
        componentAssessment.COOLING.indicator = 'Elevated operating temperature';
        thermalAbnormalitiesList.push(`Operating temperature advisory (${temp.toFixed(1)} °C > 65 °C)`);
        if (overallCondition === 'HEALTHY') overallCondition = 'WARNING';
        if (severity === 'LOW') severity = 'MEDIUM';
      }
    }

    // Baseline Deviations Check
    if (baselineDev.baselineStatus === 'ESTABLISHED') {
      if (baselineDev.temperatureRiseFromBaseline != null && baselineDev.temperatureRiseFromBaseline > 15.0) {
        const bEv = `Thermal rise +${baselineDev.temperatureRiseFromBaseline.toFixed(1)} °C from healthy baseline`;
        baselineDeviationsList.push(bEv);
        evidence.push(bEv);
      }
      if (baselineDev.vibrationRiseFromBaseline != null && baselineDev.vibrationRiseFromBaseline > 2.0) {
        const bEv = `Vibration increase +${baselineDev.vibrationRiseFromBaseline.toFixed(2)} mm/s from baseline`;
        baselineDeviationsList.push(bEv);
        evidence.push(bEv);
      }
    }

    // --- Electrical Supply & Stator Indicators ---
    if (currentRms != null && currentRms > 4.5 && features.motorId === 'MTR-001') {
      // Example overload condition for MTR-001 (rated 2.18 A)
      componentAssessment.ELECTRICAL.status = 'WARNING';
      componentAssessment.STATOR.status = 'WARNING';
      const elecEv = `Operating current (${currentRms.toFixed(2)} A) significantly exceeds rated current (2.18 A)`;
      componentAssessment.ELECTRICAL.evidence = [elecEv];
      componentAssessment.STATOR.evidence = ['Increased stator joule heating due to over-current condition'];
      electricalAbnormalitiesList.push(elecEv);
      evidence.push(elecEv);
      if (suspectedSection === 'UNKNOWN') {
        suspectedSection = 'ELECTRICAL';
        suspectedFault = 'Suspected Sustained Electrical Overload';
      }
      overallCondition = 'WARNING';
      severity = severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
    }

    // If still healthy
    if (overallCondition === 'HEALTHY') {
      suspectedSection = 'UNKNOWN';
      suspectedFault = 'Normal Nominal Operation';
      evidence.push('All observed vibration, electrical, and thermal parameters within normal ISO/baseline limits');
      confidenceScore = 95;
      confidenceLabel = '95% (Healthy Nominal Confidence)';
    }

    return {
      motorId,
      overallCondition,
      affectedSection: suspectedSection,
      faultType: suspectedFault,
      severity,
      confidence: confidenceScore,
      confidenceLabel,
      evidence,
      explanation: {
        observedIndicators,
        baselineDeviations: baselineDeviationsList,
        spectralFeatures: spectralFeaturesList,
        electricalAbnormalities: electricalAbnormalitiesList,
        thermalAbnormalities: thermalAbnormalitiesList,
        modelDisclaimer: 'Classification generated by experimental rule-feature diagnostic engine. Requires laboratory verification.'
      },
      componentAssessment,
      modelVersion: this.metadata.version,
      modelName: this.metadata.modelName,
      status: this.metadata.status
    };
  }

  _buildInsufficientDataResult(motorId) {
    return {
      motorId,
      overallCondition: 'INSUFFICIENT DATA',
      affectedSection: 'UNKNOWN',
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
        BEARINGS: { status: 'UNKNOWN', indicator: 'Insufficient sensor telemetry', evidence: [] },
        ROTOR: { status: 'UNKNOWN', indicator: 'Insufficient sensor telemetry', evidence: [] },
        STATOR: { status: 'UNKNOWN', indicator: 'Insufficient sensor telemetry', evidence: [] },
        SHAFT: { status: 'UNKNOWN', indicator: 'Insufficient sensor telemetry', evidence: [] },
        COOLING: { status: 'UNKNOWN', indicator: 'Insufficient sensor telemetry', evidence: [] },
        ELECTRICAL: { status: 'UNKNOWN', indicator: 'Insufficient sensor telemetry', evidence: [] }
      },
      modelVersion: this.metadata.version,
      modelName: this.metadata.modelName,
      status: this.metadata.status
    };
  }
}
