# MOTORSYNC System Architecture

## 1. High-Level Concept

MOTORSYNC is an industrial multi-motor health monitoring and fault diagnosis system designed for manufacturing plants, pumping stations, and critical power infrastructure.

The core architecture operates under the principle that **MOTORSYNC is a central receiving, monitoring, analytics, and diagnostic workstation**. It is not wired directly to raw sensor hardware.

### Physical to Workstation Data Flow

```
+-----------------------------------------------------------+
| 1. PHYSICAL INDUSTRIAL MOTOR                              |
|    - 3-Phase Squirrel-Cage Induction Motor                |
|    - Monitored asset fleet (MTR-001 through MTR-005)      |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
| 2. TRANSDUCERS (4 PHYSICAL INPUT CHANNELS)                |
|    - Vibration: Piezoelectric IEPE Accelerometer (DE/NDE) |
|    - Current: Hall-Effect Current Transformer (CT)        |
|    - Voltage: Step-down Potential Transformer (PT)        |
|    - Temperature: RTD / PT100 Surface Sensor              |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
| 3. EXTERNAL DATA ACQUISITION LAPTOP                       |
|    - High-Speed Multi-Channel ADC DAQ Board               |
|    - Signal Filtering & Anti-Aliasing                     |
|    - Fast Fourier Transform (FFT) & Feature Extraction    |
|    - JSON Telemetry Serialization                         |
+-----------------------------+-----------------------------+
                              |
                              v Network Transport (HTTP / WS / MQTT / TCP)
+-----------------------------+-----------------------------+
| 4. MOTORSYNC DATA INGESTION ENGINE                        |
|    - Protocol-independent Ingestion Adapter               |
|    - Schema & Data Type Validation                        |
|    - Motor Registry Association                           |
|    - Timestamp Validation & Quality Scoring               |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
| 5. PERSISTENT STORAGE (SQLite WAL Mode)                   |
|    - motors, telemetry, baselines, alerts, diagnostics    |
|    - Indexed for high-frequency time-series queries       |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
| 6. ANALYTICS & BASELINE COMPARISON                        |
|    - Electrical: Power (kW), Overload %, Harmonic THD     |
|    - Thermal: Rise from baseline (Delta T), Rise Rate     |
|    - Vibration: RMS, Crest Factor, Kurtosis, ISO 10816    |
|    - Speed: 1X Rotational Peak Detection -> RPM = f_1X*60 |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
| 7. AI DIAGNOSTIC ENGINE & DIAGNOSTIC FUSION               |
|    - ModelRegistry with decoupled ModelAdapter            |
|    - FeatureBuilder with explicit availability tracking   |
|    - ExperimentalRuleFeatureModel (v0.1-dev)              |
|    - 6 Subsystem Candidate Sections                       |
|    - Explainable Evidence Breakdown                       |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
| 8. WORKSTATION PRESENTATION LAYER                         |
|    - Overview: Multi-Motor Fleet Grid & Status Badges     |
|    - Diagnostics: Waveform Canvas, FFT Canvas, Fusion     |
|    - Sensors: Physical vs Extracted vs Derived            |
|    - Offline Analysis: CSV/JSON/XML Ingestion & Spectrogram|
|    - History: Time-window queries & Provenance Snapshots  |
|    - System: Ingestion Topology, JSON Schema & Status     |
+-----------------------------------------------------------+
```

## 2. Layered Backend Design

```
backend/
├── src/
│   ├── config/          # Central configuration & env defaults
│   ├── storage/         # SQLite database initialization & WAL pragmas
│   ├── repositories/    # Data access abstraction layer (DB decoupled from API)
│   ├── validation/      # Ingestion payload validation & sanitization
│   ├── processing/      # DSP, FFT, 1X detection, time-domain descriptors
│   ├── analytics/       # Electrical, thermal, and vibration engineering models
│   ├── baselines/       # Commissioning healthy baselines & delta tracking
│   ├── diagnostics/     # Multi-signal health assessment & diagnostic coordinator
│   ├── ai/              # AI diagnostic model interface, feature builder, registry
│   ├── alerts/          # Alert generation, deduplication & tracking
│   ├── providers/       # Synthetic placeholder & external laptop adapters
│   ├── offline/         # CSV, JSON, XML file parser & historical analyzer
│   ├── api/
│   │   ├── controllers/ # HTTP request handlers
│   │   ├── middleware/  # Error handler & response formatter
│   │   └── routes/      # Versioned router (/api/v1)
│   ├── utils/           # Structured logging
│   └── server.js        # Server bootstrap & background telemetry ticker
```
