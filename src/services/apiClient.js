/**
 * MOTORSYNC Frontend — API Client Service
 * 
 * Communicates with MOTORSYNC REST API (/api/v1).
 * Features graceful error handling and local fallback if backend is offline.
 */

const API_BASE = '/api/v1';

class ApiClient {
  async _request(endpoint, options = {}) {
    try {
      const url = `${API_BASE}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        throw new Error(errorJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      return json.data;
    } catch (err) {
      console.warn(`[ApiClient] Request to ${endpoint} failed:`, err.message);
      throw err;
    }
  }

  // 1. System & Health
  async getHealth() {
    return this._request('/health');
  }

  async getSystemStatus() {
    return this._request('/system/status');
  }

  // 2. Motors Fleet
  async getMotors() {
    const data = await this._request('/motors');
    return data.motors || [];
  }

  async getMotor(motorId) {
    return this._request(`/motors/${motorId}`);
  }

  // 3. Telemetry
  async getLatestTelemetry(motorId) {
    const data = await this._request(`/motors/${motorId}/latest`);
    return data.latest;
  }

  async getTelemetryHistory(motorId, options = {}) {
    const params = new URLSearchParams(options).toString();
    const data = await this._request(`/motors/${motorId}/history${params ? '?' + params : ''}`);
    return data.records || [];
  }

  async ingestTelemetry(payload) {
    return this._request('/telemetry', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // 3a. ESP32 Real Hardware Raw Telemetry Ingestion (Section 2, 10, 22)
  async ingestRawTelemetry(rawSample) {
    return this._request('/telemetry/raw', {
      method: 'POST',
      body: JSON.stringify(rawSample)
    });
  }

  async ingestRawBatch(batchPayload) {
    return this._request('/telemetry/raw/batch', {
      method: 'POST',
      body: JSON.stringify(batchPayload)
    });
  }

  async getEsp32Status(motorId = 'MTR-001') {
    return this._request(`/telemetry/esp32/status?motorId=${motorId}`);
  }

  async getRawTelemetryLatest(motorId) {
    const data = await this._request(`/motors/${motorId}/raw/latest`);
    return data.latest;
  }

  async getRawTelemetryHistory(motorId, options = {}) {
    const params = new URLSearchParams(options).toString();
    const data = await this._request(`/motors/${motorId}/raw/history${params ? '?' + params : ''}`);
    return data.records || [];
  }

  // 4. Diagnostics
  async getDiagnostics(motorId) {
    return this._request(`/motors/${motorId}/diagnostics`);
  }

  // 5. Baselines
  async getBaseline(motorId) {
    const data = await this._request(`/motors/${motorId}/baseline`);
    return data.baseline;
  }

  // 6. Alerts
  async getAlerts(options = {}) {
    const params = new URLSearchParams(options).toString();
    const data = await this._request(`/alerts${params ? '?' + params : ''}`);
    return data.alerts || [];
  }

  async getAlertsForMotor(motorId) {
    const data = await this._request(`/motors/${motorId}/alerts`);
    return data.alerts || [];
  }

  // 7. Data Sources
  async getDataSources() {
    return this._request('/data-sources');
  }

  async setDataSource(sourceType) {
    return this._request('/data-sources/select', {
      method: 'POST',
      body: JSON.stringify({ sourceType })
    });
  }

  // 8. Offline Upload & Analysis
  async uploadOfflineFile(fileOrContent, filename = 'dataset.csv', motorId = 'MTR-001') {
    let body;
    let headers = {};

    if (fileOrContent instanceof File || fileOrContent instanceof Blob) {
      const formData = new FormData();
      formData.append('file', fileOrContent);
      formData.append('motorId', motorId);
      body = formData;
      // Fetch will automatically set multipart boundary when body is FormData
      headers = {};
    } else {
      body = JSON.stringify({ content: fileOrContent, filename, motorId });
      headers = { 'Content-Type': 'application/json' };
    }

    const response = await fetch(`${API_BASE}/offline/upload`, {
      method: 'POST',
      headers,
      body
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.error?.message || `Upload failed: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data;
  }

  async getAnalysis(analysisId) {
    const data = await this._request(`/offline/${analysisId}`);
    return data.analysis;
  }

  // 9. AI
  async getAIStatus() {
    return this._request('/ai/status');
  }

  async getAIModels() {
    const data = await this._request('/ai/models');
    return data.models || [];
  }
}

export const apiClient = new ApiClient();
