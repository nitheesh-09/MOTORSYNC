/**
 * MOTORSYNC Backend — Offline Analysis Controller
 * 
 * Master Specification Section 5, 35, 36, 37:
 * Dataset upload, file parsing, and offline analysis retrieval.
 */

import { offlineAnalysisService } from '../../offline/offlineAnalysisService.js';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

export class OfflineController {
  async upload(req, res) {
    try {
      let fileContent = '';
      let filename = 'dataset.csv';
      let motorId = req.body?.motorId || 'MTR-001';

      if (req.file) {
        fileContent = req.file.buffer.toString('utf-8');
        filename = req.file.originalname || filename;
      } else if (typeof req.body === 'string') {
        fileContent = req.body;
      } else if (req.body?.content) {
        fileContent = req.body.content;
        filename = req.body.filename || filename;
      } else if (req.body?.data || req.body?.telemetry) {
        fileContent = JSON.stringify(req.body);
        filename = req.body.filename || 'dataset.json';
      } else {
        return sendError(res, 'NO_FILE_UPLOADED', 'A file or file content string is required', 400);
      }

      const result = await offlineAnalysisService.processFile(fileContent, filename, motorId);
      return sendSuccess(res, result, { message: 'Offline dataset processed successfully' }, 201);
    } catch (err) {
      return sendError(res, 'OFFLINE_PROCESSING_ERROR', err.message, 400);
    }
  }

  async analyze(req, res) {
    return this.upload(req, res);
  }

  getById(req, res) {
    const { analysisId } = req.params;
    const record = offlineAnalysisService.getAnalysis(analysisId);
    if (!record) {
      return sendError(res, 'ANALYSIS_NOT_FOUND', `Analysis ${analysisId} not found`, 404);
    }

    return sendSuccess(res, { analysis: record });
  }

  list(req, res) {
    const { motorId, limit, offset } = req.query;
    const analyses = offlineAnalysisService.listAnalyses({ motorId, limit, offset });
    return sendSuccess(res, { analyses, total: analyses.length });
  }
}

export const offlineController = new OfflineController();
