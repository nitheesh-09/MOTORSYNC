# External Data Acquisition Laptop Integration Guide

## 1. Overview

In physical industrial deployments, the **External Data Acquisition Laptop** is the system physically interfacing with motor transducers. It samples raw analog signals, applies anti-aliasing filters, executes Fast Fourier Transforms (FFT), extracts statistical features, and packages the data into the **Motor Data Payload** before transmitting it to MOTORSYNC.

```
[ IEPE Accelerometer ] \
[ CT Current Clamp   ]  --> [ Multi-Channel DAQ Board ] --> [ Acquisition Script (Python/C++) ]
[ PT Voltage Divider ] /                                                 |
[ PT100 RTD Temp     ] /                                                 v
                                                         POST /api/v1/telemetry
                                                                         |
                                                                         v
                                                             [ MOTORSYNC Workstation ]
```

---

## 2. Ingestion Endpoint & Authentication

- **HTTP Method**: `POST`
- **URL**: `http://<MOTORSYNC_HOST>:3001/api/v1/telemetry`
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <INGESTION_TOKEN> (when enabled)
  ```

---

## 3. Sample Acquisition Script (Python)

Below is a reference Python transmission loop for the acquisition laptop:

```python
import time
import requests
import numpy as np

MOTORSYNC_URL = "http://192.168.1.100:3001/api/v1/telemetry"

def read_daq_channels():
    # Placeholder: Replace with National Instruments (nidaqmx), MCC, or LabVIEW driver call
    vibration_samples = np.random.normal(0, 0.8, 2560)
    current_samples = np.random.normal(0, 12.0, 1000)
    voltage_samples = np.random.normal(0, 400.0, 1000)
    temperature_deg_c = 44.5

    # Compute features on DAQ laptop
    vib_rms = float(np.sqrt(np.mean(vibration_samples**2)))
    vib_peak = float(np.max(np.abs(vibration_samples)))
    crest_factor = float(vib_peak / vib_rms) if vib_rms > 0 else 1.414
    kurtosis = float(np.mean(((vibration_samples - np.mean(vibration_samples)) / np.std(vibration_samples))**4))

    current_rms = float(np.sqrt(np.mean(current_samples**2)))
    voltage_rms = float(np.sqrt(np.mean(voltage_samples**2)))
    power_kw = float((np.sqrt(3) * voltage_rms * current_rms * 0.85) / 1000.0)

    # FFT on vibration
    fft_vals = np.abs(np.fft.rfft(vibration_samples))
    freqs = np.fft.rfftfreq(len(vibration_samples), 1.0 / 2560.0)
    dom_idx = np.argmax(fft_vals[1:]) + 1
    dominant_freq = float(freqs[dom_idx])

    return {
        "motorId": "MTR-001",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "sourceType": "EXTERNAL_LAPTOP",
        "electrical": {
            "voltageRms": round(voltage_rms, 1),
            "currentRms": round(current_rms, 2),
            "power": round(power_kw, 2),
            "currentSpectralFeatures": {"fundamentalFrequency": 50.0}
        },
        "thermal": {
            "temperature": round(temperature_deg_c, 1)
        },
        "vibration": {
            "rms": round(vib_rms, 2),
            "peak": round(vib_peak, 2),
            "crestFactor": round(crest_factor, 2),
            "kurtosis": round(kurtosis, 2),
            "dominantFrequency": round(dominant_freq, 1)
        },
        "rpm": round(dominant_freq * 60) if (20 <= dominant_freq <= 60) else None,
        "metadata": {
            "daqDevice": "NI-USB-6211",
            "samplingRate": 2560
        }
    }

def stream_telemetry():
    print(f"Connecting to MOTORSYNC at {MOTORSYNC_URL}...")
    while True:
        payload = read_daq_channels()
        try:
            res = requests.post(MOTORSYNC_URL, json=payload, timeout=2.0)
            if res.status_code == 201:
                print(f"[{payload['timestamp']}] Telemetry ingested: {payload['motorId']} (HTTP 201)")
            else:
                print(f"Failed to ingest: {res.text}")
        except Exception as e:
            print(f"Connection error: {e}")

        time.sleep(1.0) # 1 Hz telemetry rate

if __name__ == "__main__":
    stream_telemetry()
```

---

## 4. ESP32 Real Hardware Ingestion Integration

The ESP32 microcontroller interfaces directly with raw hardware sensors and streams time-series data to MOTORSYNC over local Wi-Fi.

```
[ ADXL335 / MPU6050 3-Axis Accel ] \
[ CT Sensor (Current)             ]  --> [ ESP32 Microcontroller ]
[ Voltage Divider (Voltage)       ] /            |
[ DS18B20 / NTC (Temperature)     ] /            v Wi-Fi (HTTP POST)
                                   http://<PC_LOCAL_IP>:3001/api/v1/telemetry/raw
                                   http://<PC_LOCAL_IP>:3001/api/v1/telemetry/raw/batch
                                                 |
                                                 v
                                        [ MOTORSYNC Workstation ]
```

### Network Configuration & Finding PC Local IP

The MOTORSYNC backend binds to `HOST=0.0.0.0` and `PORT=3001`, listening across all network interfaces so local devices on the same Wi-Fi network can connect directly.

To find your PC's local IP address on Windows:
1. Open PowerShell or Command Prompt.
2. Run `ipconfig`.
3. Locate **IPv4 Address** under your active Wi-Fi or Ethernet adapter (e.g., `192.168.1.15` or `10.0.0.42`).
4. In your ESP32 firmware, set the target URL to:
   ```cpp
   http://192.168.1.15:3001/api/v1/telemetry/raw
   ```

*(Do NOT use `localhost` or `127.0.0.1` in the ESP32 code, as that refers to the ESP32 itself).*

### Dedicated Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/telemetry/raw` | `POST` | Single raw transducer reading |
| `/api/v1/telemetry/raw/batch` | `POST` | High-frequency burst of vibration samples with sampling rate |
| `/api/v1/telemetry/esp32/status` | `GET` | Heartbeat, connection state (`CONNECTED` / `STALE`), buffer count |

### Single Sample Payload Format

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

### High-Frequency Batch Payload Format

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
    },
    {
      "timestamp": 1727700000001,
      "voltage": 11.91,
      "current": 1.43,
      "temperature": 37.8,
      "vibration_x": 0.28,
      "vibration_y": 0.20,
      "vibration_z": 0.89
    }
  ]
}
```

### Reference ESP32 Arduino C++ Code

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Replace with your PC's IPv4 address from `ipconfig`
const char* serverUrl = "http://192.168.1.15:3001/api/v1/telemetry/raw";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected.");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Read hardware sensors (replace with actual analogRead/I2C sensor calls)
    float voltage = 11.92;
    float current = 1.42;
    float temperature = 37.8;
    float vib_x = 0.31;
    float vib_y = 0.18;
    float vib_z = 0.92;

    String jsonPayload = "{\"motorId\":\"MTR-001\","
                         "\"timestamp\":" + String(millis()) + ","
                         "\"voltage\":" + String(voltage, 2) + ","
                         "\"current\":" + String(current, 2) + ","
                         "\"temperature\":" + String(temperature, 1) + ","
                         "\"vibration_x\":" + String(vib_x, 3) + ","
                         "\"vibration_y\":" + String(vib_y, 3) + ","
                         "\"vibration_z\":" + String(vib_z, 3) + "}";

    int httpCode = http.POST(jsonPayload);
    if (httpCode > 0) {
      String response = http.getString();
      Serial.printf("HTTP %d: %s\n", httpCode, response.c_str());
    } else {
      Serial.printf("POST error: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  }
  delay(1000); // Transmission cycle (or batch burst)
}
```

### Curl Test Commands

**Single Packet Test:**
```bash
curl -X POST http://localhost:3001/api/v1/telemetry/raw \
  -H "Content-Type: application/json" \
  -d '{
    "motorId": "MTR-001",
    "timestamp": 1727700000000,
    "voltage": 11.92,
    "current": 1.42,
    "temperature": 37.8,
    "vibration_x": 0.31,
    "vibration_y": 0.18,
    "vibration_z": 0.92
  }'
```

**Check ESP32 Status:**
```bash
curl http://localhost:3001/api/v1/telemetry/esp32/status?motorId=MTR-001
```

---

## 5. Alternative Communication Protocols

The backend architecture is **protocol-independent**. If industrial conditions require streaming rather than HTTP POST:

1. **WebSocket (`ws://...`)**: Open persistent duplex socket to `ws://<HOST>:3001/stream`.
2. **MQTT Broker**: Publish to topic `motorsync/telemetry/<motorId>` with QoS 1.
3. **Raw TCP / Modbus TCP**: Implement TCP stream listener in `backend/src/providers/externalLaptopProvider.js`.
