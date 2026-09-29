/**
 * Firebase Real-time Integration Module for Smart Door Security System
 * Handles database listeners, real-time control state sync, and mock simulator backup.
 */

// Firebase Configuration Object - Replace with your Firebase Project Config
const firebaseConfig = {
  apiKey: "AIzaSyDEMO_KEY_SMART_DOOR_SECURITY_2026",
  authDomain: "smart-door-security-system.firebaseapp.com",
  databaseURL: "https://smart-door-security-system-default-rtdb.firebaseio.com",
  projectId: "smart-door-security-system",
  storageBucket: "smart-door-security-system.appspot.com",
  messagingSenderId: "987654321012",
  appId: "1:987654321012:web:a1b2c3d4e5f6g7h8i9j0"
};

class FirebaseService {
  constructor() {
    this.isInitialized = false;
    this.mockMode = true; // Defaults to high-fidelity browser simulator
    this.listeners = {};
    
    this.state = {
      deviceStatus: {
        online: true,
        ipAddress: "192.168.1.105",
        rssi: -58,
        uptime: "14h 22m",
        wifiSsid: "SmartHome_5G",
        firmware: "v2.4.1-CAM"
      },
      controls: {
        servoAngle: 90,
        buzzerActive: false,
        flashLed: false,
        cameraResolution: "HD (1080p)",
        pirSensitivity: "Medium"
      },
      motionStatus: {
        detected: false,
        lastTriggerTime: new Date().toLocaleTimeString(),
        triggerCount: 42
      }
    };
  }

  init() {
    console.log("🔥 Initializing Firebase Real-time Security System Client...");
    try {
      // Check if Firebase Web SDK script is available globally
      if (window.firebase && window.firebase.apps) {
        if (!window.firebase.apps.length) {
          window.firebase.initializeApp(firebaseConfig);
        }
        this.db = window.firebase.database();
        this.isInitialized = true;
        this.mockMode = false;
        console.log("✅ Firebase SDK connected successfully to Database URL:", firebaseConfig.databaseURL);
        this.bindRealtimeListeners();
      } else {
        console.warn("⚠️ Firebase SDK not detected. Operating in high-performance browser simulation mode.");
        this.startMockStateLoop();
      }
    } catch (err) {
      console.warn("⚠️ Could not load real Firebase credentials. Utilizing Browser Simulator mode.", err);
      this.startMockStateLoop();
    }
  }

  bindRealtimeListeners() {
    if (this.mockMode || !this.db) return;

    // Device Status listener
    this.db.ref('device_status').on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        this.state.deviceStatus = data;
        this.notify('device_status', data);
      }
    });

    // Control States listener
    this.db.ref('controls').on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        this.state.controls = data;
        this.notify('controls', data);
      }
    });

    // Motion Sensor listener
    this.db.ref('motion_status').on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        this.state.motionStatus = data;
        this.notify('motion_status', data);
      }
    });
  }

  // Update control state in Firebase Realtime DB or Simulator
  updateControl(key, value) {
    this.state.controls[key] = value;
    console.log(`📡 [Firebase Push] Updated ${key} = ${value}`);

    if (!this.mockMode && this.db) {
      this.db.ref(`controls/${key}`).set(value);
    }
    this.notify('controls', this.state.controls);
  }

  // Register callback for data changes
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  notify(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  startMockStateLoop() {
    // Periodically fluctuate Wi-Fi RSSI signal for realistic display
    setInterval(() => {
      const baseRssi = -55;
      const variation = Math.floor(Math.random() * 8) - 4;
      this.state.deviceStatus.rssi = baseRssi + variation;
      this.notify('device_status', this.state.deviceStatus);
    }, 4000);
  }
}

// Export singleton instance
window.firebaseService = new FirebaseService();
