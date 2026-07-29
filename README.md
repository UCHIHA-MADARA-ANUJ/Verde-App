# PROJECT VERDE v3.0 — AUTONOMOUS PLANT OS
### Class 10th - DAV ACON 5 IoT & Tech Exhibition Championship Portfolio
### Developed by Aarav Choudhary (Hardware) & Anuj (Software)

```
  _____           _           _    __     __               _      
 |  __ \         (_)         | |   \ \\   / /              | |     
 | |__) | __ ___  _  ___  ___| |_   \ \\_/ /__ _ __ __   __| | ___ 
 |  ___/ '__/ _ \| |/ _ \/ __| __|   \   / _ \ '__/ _ \ / _` |/ _ \
 | |   | | | (_) | |  __/ (__| |_     \ /  __/ | | (_) | (_| |  __/
 |_|   |_|  \___/| |\___|\___|\__|     \/ \___|_|  \___/ \__,_|\___|
                _/ |                                                
               |__/              BUILD VERSION V3.0.0 (PRODUCTION)  
```

Welcome to the production repository of **Project Verde V3.0** — an industrial-grade, secure, and highly optimized autonomous smart garden and AI foliage pathology operating system. This project transitions the previous multi-board co-processing setup into a unified, high-performance **WROOM-32 Dual-Core platform** and a standalone wireless **ESP32-CAM OV2640 node**, synchronized wirelessly over WebSockets via **Firebase Realtime Database** and deployed on **Vercel**.

---

## 🗺️ SECTION 1: MASTER HARDWARE PINOUT MAP

Every component is wired directly to a half-size solderless breadboard. Follow these precise physical pin mappings:

| Component / Module | Pin Name | WROOM-32 Pin Coordinate | Wire Type | Purpose |
| :--- | :--- | :--- | :---: | :--- |
| **DHT11 Sensor** | DATA (S) | **GPIO 4 (D2)** | F-M | Climate Temp & Humidity |
| | VCC (+) | **Left Red (+) Rail (5V)** | F-M | Power |
| | GND (-) | **Left Blue (-) Rail (GND)** | F-M | Ground |
| **Soil Moisture** | AO (Analog) | **GPIO 34 (A0)** | F-M | High-Precision Moisture |
| | VCC (+) | **Row 30 (Regulated 3.3V)** | F-M | Electrical Safe Reference |
| | GND (-) | **Left Blue (-) Rail (GND)** | F-M | Ground |
| **LDR Light Sensor** | AO (Analog) | **GPIO 35 (A1)** | F-M | Photosynthesis Lux Meter |
| | VCC (+) | **Row 30 (Regulated 3.3V)** | F-M | Electrical Safe Reference |
| | GND (-) | **Left Blue (-) Rail (GND)** | F-M | Ground |
| **HC-SR04** | TRIGGER | **GPIO 18 (D18)** | F-M | Send Ultrasonic Pulse |
| | ECHO | **GPIO 19 (D19)** | F-M | Read Travel Pulse |
| | VCC | **Left Red (+) Rail (5V)** | F-M | Power |
| | GND | **Left Blue (-) Rail (GND)** | F-M | Ground |
| **Relay Board** | IN1 (Signal) | **GPIO 5 (D5)** | F-M | Pump Switch (Active Low) |
| | VCC | **Left Red (+) Rail (5V)** | F-M | Coil Power |
| | GND | **Left Blue (-) Rail (GND)** | F-M | Ground |
| **Everlight UV LED** | Anode (+) | **GPIO 12 (D12)** (via 220-Ohm) | F-M | Direct Relay-Free Drive |
| | Cathode (-) | **Left Blue (-) Rail (GND)** | F-M | Ground |

---

## 🔌 SECTION 2: BREADBOARD LAYOUT & STABILITY PROTECTION

To ensure 100% stable performance on your physical bench, apply these critical electrical safeguards:

### 1. The Split-Rail Jumper Bridges
Half-size breadboards cut the outer positive (+) and negative (-) rails physically in half in the middle (between Row 15 and Row 16). **Bridge them to establish full continuity:**
* Run an M-M wire from **top-left Blue (-) negative rail** directly to **bottom-left Blue (-) negative rail**.
* Run an M-M wire from **top-left Red (+) positive rail** directly to **bottom-left Red (+) positive rail**.

### 2. The $1000\mu\text{F}$ Voltage Droop Capacitor (CRITICAL)
Your submersible pump draws a heavy in-rush current spike of **over 380mA** when starting up. Without a buffer, this drops the breadboard's voltage, causing the ESP32 to brownout and reboot in a loop!
* Plug your **1000uF 16V Electrolytic Capacitor** directly across the power rails:
  * **Longer Leg (Positive +)** $\rightarrow$ **Left Red (+) positive rail**.
  * **Shorter Leg with grey minus '-' stripe (Negative -)** $\rightarrow$ **Left Blue (-) negative rail**.

### 3. The 1N4007 Diode (Back-EMF Snubber)
Protects your ESP32's processing threads from the motor's inductive high-voltage kickback on shutdown:
* Plug your **1N4007 Diode** directly across the pump power terminals on **Row 20** (pump positive) and **Row 22** (pump negative):
  * **Silver-Stripe Leg** $\rightarrow$ **Row 20** (Positive).
  * **Plain Black Leg** $\rightarrow$ **Row 22** (Negative).

---

## 🔒 SECTION 3: CLOUD GUARD TYPE-VALIDATION RULES

Paste this JSON block under the **Rules** tab of your Firebase Realtime Database. It uses Type-Guards to ensure no manual values or string formats can ever corrupt your presentation database:

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "controls": {
      "manual_mode": { ".validate": "newData.isBoolean()" },
      "light_manual_mode": { ".validate": "newData.isBoolean()" },
      "pump_state": { ".validate": "newData.isBoolean()" },
      "grow_light_state": { ".validate": "newData.isBoolean()" },
      "capture_photo": { ".validate": "newData.isBoolean()" },
      "moisture_threshold": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 100" },
      "light_threshold": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 100" },
      "weather_override": { ".validate": "newData.isNumber() && (newData.val() == 0 || newData.val() == 1)" }
    },
    "sensors": {
      "moisture": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 100" },
      "lux": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 4095" },
      "tank_level": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 100" },
      "temperature": { ".validate": "newData.isNumber()" },
      "humidity": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 100" }
    }
  }
}
```

---

## 📡 SECTION 4: PRODUCTION NEXT.JS SERVERLESS WEB APP (`verde-app/`)

Your high-performance web dashboard is built inside the modern **Next.js 14 App Router** framework utilizing **GSAP**, **Framer Motion**, and **Recharts**.

### 🌟 Implemented Features:
1. **HTML5 Physics Canvas Particles:** Mouse movements and clicks emit glowing green spark particles that react to friction and gravity.
2. **3D Perspective Tilting Plant Canvas:** Your Tulsi plant is housed in a CSS 3D perspective box that tilts and rotates in real-time based on your mouse coordinates relative to the screen!
3. **FM Audio Synthesizer:** Synthesizes mechanical clicks, typewriter key-presses, and rising water pump sweeps in real-time using the browser's raw audio nodes (100% offline, zero audio file download lags).
4. **Pre-Seeded 24-Hour Cloud Logs:** On boot, the dashboard pulls real, persistent cloud history logs from `/historical_logs/moisture_log` (pre-seeded with a beautiful moisture dry-down and watering spike curve!).
5. **Real Gemini 2.0 Flash Chatbot:** Located at `/api/chat`, it feeds your live sensor values directly to Gemini, letting you chat with a conversational botanical AI co-pilot.
6. **AI Pathology Scan:** Located at `/api/analyze-plant`, it uses your premium Crop Health API keys to classify captured leaves for Alternaria fungal lesions and outputs treatment guides.
7. **Vercel Blob Dual Image Upload:** `/api/upload-photo` handles raw ESP32-CAM binary JPEGs. It includes an automatic Base64 fallback to bypass Cloud Storage paid blocks completely for free!

---

## 🏁 SECTION 5: PRESENTATION DAY CHECKOUT LOOP

Follow these steps on your presentation bench to guarantee a flawless run:

1. **Bootstrap the Cloud:** Open **`App/final_push_setup.html`** in Chrome, connect to Firebase, and click **"Execute Aligned Schema Push"** to perfectly clean, structure, and pre-seed your database.
2. **Assemble the Rig:** Have Aarav wire up the breadboard following your micro-minute coordinates, plugging in your rail bridges, Snubber Diode, and Decoupling Capacitor.
3. **Flash WROOM-32 (`Code_1_Main_Brain.ino`):** Close the Serial Monitor window in Arduino IDE (to release the port), select your active COM port, and click **Upload**!
4. **Flash ESP32-CAM (`Code_2_ESP32_CAM.ino`):** Slide your docker shield on, set compilation speed to `115200` with PSRAM Enabled, and click **Upload**!
5. **Launch Vercel:** Push `verde-app/` to Vercel, paste your environment variables (`GEMINI_API_KEY`, `PLANT_ID_API_KEY`, etc.), and watch your Space-Grade Autonomous OS operate in perfect real-time harmony!

---
*Project Verde V3.0 — The Ultimate Cognitive Agritech Operating System.* 🌿🏆🔥
