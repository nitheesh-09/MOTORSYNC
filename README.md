# MOTORSYNC — Industrial Motor Health Monitoring & Fault Diagnosis Platform

MOTORSYNC is an industrial-grade engineering monitoring and fault diagnosis platform designed for multi-motor facilities.

---

## 1. System Topology & Architecture

MOTORSYNC is designed around a **clean, decoupled data ingestion architecture**. MOTORSYNC is **not** directly wired to microcontroller pins or physical sensor probes. Instead, an **External Data Acquisition Laptop** collects transducer signals, performs preliminary DSP/feature extraction, and transmits normalized telemetry payloads to MOTORSYNC over the network.

```
                           +---------------------------+
                           |     PHYSICAL MOTOR        |
                           | 3-Phase Induction (Fleet) |
                           +-------------+-------------+
                                         |
                                         v
                           +---------------------------+
                           |   TRANSDUCERS (4 INPUTS)  |
                           | Vibration, I, V, Temp     |
                           +-------------+-------------+
                                         |
                                         v
                       +-----------------------------------+
                       |   EXTERNAL DATA ACQUISITION LAPTOP|
                       |  DAQ Hardware + Filtering + DSP   |
                       |  FFT + Feature Extraction Engine  |
                       +-----------------+-----------------+
                                         |
                                         v Formatted Telemetry JSON Payload
                       +-----------------+-----------------+
                       |   MOTORSYNC DATA INGESTION API    |
                       |   POST /api/v1/telemetry          |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------------------------+
                       |    STORAGE & ANALYTICS ENGINE     |
                       | SQLite (WAL) + Baseline Tracking  |
                       | Health Assessment + AI Diagnostics|
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------------------------+
                       |    MOTORSYNC WORKSTATION UI       |
                       | Fleet Overview, Diagnostics,      |
                       | Sensors, Offline Analysis, History|
                       +-----------------------------------+
```

---

## 2. Technology Stack

- **Backend Runtime**: Node.js (ESM)
- **API Framework**: Express.js
- **Database**: SQLite (via `better-sqlite3` in WAL mode for persistent, zero-configuration local development)
- **Frontend**: React 19 + Vite 8
- **Icons & Styling**: Lucide React + Enterprise Industrial CSS design tokens
- **DSP Engine**: Native Radix-2 / Bluestein FFT, 1X rotational frequency tracker, ISO 10816 classifier

---

## 3. Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation
```bash
npm install
```

### Environment Configuration
Copy the template configuration:
```bash
cp .env.example .env
```

### Running the Application

1. **Start the Backend REST API Server**:
   ```bash
   npm run server
   ```
   *The backend starts at `http://localhost:3001/api/v1` with an automated background development telemetry ticker and SQLite database initialization.*

2. **Start the Frontend Development Client**:
   ```bash
   npm run dev
   ```
   *The frontend starts at `http://localhost:5173/` and proxies all `/api` requests to the backend.*

3. **Production Build**:
   ```bash
   npm run build
   ```

4. **Run Automated Test Suite (67 tests across 9 suites)**:
   ```bash
   npm test
   ```

---

## 4. REST API Overview (`/api/v1`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service health status and uptime |
| `GET` | `/api/v1/system/status` | Subsystem status (DB, Ingestion, DAQ, AI, Fleet counts) |
| `GET` | `/api/v1/motors` | List registered fleet motors with latest telemetry snapshots |
| `POST` | `/api/v1/motors` | Register a new motor asset |
| `GET` | `/api/v1/motors/:motorId` | Get detailed motor metadata and baseline |
| `PUT` | `/api/v1/motors/:motorId` | Update motor specifications |
| `DELETE` | `/api/v1/motors/:motorId` | Remove motor from registry |
| `POST` | `/api/v1/telemetry` | **Core Ingestion Endpoint**: Ingests, validates, and stores telemetry |
| `GET` | `/api/v1/motors/:motorId/latest` | Get latest telemetry record for motor |
| `GET` | `/api/v1/motors/:motorId/telemetry` | Query telemetry time window with pagination |
| `GET` | `/api/v1/motors/:motorId/history` | Historical telemetry records |
| `GET` | `/api/v1/motors/:motorId/diagnostics` | Latest AI diagnostic assessment and evidence trace |
| `POST` | `/api/v1/diagnostics/analyze` | On-demand diagnostic analysis for custom payloads |
| `GET` | `/api/v1/motors/:motorId/baseline` | Get commissioning baseline and deviation parameters |
| `POST` | `/api/v1/motors/:motorId/baseline` | Update commissioning baseline |
| `GET` | `/api/v1/alerts` | Query active and historical system alerts |
| `GET` | `/api/v1/motors/:motorId/alerts` | Query alerts for specific motor |
| `POST` | `/api/v1/alerts/:alertId/ack` | Acknowledge alert |
| `GET` | `/api/v1/data-sources` | List registered data sources and heartbeat states |
| `GET` | `/api/v1/data-sources/status` | Active data provider status |
| `POST` | `/api/v1/data-sources/select` | Toggle active source (`SYNTHETIC` vs `EXTERNAL_LAPTOP`) |
| `POST` | `/api/v1/offline/upload` | Upload CSV, JSON, or XML motor dataset file |
| `GET` | `/api/v1/offline/:analysisId` | Retrieve saved offline dataset analysis |
| `GET` | `/api/v1/ai/status` | Current AI diagnostic model status |
| `GET` | `/api/v1/ai/models` | List registered AI models and metadata |

---

## 5. Normalized Telemetry Payload Schema

```json
{
  "motorId": "MTR-001",
  "timestamp": "2026-09-30T10:00:00.000Z",
  "sourceType": "EXTERNAL_LAPTOP",

  "electrical": {
    "voltageRms": 400.2,
    "currentRms": 12.4,
    "currentStdDev": 0.45,
    "currentPeak": 17.5,
    "currentPeakToPeak": 35.0,
    "power": 7.31,
    "currentSpectralFeatures": { "fundamentalFrequency": 50.0, "thd": 1.8 }
  },

  "thermal": {
    "temperature": 45.2,
    "temperatureRiseFromBaseline": 3.2,
    "temperatureRiseRate": 0.01,
    "temperatureVariation": 0.3
  },

  "vibration": {
    "magnitude": 1.15,
    "rms": 1.15,
    "peak": 2.30,
    "peakToPeak": 4.60,
    "variance": 1.32,
    "standardDeviation": 1.15,
    "kurtosis": 3.10,
    "skewness": 0.05,
    "crestFactor": 2.0,
    "dominantFrequency": 24.7,
    "spectralEnergy": 14.2,
    "spectralEntropy": 0.42,
    "frequencyBandEnergy": { "low": 10.0, "mid": 3.5, "high": 0.7 },
    "harmonics": [
      { "order": 1, "frequency": 24.7, "amplitude": 0.95 }
    ]
  },

  "rpm": 1482,

  "metadata": {
    "acquisitionDevice": "EXTERNAL_LAPTOP",
    "processingVersion": "1.0"
  }
}
```

---

## 6. AI Diagnostic Architecture

- **Base Class**: `DiagnosticModel` with strict interface: `predict(features, context)`.
- **Active Model**: `ExperimentalRuleFeatureModel` (v0.1-dev).
- **Status**: `NOT TRAINED / EXPERIMENTAL (Development Model)`. Validation metrics remain strictly `null` until a real model is trained and validated on experimental datasets.
- **Candidate Subsystems**: `BEARING`, `ROTOR`, `STATOR`, `SHAFT`, `COOLING`, `ELECTRICAL_SUPPLY`, `UNKNOWN`.
- **Prudent Scientific Terminology**: Enforces non-absolute terms: *"Suspected"*, *"Indication"*, *"Possible"*, *"Model Assessment"*. Never claims certainty.

---

## 7. Automated Testing Suite

MOTORSYNC includes **67 automated unit and integration tests** across 9 test modules:

```bash
npm test
```

1. `tests/signalProcessing.test.js` (8 tests) — DSP, harmonic analysis, noise tolerance
2. `tests/phase3DatasetIntegration.test.js` (8 tests) — File parsing, sampling rate derivation
3. `tests/dataIngestionArchitecture.test.js` (6 tests) — Schema conformity, provenance tracking
4. `tests/aiAndDiagnostics.test.js` (9 tests) — Baseline deviations, AI inference, alert generation
5. `backend/tests/dbRepositories.test.js` (6 tests) — SQLite CRUD & index operations
6. `backend/tests/ingestionAndValidation.test.js` (8 tests) — Validation, sanitization, analytics
7. `backend/tests/offlineAnalysis.test.js` (4 tests) — CSV/JSON/XML parsing & FFT
8. `backend/tests/apiEndpoints.test.js` (12 tests) — REST endpoints verification
9. `backend/tests/endToEndIntegration.test.js` (6 tests) — End-to-end ingestion to frontend response

---

## 8. Documentation Index

- [System Architecture](docs/architecture.md)
- [REST API Specification](docs/api.md)
- [Motor Data Schema & Provenance](docs/data-schema.md)
- [AI & Diagnostic Architecture](docs/ai.md)
- [External Laptop Integration Guide](docs/external-integration.md)
