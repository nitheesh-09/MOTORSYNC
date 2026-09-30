/**
 * MOTORSYNC Backend — Data Source Controller
 * 
 * Master Specification Section 5, 9, 12, 13:
 * Endpoints for tracking and toggling data sources.
 */

import { dataSourceRepository } from '../../repositories/dataSourceRepository.js';
import { dataIngestionService } from '../../ingestion/dataIngestionService.js';
import { externalLaptopProvider } from '../../providers/externalLaptopProvider.js';
import { placeholderExternalProvider } from '../../providers/placeholderExternalProvider.js';
import { esp32RawIngestionService } from '../../ingestion/esp32RawIngestionService.js';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

export class DataSourceController {
  getAll(req, res) {
    const sources = dataSourceRepository.findAll();
    return sendSuccess(res, {
      activeSource: dataIngestionService.getActiveSource(),
      sources
    });
  }

  getStatus(req, res) {
    return sendSuccess(res, {
      activeSource: dataIngestionService.getActiveSource(),
      syntheticProvider: placeholderExternalProvider.getStatus(),
      externalLaptopProvider: externalLaptopProvider.getStatus(),
      esp32Hardware: esp32RawIngestionService.getEsp32Status()
    });
  }

  setSource(req, res) {
    const { sourceType } = req.body;
    const allowed = ['SYNTHETIC', 'ESP32', 'EXTERNAL_LAPTOP', 'OFFLINE_FILE'];
    if (!sourceType || !allowed.includes(sourceType)) {
      return sendError(res, 'INVALID_SOURCE', `sourceType must be one of: ${allowed.join(', ')}`, 400);
    }

    dataIngestionService.setActiveSource(sourceType);
    return sendSuccess(res, { activeSource: sourceType }, { message: `Active source updated to ${sourceType}` });
  }
}

export const dataSourceController = new DataSourceController();
