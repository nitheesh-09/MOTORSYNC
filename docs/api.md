# MOTORSYNC REST API Specification (`/api/v1`)

All endpoints return structured JSON adhering to the Master Specification Section 6 standard:

**Success**:
```json
{
  "success": true,
  "data": {},
  "metadata": {
    "timestamp": "2026-09-30T10:00:00.000Z"
  }
}
```

**Error**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": []
  }
}
```

---

## 1. System & Health

### `GET /api/v1/health`
Returns backend service liveness and process uptime.

### `GET /api/v1/system/status`
Returns high-level system indicators:
- `backend`: status, version, node version
- `database`: engine, status, persistence state
- `dataIngestion`: active source (`SYNTHETIC` | `EXTERNAL_LAPTOP`), status
- `externalLaptop`: connection status, protocol, last message
- `aiModel`: active model ID, version, status
- `fleetSummary`: total motors, healthy, warning, fault, offline counts

---

## 2. Motor Fleet Management

### `GET /api/v1/motors`
Returns list of registered motors with their latest telemetry snapshots and baseline statuses.

### `POST /api/v1/motors`
Register a new motor.
**Body**:
```json
{
  "motorId": "MTR-006",
  "name": "Condensate Extraction Pump",
  "location": "Turbine Hall — Level 0",
  "motorType": "3-Phase Induction",
  "ratedVoltage": 400.0,
  "ratedCurrent": 18.2,
  "ratedRPM": 1475.0
}
```

### `GET /api/v1/motors/:motorId`
Returns detailed metadata, latest telemetry, and commissioning baseline for a specific motor.

### `PUT /api/v1/motors/:motorId`
Update specifications of an existing motor.

### `DELETE /api/v1/motors/:motorId`
Delete a motor and cascade delete its telemetry and analyses.

---

## 3. Telemetry Ingestion & Stream

### `POST /api/v1/telemetry`
**Normalized Ingestion Endpoint** used by the External Acquisition Laptop (or Synthetic Provider).
**Body**: Normalized JSON telemetry payload (see `docs/data-schema.md`).

### `POST /api/v1/telemetry/raw`
**Dedicated ESP32 Raw Transducer Ingestion Endpoint**.
Receives unadulterated time-series readings directly from physical sensors wired to the ESP32.
**Body**:
```json
{
  "motorId": "MTR-001",
  "timestamp": 1727700000000,
  "voltage": 11.92,
  "current": 1.42,
  "temperature": 37.8,
  "vibration_x": 0.31,
  "vibration_y": 0.18,
  "vibration_z": 0.92
}
```
**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "accepted": true,
    "motorId": "MTR-001",
    "timestamp": 1727700000000,
    "sourceType": "ESP32",
    "rawSampleId": 142,
    "bufferCount": 1
  }
}
```

### `POST /api/v1/telemetry/raw/batch`
**High-Frequency Raw Vibration Batch Ingestion Endpoint**.
Transmits an array of raw samples with declared sampling frequency without incurring single-sample HTTP overhead.
**Body**:
```json
{
  "motorId": "MTR-001",
  "samplingRate": 2560,
  "samples": [
    {
      "timestamp": 1727700000000,
      "voltage": 11.92,
      "current": 1.42,
      "temperature": 37.8,
      "vibration_x": 0.31,
      "vibration_y": 0.18,
      "vibration_z": 0.92
    }
  ]
}
```
**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "accepted": true,
    "motorId": "MTR-001",
    "samplesReceived": 64,
    "sourceType": "ESP32",
    "bufferCount": 64,
    "processedTelemetry": { ... }
  }
}
```

### `GET /api/v1/telemetry/esp32/status`
Returns live connection status (`CONNECTED` vs `STALE / DISCONNECTED`), buffer sample count, and configured vs reported sampling rates.
**Query Parameters**: `motorId` (default: `MTR-001`)

### `GET /api/v1/motors/:motorId/latest`
Fetch latest processed telemetry record for a motor.

### `GET /api/v1/motors/:motorId/raw/latest`
Fetch latest raw sensor reading for a motor from `raw_telemetry`.

### `GET /api/v1/motors/:motorId/raw/history`
Query raw sensor history with query parameters: `limit`, `offset`, `startDate`, `endDate`.

### `GET /api/v1/motors/:motorId/telemetry`
Query processed telemetry history with query parameters:
- `limit` (default: 100, max: 1000)
- `offset` (default: 0)
- `sourceType` (`SYNTHETIC` | `ESP32` | `EXTERNAL_LAPTOP` | `OFFLINE_FILE`)
- `startDate` (ISO string)
- `endDate` (ISO string)

---

## 4. Diagnostics & Baselines

### `GET /api/v1/motors/:motorId/diagnostics`
Returns the current diagnostic assessment, AI model metadata, explainability evidence trace, and 6-section component assessment.

### `POST /api/v1/diagnostics/analyze`
On-demand diagnostic evaluation for custom or test payloads.

### `GET /api/v1/motors/:motorId/baseline`
Returns healthy commissioning baseline parameters. If not established, reports `status: "NOT_AVAILABLE"`.

### `POST /api/v1/motors/:motorId/baseline`
Update baseline parameters for a motor.

---

## 5. Alerts

### `GET /api/v1/alerts`
Query fleet alerts with filters: `motorId`, `category`, `severity`, `limit`.

### `POST /api/v1/alerts/:alertId/ack`
Acknowledge an alert.

---

## 6. Offline Dataset Upload

### `POST /api/v1/offline/upload`
Upload CSV, JSON, or XML file via multipart form data (`file` field) or raw JSON string (`content` field).
Computes FFT, 1X speed, time-domain features, and persists to `analyses` table.

### `GET /api/v1/offline/:analysisId`
Retrieve complete analysis report including spectrogram bins and reference labels.
