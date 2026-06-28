# 06 — Hardware Design (ESP32 + SIM800L + TPM Sensor)

## Overview

The IoT device is **portable and carried by the driver** to each karinderya. It connects to the oil container, reads TPM, and transmits the data via cellular network.

## Bill of Materials (Per Device)

| Component | PH Price (PHP) | Purpose |
|-----------|---------------|---------|
| ESP32 Dev Board (30-pin) | ~₱300 | Microcontroller, I2C, UART |
| SIM800L GSM Module | ~₱250 | 2G cellular data (HTTP POST) |
| TPM Sensor (SEN0515 or generic) | ~₱1,800 | Measure Total Polar Materials |
| Power Bank 10,000mAh | ~₱700 | Portable power for full day |
| Globe/Smart Prepaid SIM | ~₱50 | Cellular connectivity |
| Project Enclosure (waterproof) | ~₱200 | Protect electronics |
| Dupont wires + breadboard | ~₱100 | Prototyping connections |
| **Total** | **~₱3,400** | |

## Wiring Diagram

```
┌──────────────────────────────────────┐
│            ESP32 Dev Board           │
│                                      │
│  GPIO22 (SCL) ────── SEN0515 SCL    │
│  GPIO21 (SDA) ────── SEN0515 SDA    │
│  3.3V         ────── SEN0515 VCC    │
│  GND          ────── SEN0515 GND    │
│                                      │
│  GPIO16 (TX2) ────── SIM800L RX     │
│  GPIO17 (RX2) ────── SIM800L TX     │
│  5V (VIN)    ────── SIM800L VCC     │
│  GND          ────── SIM800L GND    │
│                                      │
│  GPIO4  ────── Button (trigger read) │
│  GPIO2  ────── LED (status)         │
│                                      │
│  EN + BOOT ────── Flash buttons     │
└──────────────────────────────────────┘
           │
      Power Bank (5V via USB)
```

**Important notes:**
- SIM800L peaks at 2A during transmission — use a **capacitor (1000µF)** between VCC and GND
- Use a **level shifter** or voltage divider if SIM800L logic level is 5V (ESP32 is 3.3V)
- TPM sensor (SEN0515) uses I2C — works at 3.3V directly with ESP32

## Firmware Behavior

```cpp
// High-level pseudocode for ESP32 firmware

void setup() {
    Serial2.begin(9600);        // SIM800L UART
    Wire.begin();                // TPM sensor I2C
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    pinMode(LED_PIN, OUTPUT);
    
    connectToCellular();
    authenticateDevice();       // POST /api/iot/auth
}

void loop() {
    if (digitalRead(BUTTON_PIN) == LOW) {
        // Driver pressed button → take reading
        digitalWrite(LED_PIN, HIGH);    // Blue LED = measuring
        
        float tpm = readTPMSensor();   // Average of 3 samples
        String payload = buildJSON(tpm, consumerRef, lat, lng);
        
        bool success = sendReadingWithRetry(payload);  // POST /api/v1/iot/reading (3 retries)
        
        if (success) {
            blinkGreen(3);    // Success indicator
        } else {
            blinkRed(10);     // All retries failed — data lost
        }
        
        digitalWrite(LED_PIN, LOW);
        deepSleep(300);        // 5 min timeout until next use
    }
}
```

### TPM Sensor Reading (I2C with SEN0515)

```cpp
float readTPMSensor() {
    const int SAMPLES = 3;
    float readings[SAMPLES];
    
    for (int i = 0; i < SAMPLES; i++) {
        // Request 2 bytes from sensor
        Wire.requestFrom(SENSOR_ADDRESS, 2);
        if (Wire.available() >= 2) {
            uint16_t raw = Wire.read() << 8 | Wire.read();
            readings[i] = raw / 100.0;  // Convert to percentage
        }
        delay(100);
    }
    
    // Return median (reject outliers)
    sort(readings, SAMPLES);
    return readings[SAMPLES / 2];
}
```

### Retry Logic (Network Resilience)

The ESP32 uses a simple retry loop with exponential backoff. No local storage — if all retries fail, the reading is lost. This keeps firmware simple for MVP.

```cpp
const int MAX_RETRIES = 3;
const int BASE_DELAY_MS = 2000;

bool sendReadingWithRetry(String jsonPayload) {
    for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        bool success = sendReading(jsonPayload);
        if (success) return true;
        
        if (attempt < MAX_RETRIES) {
            int delay_ms = BASE_DELAY_MS * pow(2, attempt - 1);  // 2s, 4s, 8s
            digitalWrite(LED_PIN, LOW);  // Blink slow = retrying
            delay(delay_ms);
        }
    }
    return false;  // All retries exhausted
}
```

**Future improvement:** Store failed readings in SPIFFS (ESP32 flash) and retry on next wake cycle. Deferred until after MVP.

### Cellular Data Transmission (SIM800L)

```cpp
bool sendReading(String jsonPayload) {
    // 1. Check network registration
    Serial2.println("AT+CREG?");
    waitForResponse("+CREG: 0,1", 5000);
    
    // 2. Attach GPRS
    Serial2.println("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"");
    Serial2.println("AT+SAPBR=3,1,\"APN\",\"http.globe.com.ph\"");  // Globe APN
    Serial2.println("AT+SAPBR=1,1");
    waitForResponse("OK", 10000);
    
    // 3. Initialize HTTP
    Serial2.println("AT+HTTPINIT");
    waitForResponse("OK", 3000);
    
    // 4. Set URL
    Serial2.println("AT+HTTPPARA=\"URL\",\"https://oiltrace-api.onrender.com/api/v1/iot/reading\"");
    waitForResponse("OK", 3000);
    
    // 5. Set content type
    Serial2.println("AT+HTTPPARA=\"CONTENT\",\"application/json\"");
    
    // 6. POST data
    Serial2.println("AT+HTTPDATA=" + String(jsonPayload.length()) + ",10000");
    waitForResponse("DOWNLOAD", 3000);
    Serial2.println(jsonPayload);
    waitForResponse("OK", 10000);
    
    Serial2.println("AT+HTTPACTION=1");  // 1 = POST
    waitForResponse("+HTTPACTION:", 30000);
    
    // 7. Read response
    Serial2.println("AT+HTTPREAD");
    String response = waitForResponse("+HTTPREAD:", 5000);
    
    // 8. Terminate HTTP
    Serial2.println("AT+HTTPTERM");
    
    return response.indexOf("\"status\":\"success\"") >= 0;
}
```

### JSON Payload Format

```json
{
    "session_token": "tmp_eyJhbGciOiJIUzI1NiIs...",
    "tpm_value": 24.5,
    "consumer_ref": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "latitude": 14.5832,
    "longitude": 121.0409,
    "collected_at": "2026-06-24T10:30:00Z"
}
```

## Device Authentication

Each IoT device has a unique `device_id` and `device_secret` provisioned in the `iot_devices` table.

**Provisioning flow:**
1. Owner adds a new device via dashboard
2. System generates `device_id` (e.g., "OIL-ESP32-001") and random `device_secret`
3. Secret is bcrypt-hashed and stored in DB
4. Owner flashes the firmware with the plaintext ID + secret
5. On boot, device calls `POST /api/v1/iot/auth` to get a session token

## Power Consumption

| State | Current | Duration per Use |
|-------|---------|-----------------|
| Deep sleep | ~10µA | 99% of time |
| Active (measuring) | ~80mA | ~2 seconds |
| Cellular transmitting | ~500mA (peak 2A) | ~15 seconds |
| **Total per collection** | | **~17 seconds active** |

With a 10,000mAh power bank:
- ~500 collections before needing recharge
- ~3 months of daily use

## SIM Card Setup (Philippines)

| Network | APN | Promo | Cost |
|---------|-----|-------|------|
| **Globe** | `http.globe.com.ph` | GoEXTRA99 (7GB, 7 days) | ₱99 |
| **Smart** | `internet` | PowerAll 99 (8GB, 7 days) | ₱99 |
| **DITO** | `internet.dito` | Data 99 (10GB, 7 days) | ₱99 |

**Recommendation:** Globe prepaid SIM (widest 2G coverage in PH provinces where karinderyas are).
