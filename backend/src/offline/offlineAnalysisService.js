/**
 * MOTORSYNC Backend — Offline Dataset Analysis Service
 * 
 * Master Specification Section 35, 36, 37, 51, 56:
 * - Parses uploaded CSV, JSON, and XML dataset files safely.
 * - Extracts time-series and processed features.
 * - Derives sampling rate: Fs = 1 / Delta t.
 * - Computes time-domain statistics and FFT spectral decomposition on raw waveforms.
 * - Preserves reference dataset labels without confusing them with model predictions.
 * - Persists analysis records in SQLite analyses table.
 */

import { analysisRepository } from '../repositories/analysisRepository.js';
import { timeDomainFeaturesService } from '../processing/timeDomainFeaturesService.js';
import { fftService } from '../processing/fftService.js';
import { runningFrequencyService } from '../processing/runningFrequencyService.js';
import { baselineService } from '../baselines/baselineService.js';
import { healthAssessmentService } from '../diagnostics/healthAssessmentService.js';
import { inferenceService } from '../ai/inferenceService.js';
import { logger } from '../utils/logger.js';

export class OfflineAnalysisService {
  constructor(repo = null) {
    this.repo = repo || analysisRepository;
  }

  /**
   * Parse and analyze raw file text.
   * 
   * @param {string} fileContent - Raw text of CSV, JSON, or XML file
   * @param {string} filename - Name of uploaded file
   * @param {string} motorId - Target motor association
   * @returns {Object} Complete analysis record
   */
  async processFile(fileContent, filename, motorId = 'MTR-001') {
    if (!fileContent || typeof fileContent !== 'string') {
      throw new Error('Empty or invalid file content');
    }

    const ext = filename.split('.').pop().toLowerCase();
    let parsedData = null;

    if (ext === 'json') {
      parsedData = this._parseJSON(fileContent);
    } else if (ext === 'csv' || ext === 'txt') {
      parsedData = this._parseCSV(fileContent);
    } else if (ext === 'xml') {
      parsedData = this._parseXML(fileContent);
    } else {
      throw new Error(`Unsupported file format: .${ext}. Must be CSV, JSON, or XML.`);
    }

    const { telemetryRows, samplingRate, referenceLabel, detectedChannels } = parsedData;

    if (telemetryRows.length === 0) {
      throw new Error('Dataset contains zero valid numeric data rows');
    }

    // Extract vibration waveform array if available
    const vibSamples = telemetryRows
      .map(r => r.vibration ?? r.vibrationRms)
      .filter(v => v !== null && !isNaN(v));

    let timeFeatures = {};
    let spectrum = null;
    let speedAnalysis = { frequency: null, rpm: null, available: false };

    if (vibSamples.length >= 4) {
      timeFeatures = timeDomainFeaturesService.extract(vibSamples);

      // FFT calculation if samplingRate is known (Section 16: Never assume Fs)
      if (samplingRate && samplingRate > 0) {
        spectrum = fftService.computeSpectrum(vibSamples, samplingRate);
        speedAnalysis = runningFrequencyService.detectRunningFrequency(spectrum);
      }
    }

    // Calculate mean electrical and thermal features
    const avg = (key) => {
      const vals = telemetryRows.map(r => r[key]).filter(v => v !== null && !isNaN(v));
      return vals.length > 0 ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : null;
    };

    const meanCurrent = avg('current') ?? avg('currentRms');
    const meanVoltage = avg('voltage') ?? avg('voltageRms');
    const meanTemp = avg('temperature');

    // Synthesize aggregate payload for health and diagnostic engines
    const aggregatePayload = {
      motorId,
      sourceType: 'OFFLINE_FILE',
      timestamp: new Date().toISOString(),
      electrical: {
        voltageRms: meanVoltage,
        currentRms: meanCurrent,
        power: (meanVoltage != null && meanCurrent != null) ? parseFloat(((Math.sqrt(3) * meanVoltage * meanCurrent * 0.85) / 1000).toFixed(2)) : null
      },
      thermal: {
        temperature: meanTemp
      },
      vibration: {
        ...timeFeatures,
        dominantFrequency: spectrum?.dominantFrequency || null,
        spectralEnergy: spectrum?.spectralEnergy || null,
        harmonics: spectrum?.harmonics || []
      },
      rpm: speedAnalysis.rpm,
      runningFrequency: speedAnalysis.frequency
    };

    // Run baseline comparison, health assessment, and AI diagnostics
    const baselineDev = baselineService.calculateDeviations(motorId, aggregatePayload);
    const health = healthAssessmentService.evaluate(aggregatePayload, baselineDev);
    const diag = inferenceService.infer(aggregatePayload, { baselineDeviations: baselineDev, health });

    const duration = (samplingRate && samplingRate > 0) 
      ? parseFloat((telemetryRows.length / samplingRate).toFixed(3)) 
      : null;

    const analysisRecord = {
      analysisId: `ANL-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
      motorId,
      datasetName: filename,
      timestamp: new Date().toISOString(),
      sourceType: 'OFFLINE_FILE',
      sampleCount: telemetryRows.length,
      duration,
      samplingRate: samplingRate || null,
      availableFeatures: detectedChannels,
      results: {
        timeFeatures,
        spectrum,
        speedAnalysis,
        means: {
          currentRms: meanCurrent,
          voltageRms: meanVoltage,
          temperature: meanTemp
        },
        health
      },
      diagnosticResult: diag,
      referenceLabel: referenceLabel || null
    };

    // Save to database
    return this.repo.save(analysisRecord);
  }

  _parseJSON(content) {
    const json = JSON.parse(content);
    let rows = [];
    let samplingRate = null;
    let referenceLabel = null;

    if (Array.isArray(json)) {
      rows = json;
    } else if (json.data && Array.isArray(json.data)) {
      rows = json.data;
      samplingRate = json.samplingRate || json.metadata?.samplingRate || null;
      referenceLabel = json.referenceLabel || json.label || null;
    } else if (json.telemetry && Array.isArray(json.telemetry)) {
      rows = json.telemetry;
      samplingRate = json.samplingRate || null;
      referenceLabel = json.referenceLabel || null;
    }

    const detected = new Set();
    const cleanRows = rows.map(r => {
      const row = {};
      if (r.vibration !== undefined) { row.vibration = Number(r.vibration); detected.add('vibration'); }
      if (r.vibrationRms !== undefined) { row.vibrationRms = Number(r.vibrationRms); detected.add('vibrationRms'); }
      if (r.current !== undefined) { row.current = Number(r.current); detected.add('current'); }
      if (r.currentRms !== undefined) { row.currentRms = Number(r.currentRms); detected.add('currentRms'); }
      if (r.voltage !== undefined) { row.voltage = Number(r.voltage); detected.add('voltage'); }
      if (r.temperature !== undefined) { row.temperature = Number(r.temperature); detected.add('temperature'); }
      if (r.timestamp !== undefined) { row.timestamp = r.timestamp; }
      return row;
    });

    return {
      telemetryRows: cleanRows,
      samplingRate: Number(samplingRate) || null,
      referenceLabel,
      detectedChannels: Array.from(detected)
    };
  }

  _parseCSV(content) {
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    let samplingRate = null;
    let referenceLabel = null;
    const dataLines = [];

    // Header / comment extraction
    for (const line of lines) {
      if (line.startsWith('#')) {
        const lower = line.toLowerCase();
        if (lower.includes('fs') || lower.includes('sampling')) {
          const match = line.match(/(\d+(\.\d+)?)/);
          if (match) samplingRate = parseFloat(match[1]);
        }
        if (lower.includes('condition') || lower.includes('label') || lower.includes('fault')) {
          const parts = line.split(/[:=]/);
          if (parts[1]) referenceLabel = parts[1].trim();
        }
      } else {
        dataLines.push(line);
      }
    }

    if (dataLines.length < 2) {
      throw new Error('CSV must contain a header row and at least one data row');
    }

    const headers = dataLines[0].split(',').map(h => h.trim().toLowerCase());
    const detected = new Set();
    const rows = [];

    for (let i = 1; i < dataLines.length; i++) {
      const parts = dataLines[i].split(',').map(p => p.trim());
      if (parts.length < headers.length) continue;

      const row = {};
      headers.forEach((h, colIdx) => {
        const val = Number(parts[colIdx]);
        if (!isNaN(val)) {
          if (h.includes('vib') || h.includes('acc')) { row.vibration = val; detected.add('vibration'); }
          else if (h.includes('curr') || h.includes('amp') || h === 'i') { row.current = val; detected.add('current'); }
          else if (h.includes('volt') || h === 'v') { row.voltage = val; detected.add('voltage'); }
          else if (h.includes('temp') || h === 't') { row.temperature = val; detected.add('temperature'); }
        }
      });
      rows.push(row);
    }

    return {
      telemetryRows: rows,
      samplingRate: Number(samplingRate) || null,
      referenceLabel,
      detectedChannels: Array.from(detected)
    };
  }

  _parseXML(content) {
    // Clean regex XML parser for portable zero-dependency parsing
    const rows = [];
    const detected = new Set();
    let samplingRate = null;

    const fsMatch = content.match(/<samplingRate>(\d+(\.\d+)?)<\/samplingRate>/i);
    if (fsMatch) samplingRate = parseFloat(fsMatch[1]);

    const recordRegex = /<record>([\s\S]*?)<\/record>/gi;
    let match;
    while ((match = recordRegex.exec(content)) !== null) {
      const rec = match[1];
      const row = {};
      const vibM = rec.match(/<vibration>([^<]+)<\/vibration>/i);
      const currM = rec.match(/<current>([^<]+)<\/current>/i);
      const voltM = rec.match(/<voltage>([^<]+)<\/voltage>/i);
      const tempM = rec.match(/<temperature>([^<]+)<\/temperature>/i);

      if (vibM && !isNaN(Number(vibM[1]))) { row.vibration = Number(vibM[1]); detected.add('vibration'); }
      if (currM && !isNaN(Number(currM[1]))) { row.current = Number(currM[1]); detected.add('current'); }
      if (voltM && !isNaN(Number(voltM[1]))) { row.voltage = Number(voltM[1]); detected.add('voltage'); }
      if (tempM && !isNaN(Number(tempM[1]))) { row.temperature = Number(tempM[1]); detected.add('temperature'); }

      rows.push(row);
    }

    return {
      telemetryRows: rows,
      samplingRate,
      referenceLabel: null,
      detectedChannels: Array.from(detected)
    };
  }

  getAnalysis(analysisId) {
    return this.repo.findByAnalysisId(analysisId);
  }

  listAnalyses(options = {}) {
    return this.repo.findAll(options);
  }
}

export const offlineAnalysisService = new OfflineAnalysisService();
