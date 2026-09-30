# MOTORSYNC AI Diagnostic Architecture & Model Integration

## 1. Core Principles

1. **Modular Decoupling**: The UI and telemetry ingestion layers do not depend directly on any specific machine learning framework (TensorFlow, PyTorch, Scikit-Learn, ONNX).
2. **Scientific Safety**: MOTORSYNC never fabricates model accuracy, validation metrics, or diagnostic certainty. Unvalidated thresholds are clearly labeled `EXPERIMENTAL`.
3. **Prudent Terminology**: The platform uses calibrated language:
   - *"Suspected Bearing Raceway Degradation"* instead of *"Bearing failure confirmed"*.
   - *"Model Assessment"* instead of *"AI knows the fault"*.
   - Confidence percentages are displayed only when technically calibrated; otherwise, `Confidence: Not available` is reported.
4. **Transparent Explainability**: Every diagnosis provides a 3-pillar reasoning trace:
   - **Observed Evidence** (e.g. ISO 10816 Zone D trip exceeded, crest factor > 3.2).
   - **Baseline Deviations** (e.g. temperature rise $+14.4^\circ\text{C}$ from healthy baseline).
   - **Model Assessment** (candidate section and heuristic classification).

---

## 2. Architecture & Class Structure

```
backend/src/ai/
├── diagnosticModel.js            # Base DiagnosticModel abstract class
├── experimentalDiagnosticModel.js# Development rule-feature fusion model
├── featureBuilder.js             # Vector builder with explicit availability
├── inferenceService.js           # Inference coordinator & diagnostic fusion
└── modelRegistry.js              # Model registration, metadata, and selection
```

### Candidate Subsystems (6 Sections)
- `BEARING`: Ball/roller raceway impact signatures (elevated crest factor, high kurtosis, high-frequency harmonics).
- `ROTOR`: Dynamic mass unbalance (dominant 1X rotational vibration peak).
- `STATOR`: Inter-turn winding degradation & phase current unbalance.
- `SHAFT`: Mechanical misalignment & bent shaft (2X harmonic components).
- `COOLING`: Restricted ventilation & thermal overload (surface temp > 80°C).
- `ELECTRICAL_SUPPLY`: Voltage sags, phase unbalance, high current THD.
- `UNKNOWN`: Insufficient evidence or nominal conditions.

---

## 3. Integrating a Real Trained Machine Learning Model

When a model is trained on physical motor run-to-failure or benchmark datasets (e.g., CWRU Bearing Data, Paderborn University bearing datasets):

1. **Subclass `DiagnosticModel`**:
   ```javascript
   import { DiagnosticModel } from './diagnosticModel.js';

   export class ProductionRandomForestModel extends DiagnosticModel {
     constructor() {
       super({
         modelId: 'rf-v1.0-cwru',
         modelName: 'Random Forest 6-Class Motor Fault Classifier',
         version: 'v1.0.0',
         modelType: 'RANDOM_FOREST',
         status: 'PRODUCTION_VALIDATED',
         featureSchema: ['vibrationRms', 'crestFactor', 'kurtosis', 'currentRms'],
         validationMetrics: {
           accuracy: 0.942,
           precision: 0.938,
           recall: 0.940,
           f1: 0.939,
           validationDataset: 'CWRU 12k DE Bearing Dataset'
         },
         trainedOn: '2026-10-15'
       });
     }

     predict(featureVector, context) {
       // Run ONNX Runtime / TensorFlow.js / Python microservice inference
       return {
         condition: 'FAULT',
         affectedSection: 'BEARING',
         faultType: 'Suspected Bearing Outer Raceway Defect',
         severity: 'HIGH',
         confidence: 94,
         evidence: ['Model predicted outer raceway fault with 0.94 class probability']
       };
     }
   }
   ```

2. **Register the Model**:
   ```javascript
   import { modelRegistry } from './modelRegistry.js';
   import { ProductionRandomForestModel } from './productionRandomForestModel.js';

   const rfModel = new ProductionRandomForestModel();
   modelRegistry.registerModel('rf-v1.0-cwru', rfModel);
   modelRegistry.setActiveModel('rf-v1.0-cwru');
   ```

3. **Zero Frontend Rewrite**: The UI automatically queries `/api/v1/ai/status` and `/api/v1/motors/:motorId/diagnostics`, updating the model version pill and validation metrics automatically.
