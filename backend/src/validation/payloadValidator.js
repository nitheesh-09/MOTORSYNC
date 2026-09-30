/**
 * MOTORSYNC Backend — Ingestion Payload Validator
 * 
 * Master Specification Section 11 & 52:
 * Validates incoming payloads for schema correctness, data types,
 * motor association, timestamp validity, and data quality.
 * Sanitizes and normalizes payloads safely without crashing.
 */

export const ALLOWED_SOURCE_TYPES = ['SYNTHETIC', 'ESP32', 'EXTERNAL_LAPTOP', 'OFFLINE_FILE', 'HARDWARE_GATEWAY'];

export class PayloadValidator {
  /**
   * Validate and normalize incoming telemetry payload.
   * 
   * @param {any} rawPayload - Raw incoming payload
   * @param {Set<string>} validMotorIds - Set of registered motorIds
   * @returns {Object} { valid, errors, normalizedPayload, quality }
   */
  validate(rawPayload, validMotorIds = null) {
    const errors = [];

    if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
      return {
        valid: false,
        errors: ['Payload must be a non-null JSON object'],
        normalizedPayload: null,
        quality: { isClean: false, missingFields: ['all'] }
      };
    }

    // 1. Motor ID Validation
    const motorId = typeof rawPayload.motorId === 'string' ? rawPayload.motorId.trim() : null;
    if (!motorId) {
      errors.push('Missing required string field: motorId');
    } else if (validMotorIds && !validMotorIds.has(motorId)) {
      errors.push(`Unregistered motorId: ${motorId}`);
    }

    // 2. Timestamp Validation
    let timestamp = rawPayload.timestamp;
    if (!timestamp) {
      timestamp = new Date().toISOString();
    } else {
      const parsed = new Date(timestamp);
      if (isNaN(parsed.getTime())) {
        errors.push(`Invalid timestamp format: ${timestamp}`);
        timestamp = new Date().toISOString();
      } else {
        timestamp = parsed.toISOString();
      }
    }

    // 3. Source Type Validation
    let sourceType = rawPayload.sourceType || 'SYNTHETIC';
    if (!ALLOWED_SOURCE_TYPES.includes(sourceType)) {
      errors.push(`Invalid sourceType: ${sourceType}. Must be one of: ${ALLOWED_SOURCE_TYPES.join(', ')}`);
    }

    // 4. Safe Numeric Sanitizer Helper
    const cleanNum = (val) => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      if (isNaN(num) || !isFinite(num)) return null;
      return num;
    };

    // 5. Electrical Normalization
    const rawElec = (rawPayload.electrical && typeof rawPayload.electrical === 'object') ? rawPayload.electrical : {};
    const electrical = {
      voltageRms: cleanNum(rawElec.voltageRms ?? rawPayload.voltage),
      currentRms: cleanNum(rawElec.currentRms ?? rawPayload.current),
      currentStdDev: cleanNum(rawElec.currentStdDev),
      currentPeak: cleanNum(rawElec.currentPeak),
      currentPeakToPeak: cleanNum(rawElec.currentPeakToPeak),
      power: cleanNum(rawElec.power),
      currentSpectralFeatures: rawElec.currentSpectralFeatures || null
    };

    // 6. Thermal Normalization
    const rawTherm = (rawPayload.thermal && typeof rawPayload.thermal === 'object') ? rawPayload.thermal : {};
    const thermal = {
      temperature: cleanNum(rawTherm.temperature ?? rawPayload.temperature),
      temperatureRiseFromBaseline: cleanNum(rawTherm.temperatureRiseFromBaseline),
      temperatureRiseRate: cleanNum(rawTherm.temperatureRiseRate),
      temperatureVariation: cleanNum(rawTherm.temperatureVariation)
    };

    // 7. Vibration Normalization
    const rawVib = (rawPayload.vibration && typeof rawPayload.vibration === 'object') ? rawPayload.vibration : {};
    const vibration = {
      magnitude: cleanNum(rawVib.magnitude ?? rawPayload.vibration),
      rms: cleanNum(rawVib.rms ?? rawVib.vibrationRms ?? rawPayload.vibration),
      peak: cleanNum(rawVib.peak ?? rawVib.vibrationPeak),
      peakToPeak: cleanNum(rawVib.peakToPeak),
      variance: cleanNum(rawVib.variance),
      standardDeviation: cleanNum(rawVib.standardDeviation),
      kurtosis: cleanNum(rawVib.kurtosis),
      skewness: cleanNum(rawVib.skewness),
      crestFactor: cleanNum(rawVib.crestFactor),
      dominantFrequency: cleanNum(rawVib.dominantFrequency),
      spectralEnergy: cleanNum(rawVib.spectralEnergy),
      spectralEntropy: cleanNum(rawVib.spectralEntropy),
      frequencyBandEnergy: rawVib.frequencyBandEnergy || {},
      harmonics: Array.isArray(rawVib.harmonics) ? rawVib.harmonics : []
    };

    // 8. Speed Normalization (derived or externally validated RPM)
    const rpm = cleanNum(rawPayload.rpm);
    const runningFrequency = cleanNum(rawPayload.runningFrequency ?? (rpm != null ? (rpm / 60) : null));

    // 9. Data Quality Metrics
    const missingChannels = [];
    if (vibration.rms == null) missingChannels.push('vibration');
    if (thermal.temperature == null) missingChannels.push('temperature');
    if (electrical.currentRms == null) missingChannels.push('current');
    if (electrical.voltageRms == null) missingChannels.push('voltage');

    const quality = {
      isClean: missingChannels.length === 0,
      missingChannels,
      sampleQualityScore: Math.round(((4 - missingChannels.length) / 4) * 100),
      evaluatedAt: new Date().toISOString()
    };

    const normalizedPayload = {
      motorId,
      timestamp,
      sourceType,
      electrical,
      thermal,
      vibration,
      rpm,
      runningFrequency,
      rawData: (rawPayload.rawData && typeof rawPayload.rawData === 'object') ? rawPayload.rawData : null,
      metadata: rawPayload.metadata || {},
      provenance: rawPayload.provenance || {
        physical: ['voltage', 'current', 'temperature', 'vibration'],
        externallyProcessed: ['vibrationRms', 'crestFactor', 'kurtosis', 'power'],
        derived: ['rpm', 'healthState', 'diagnostics']
      },
      quality
    };

    return {
      valid: errors.length === 0,
      errors,
      normalizedPayload,
      quality
    };
  }
}

export const payloadValidator = new PayloadValidator();
