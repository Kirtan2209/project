/**
 * ==============================================================================
 * SMART DOOR SECURITY SYSTEM - MAIN CONTROLLER & STREAM ENGINE
 * ==============================================================================
 * Features:
 * - Multi-source Live Stream (Procedural Cyber Simulation, Webcam, Custom IP)
 * - Photographic Snapshot with Shutter Sound, Screen Flash, and Cloud Sync
 * - Web Audio API Sound Synthesizer (Doorbell chime, Alarm beeps, Shutter click)
 * - Digital PTZ Directional Dial (0° - 180° with spring physics)
 * - Touch-friendly Navigation Dock & Mobile Swipe Gesture detection
 * - Real-time Google Sheets Database Synchronizer & CSV Export
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log("🚀 Smart Door Security System - Streaming & Cloud Engine Started.");

  // ================= 1. APPLICATION STATE =================
  const state = {
    currentTab: 'home',
    theme: localStorage.getItem('security_theme') || 'dark',
    soundEnabled: localStorage.getItem('security_sound') !== 'false',
    motionSensorArmed: false, // Default: OFF (Turned ON via Motion Sensor button)
    streamSource: 'simulation', // 'simulation' | 'webcam' | 'custom' | 'esp32'
    nightVision: false,
    motionBox: true,
    isRecording: false,
    recordTimer: null,
    recordSeconds: 0,
    ptzAngle: 90,
    fps: 60.0,
    lastFrameTime: performance.now(),
    frameCount: 0,
    webcamStream: null,
    visitors: [],
    audioCtx: null
  };

  // Set initial theme
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon();
  updateAudioIcon();

  // ================= 2. WEB AUDIO SYNTHESIZER =================
  function initAudio() {
    if (!state.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        state.audioCtx = new AudioContext();
      }
    }
    if (state.audioCtx && state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
    return state.audioCtx;
  }

  // Realistic Shutter Sound (Mirror slap + shutter click)
  function playShutterSound() {
    if (!state.soundEnabled) return;
    try {
      const ctx = initAudio();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Click 1 (Shutter open)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(800, now);
      osc1.frequency.exponentialRampToValueAtTime(120, now + 0.06);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.06);

      // Click 2 (Shutter close)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1200, now + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(200, now + 0.16);
      gain2.gain.setValueAtTime(0.3, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.16);
    } catch (e) {
      console.warn("Audio synthesizer waiting for user interaction:", e);
    }
  }

  // Dual-tone "Ding-Dong" Doorbell Chime
  function playDoorbellChime() {
    if (!state.soundEnabled) return;
    try {
      const ctx = initAudio();
      if (!ctx) return;
      const now = ctx.currentTime;

      // "Ding" (C5 - 523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.45, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.9);

      // "Dong" (G4 - 392.00 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(392.00, now + 0.45);
      gain2.gain.setValueAtTime(0.5, now + 0.45);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.45);
      osc2.stop(now + 1.8);
    } catch (e) {
      console.warn("Doorbell chime audio error:", e);
    }
  }

  // Urgent 3-beep Motion Sensor Alarm
  function playMotionAlarm() {
    if (!state.soundEnabled) return;
    try {
      const ctx = initAudio();
      if (!ctx) return;
      const now = ctx.currentTime;

      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now + (i * 0.15));
        gain.gain.setValueAtTime(0.2, now + (i * 0.15));
        gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.15) + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + (i * 0.15));
        osc.stop(now + (i * 0.15) + 0.08);
      }
    } catch (e) {
      console.warn("Alarm audio error:", e);
    }
  }

  // Subtle Tactile Click
  function playClickSound() {
    if (!state.soundEnabled) return;
    try {
      const ctx = initAudio();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } catch (e) {}
  }

  // ================= 3. TOAST NOTIFICATION STACK =================
  function showToast(message, icon = 'fa-check', type = 'cyan') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <i class="fas ${icon} toast-icon text-${type}"></i>
      <div>
        <div style="font-weight: 600; font-size: 0.9rem;">${message}</div>
      </div>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  // ================= 4. PROCEDURAL CYBER STREAM SIMULATOR =================
  const streamCanvas = document.getElementById('live-stream-canvas');
  const heroStreamCanvas = document.getElementById('hero-stream-canvas');
  const videoElement = document.getElementById('live-video-element');
  const streamWrapper = document.getElementById('stream-wrapper');

  let simTime = 0;
  let targetX = 0.65;
  let targetY = 0.35;
  let targetVelocityX = 0.003;
  let targetVelocityY = 0.002;

  function renderSimulationFrame() {
    simTime += 0.03;

    // Bounce simulated motion target box
    targetX += targetVelocityX;
    targetY += targetVelocityY;
    if (targetX > 0.78 || targetX < 0.25) targetVelocityX *= -1;
    if (targetY > 0.65 || targetY < 0.22) targetVelocityY *= -1;

    // In simulation mode, do NOT show motion box (Motion detection only runs on real camera!)
    const motionBoxEl = document.getElementById('hud-motion-box');
    if (motionBoxEl && state.streamSource === 'simulation') {
      motionBoxEl.classList.add('hidden');
    }

    // Render on primary stream canvas if active
    if (state.streamSource === 'simulation' && streamCanvas) {
      drawCyberStream(streamCanvas, true);
    }

    // Render on mini hero preview canvas
    if (heroStreamCanvas) {
      drawCyberStream(heroStreamCanvas, false);
    }

    // Calculate real-time FPS
    state.frameCount++;
    const now = performance.now();
    if (now - state.lastFrameTime >= 1000) {
      state.fps = (state.frameCount * 1000) / (now - state.lastFrameTime);
      state.frameCount = 0;
      state.lastFrameTime = now;
      const fpsEl = document.getElementById('hud-fps-tag');
      if (fpsEl) fpsEl.textContent = state.fps.toFixed(1) + ' FPS';
    }

    requestAnimationFrame(renderSimulationFrame);
  }

  function drawCyberStream(canvas, fullDetail = true) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement.clientWidth || 640;
    const h = canvas.height = canvas.parentElement.clientHeight || 360;

    // 1. Dark Futuristic Gradient Backdrop
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#04070e');
    bgGrad.addColorStop(0.5, '#0a101f');
    bgGrad.addColorStop(1, '#060a14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Perspective Porch & Architectural Lines
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Doorway frame
    ctx.rect(w * 0.38, h * 0.2, w * 0.24, h * 0.65);
    // Path perspective
    ctx.moveTo(w * 0.38, h * 0.85);
    ctx.lineTo(w * 0.15, h);
    ctx.moveTo(w * 0.62, h * 0.85);
    ctx.lineTo(w * 0.85, h);
    ctx.stroke();

    // 3. Ambient Cyber Lighting
    const lightGlow = ctx.createRadialGradient(w * 0.5, h * 0.28, 5, w * 0.5, h * 0.28, 120);
    lightGlow.addColorStop(0, 'rgba(0, 242, 254, 0.25)');
    lightGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = lightGlow;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.28, 120, 0, Math.PI * 2);
    ctx.fill();

    // 4. Moving Humanoid Visitor Silhouette
    const visitorX = targetX * w;
    const visitorY = targetY * h + 20;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 242, 254, 0.22)';
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 1.5;
    // Head
    ctx.beginPath();
    ctx.arc(visitorX, visitorY - 35, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Torso & Shoulders
    ctx.beginPath();
    ctx.moveTo(visitorX - 20, visitorY + 25);
    ctx.lineTo(visitorX - 14, visitorY - 20);
    ctx.lineTo(visitorX + 14, visitorY - 20);
    ctx.lineTo(visitorX + 20, visitorY + 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 5. Digital Grid & Cyber Markers
    if (fullDetail) {
      ctx.strokeStyle = 'rgba(79, 172, 254, 0.08)';
      const step = 40;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Moving Scanline
      const scanY = (simTime * 90) % h;
      ctx.fillStyle = 'rgba(0, 242, 254, 0.15)';
      ctx.fillRect(0, scanY, w, 2);
    }
  }

  // Start stream rendering loop
  requestAnimationFrame(renderSimulationFrame);

  const mjpegImg = document.getElementById('live-mjpeg-stream');

  // ================= 5. REAL WEBCAM, ESP32-CAM & STREAM HANDLERS =================
  async function activateWebcam() {
    try {
      if (state.webcamStream) {
        state.webcamStream.getTracks().forEach(track => track.stop());
      }
      if (mjpegImg) {
        mjpegImg.style.display = 'none';
        mjpegImg.src = '';
      }
      state.webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      videoElement.srcObject = state.webcamStream;
      videoElement.style.display = 'block';
      streamCanvas.style.display = 'none';
      state.streamSource = 'webcam';
      showToast("Connected to Local Camera Stream!", "fa-video", "emerald");
    } catch (err) {
      console.warn("Webcam access error or denied:", err);
      showToast("Camera access unavailable. Fallback to Simulation.", "fa-triangle-exclamation", "amber");
      activateSimulation();
    }
  }

  function activateSimulation() {
    if (state.webcamStream) {
      state.webcamStream.getTracks().forEach(track => track.stop());
      state.webcamStream = null;
    }
    if (mjpegImg) {
      mjpegImg.style.display = 'none';
      mjpegImg.src = '';
    }
    videoElement.style.display = 'none';
    streamCanvas.style.display = 'block';
    state.streamSource = 'simulation';
  }

  function activateEsp32Stream(customUrl = null) {
    if (state.webcamStream) {
      state.webcamStream.getTracks().forEach(track => track.stop());
      state.webcamStream = null;
    }
    videoElement.style.display = 'none';
    streamCanvas.style.display = 'none';

    const url = customUrl || state.esp32StreamUrl || "http://192.168.1.50/";
    if (mjpegImg) {
      mjpegImg.crossOrigin = "anonymous";
      mjpegImg.src = url;
      mjpegImg.style.display = 'block';

      mjpegImg.onerror = () => {
        console.warn("MJPEG stream error or cross-origin block for:", url);
        showToast(`Could not load stream from ${url}. Ensure you are on the same Wi-Fi.`, "fa-triangle-exclamation", "amber");
      };
      mjpegImg.onload = () => {
        showToast(`Connected to Live ESP32-CAM Stream! (${url})`, "fa-video", "emerald");
      };
    }
    state.streamSource = 'esp32';
  }

  // Stream Source Selection Buttons
  document.querySelectorAll('.source-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playClickSound();
      document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const source = btn.getAttribute('data-source');
      const customBox = document.getElementById('custom-stream-box');

      if (source === 'esp32') {
        customBox.style.display = 'none';
        activateEsp32Stream();
        showToast("Switched to Live ESP32-CAM stream", "fa-video", "cyan");
      } else if (source === 'webcam') {
        customBox.style.display = 'none';
        activateWebcam();
      } else if (source === 'simulation') {
        customBox.style.display = 'none';
        activateSimulation();
        showToast("Switched to 60fps Cyber Simulation Feed", "fa-microchip", "cyan");
      } else if (source === 'custom') {
        customBox.style.display = 'block';
        showToast("Enter your IP Camera / ESP32-CAM stream URL below", "fa-network-wired", "amber");
      }
    });
  });

  // Check and poll Live Stream status from Google Sheets
  async function pollLiveStreamFromGoogleSheets() {
    try {
      const data = await window.googleSheetsService.getLiveStreamInfo();
      const dot = document.getElementById('esp32-status-dot');
      const text = document.getElementById('esp32-status-text');

      if (data && (data.online || data.deviceIp)) {
        state.esp32StreamUrl = data.streamUrl || `http://${data.deviceIp}/`;
        state.esp32Ip = data.deviceIp;

        if (dot) {
          dot.className = data.online ? 'pulse-dot' : 'pulse-dot warning';
        }
        if (text) {
          text.textContent = data.online ? `Online (${data.deviceIp})` : `Idle (Last: ${data.secondsAgo > 0 ? data.secondsAgo + 's ago' : 'Ready'})`;
        }

        // Update custom URL input placeholder
        const customInput = document.getElementById('custom-stream-url-input');
        if (customInput && !customInput.value) {
          customInput.placeholder = state.esp32StreamUrl;
        }
      }
    } catch (err) {
      console.warn("Poll stream status error:", err);
    }
  }

  // Poll stream status on boot & every 10 seconds
  pollLiveStreamFromGoogleSheets();
  setInterval(pollLiveStreamFromGoogleSheets, 10000);

  // Custom Stream URL Apply
  const applyStreamUrlBtn = document.getElementById('btn-apply-stream-url');
  if (applyStreamUrlBtn) {
    applyStreamUrlBtn.addEventListener('click', () => {
      const url = document.getElementById('custom-stream-url-input').value.trim();
      if (!url) {
        showToast("Please enter a valid Stream URL!", "fa-circle-exclamation", "rose");
        return;
      }
      playClickSound();
      activateEsp32Stream(url);
      showToast("Connecting to stream: " + url, "fa-plug", "cyan");
    });
  }

  // ================= 6. SNAPSHOT ENGINE (PHOTO + SOUND + FLASH + DRIVE SYNC) =================
  async function triggerSnapshot(triggerName = "Manual Snapshot", isMotion = false) {
    playShutterSound();

    // 1. Shutter Flash Effect
    const flash = document.getElementById('shutter-flash');
    if (flash) {
      flash.classList.remove('active');
      void flash.offsetWidth; // Reflow trigger
      flash.classList.add('active');
    }

    // 2. Capture Frame to Base64
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = 1280;
    captureCanvas.height = 720;
    const ctx = captureCanvas.getContext('2d');

    try {
      if (state.streamSource === 'webcam' && videoElement.readyState >= 2) {
        ctx.drawImage(videoElement, 0, 0, 1280, 720);
      } else if (state.streamSource === 'esp32' && mjpegImg && mjpegImg.naturalWidth > 0) {
        ctx.drawImage(mjpegImg, 0, 0, 1280, 720);
      } else {
        // Draw simulation frame with high-res detail
        ctx.drawImage(streamCanvas, 0, 0, 1280, 720);
      }
    } catch (corsErr) {
      console.warn("Direct snapshot canvas taint (CORS). Using simulated sensor frame:", corsErr);
      ctx.drawImage(streamCanvas, 0, 0, 1280, 720);
    }

    const base64Jpg = captureCanvas.toDataURL('image/jpeg', 0.85);
    const newVisitorId = "VIS-" + Math.floor(100000 + Math.random() * 900000);

    showToast(`📸 Snapshot Captured! Uploading ${newVisitorId}...`, "fa-camera", "cyan");

    // 3. Push to Google Sheets & Drive
    const result = await window.googleSheetsService.logVisitor({
      id: newVisitorId,
      trigger: triggerName,
      motion: isMotion,
      image: base64Jpg,
      imageUrl: base64Jpg
    });

    // 4. Update UI Ledgers
    loadAndRenderVisitors();
    showToast(`✅ Synced to Google Sheets & Drive! (${newVisitorId})`, "fa-cloud-arrow-up", "emerald");
  }

  // Snapshot Button Listeners
  const streamSnapshotBtn = document.getElementById('btn-stream-snapshot');
  if (streamSnapshotBtn) {
    streamSnapshotBtn.addEventListener('click', () => triggerSnapshot("Manual Snapshot", false));
  }
  const dashSnapshotBtn = document.getElementById('dash-snapshot-btn');
  if (dashSnapshotBtn) {
    dashSnapshotBtn.addEventListener('click', () => triggerSnapshot("Dashboard Manual", false));
  }
  const galleryCaptureBtn = document.getElementById('btn-gallery-capture');
  if (galleryCaptureBtn) {
    galleryCaptureBtn.addEventListener('click', () => triggerSnapshot("Gallery Capture", false));
  }

  // ================= 7. DOORBELL & MOTION ALERTS =================
  function triggerDoorbellEvent() {
    playDoorbellChime();
    showToast("🔔 FRONT DOORBELL RINGING!", "fa-bell", "amber");
    triggerSnapshot("Doorbell Button", true);
  }

  function triggerMotionEvent() {
    playMotionAlarm();
    showToast("🚨 PIR MOTION DETECTED AT FRONT DOOR!", "fa-person-running", "rose");
    triggerSnapshot("PIR Motion Sensor", true);
  }

  // Doorbell Buttons
  document.getElementById('quick-doorbell-btn')?.addEventListener('click', triggerDoorbellEvent);
  document.getElementById('btn-stream-doorbell')?.addEventListener('click', triggerDoorbellEvent);
  document.getElementById('dash-doorbell-btn')?.addEventListener('click', triggerDoorbellEvent);

  // Stream Alarm Button
  document.getElementById('btn-stream-alarm')?.addEventListener('click', () => {
    playMotionAlarm();
    showToast("🔊 Security Siren Triggered!", "fa-bullhorn", "rose");
  });

  // ================= 8. STREAM CONTROLS (NIGHT VISION, RECORD, FULLSCREEN) =================
  // Night Vision Toggle
  const nightVisionBtn = document.getElementById('btn-night-vision-toggle');
  if (nightVisionBtn) {
    nightVisionBtn.addEventListener('click', () => {
      playClickSound();
      state.nightVision = !state.nightVision;
      if (state.nightVision) {
        streamWrapper.classList.add('filter-night-vision');
        nightVisionBtn.classList.add('btn-emerald');
        nightVisionBtn.classList.remove('btn-glass');
        showToast("Phosphor Night Vision Enabled", "fa-moon", "emerald");
      } else {
        streamWrapper.classList.remove('filter-night-vision');
        nightVisionBtn.classList.remove('btn-emerald');
        nightVisionBtn.classList.add('btn-glass');
        showToast("Standard Vision Restored", "fa-sun", "cyan");
      }
    });
  }

  // Motion Box Toggle
  const motionBoxBtn = document.getElementById('btn-motion-box-toggle');
  if (motionBoxBtn) {
    motionBoxBtn.addEventListener('click', () => {
      playClickSound();
      state.motionBox = !state.motionBox;
      const box = document.getElementById('hud-motion-box');
      if (state.motionBox) {
        box.classList.remove('hidden');
        motionBoxBtn.classList.add('text-amber');
      } else {
        box.classList.add('hidden');
        motionBoxBtn.classList.remove('text-amber');
      }
    });
  }

  // ================= REAL VIDEO RECORDING (MEDIARECORDER + GOOGLE SHEETS) =================
  let mediaRecorder = null;
  let recordedVideoChunks = [];

  const recordBtn = document.getElementById('btn-stream-record');
  const recTag = document.getElementById('hud-rec-tag');
  const recDurationEl = document.getElementById('rec-duration');
  const recordBtnText = document.getElementById('btn-record-text');

  async function startRealVideoRecording() {
    try {
      recordedVideoChunks = [];
      let captureStreamObj = null;

      // 1. Capture stream from webcam, canvas, or video element
      if (state.streamSource === 'webcam' && state.webcamStream) {
        captureStreamObj = state.webcamStream;
      } else if (streamCanvas && streamCanvas.captureStream) {
        captureStreamObj = streamCanvas.captureStream(30);
      } else if (videoElement && videoElement.captureStream) {
        captureStreamObj = videoElement.captureStream(30);
      }

      if (!captureStreamObj) {
        showToast("Video recording stream not accessible", "fa-triangle-exclamation", "amber");
        return;
      }

      // Check supported MIME types
      let mimeType = 'video/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
          mimeType = 'video/webm;codecs=vp8';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        }
      }

      mediaRecorder = new MediaRecorder(captureStreamObj, { mimeType: mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedVideoChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (recordedVideoChunks.length === 0) return;

        const duration = state.recordSeconds;
        const videoBlob = new Blob(recordedVideoChunks, { type: mimeType });
        const videoUrl = URL.createObjectURL(videoBlob);
        const fileName = `smart_door_security_recording_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;

        // 1. Trigger automatic file download to PC / Mobile
        const downloadLink = document.createElement('a');
        downloadLink.href = videoUrl;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // 2. Capture a high-res video thumbnail snapshot
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 1280;
        thumbCanvas.height = 720;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (state.streamSource === 'webcam' && videoElement.readyState >= 2) {
          thumbCtx.drawImage(videoElement, 0, 0, 1280, 720);
        } else {
          thumbCtx.drawImage(streamCanvas, 0, 0, 1280, 720);
        }
        const thumbBase64 = thumbCanvas.toDataURL('image/jpeg', 0.85);

        // 3. Convert Video Blob to Base64 so it can be uploaded directly to Google Drive & Google Sheets
        showToast("Encoding & uploading real Video to Google Drive & Sheets...", "fa-cloud-arrow-up", "cyan");

        const videoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(videoBlob);
        });

        const recId = "REC-" + Math.floor(100000 + Math.random() * 900000);

        // 4. Upload actual video file and thumbnail to Google Sheets & Drive
        await window.googleSheetsService.logVideo({
          id: recId,
          duration: duration,
          videoBase64: videoBase64,
          videoUrl: videoUrl,
          mimeType: mimeType,
          thumbnail: thumbBase64,
          trigger: `Video Recording (${duration}s)`
        });

        loadAndRenderVisitors();
        showToast(`🎬 Video recording stored in Google Drive & logged in Sheets! (${recId})`, "fa-circle-check", "emerald");
      };

      mediaRecorder.start(500); // chunk every 500ms
      state.isRecording = true;
      state.recordSeconds = 0;
      recTag.style.display = 'flex';
      recordBtnText.textContent = 'Stop REC';
      showToast("🔴 Live Video Recording Started!", "fa-record-vinyl", "rose");

      state.recordTimer = setInterval(() => {
        state.recordSeconds++;
        const mins = String(Math.floor(state.recordSeconds / 60)).padStart(2, '0');
        const secs = String(state.recordSeconds % 60).padStart(2, '0');
        if (recDurationEl) recDurationEl.textContent = `${mins}:${secs}`;
      }, 1000);

    } catch (recErr) {
      console.error("MediaRecorder start error:", recErr);
      showToast("Video recording not supported on this browser/source", "fa-triangle-exclamation", "rose");
    }
  }

  function stopRealVideoRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    clearInterval(state.recordTimer);
    state.isRecording = false;
    recTag.style.display = 'none';
    recordBtnText.textContent = 'Record';
  }

  if (recordBtn) {
    recordBtn.addEventListener('click', () => {
      playClickSound();
      if (!state.isRecording) {
        startRealVideoRecording();
      } else {
        stopRealVideoRecording();
      }
    });
  }

  // Fullscreen Toggle
  const fullscreenBtn = document.getElementById('btn-fullscreen-toggle');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      playClickSound();
      if (!document.fullscreenElement) {
        streamWrapper.requestFullscreen().catch(err => console.warn(err));
      } else {
        document.exitFullscreen();
      }
    });
  }

  // HUD Real-time Clock
  const hudClock = document.getElementById('hud-clock-display');
  setInterval(() => {
    if (hudClock) {
      const now = new Date();
      hudClock.textContent = now.toISOString().replace('T', ' ').substring(0, 19);
    }
  }, 1000);

  // ================= 9. DIGITAL PTZ CAMERA DIAL =================
  const ptzRing = document.getElementById('ptz-ring');
  const ptzKnob = document.getElementById('ptz-knob');
  const ptzDegreeDisplay = document.getElementById('ptz-degree-display');

  function setPtzAngle(angle) {
    angle = Math.max(0, Math.min(180, angle));
    state.ptzAngle = angle;

    if (ptzDegreeDisplay) ptzDegreeDisplay.textContent = angle + '°';
    if (ptzRing) {
      const rotation = angle - 90; // Center is 0 rotation
      ptzRing.style.transform = `rotate(${rotation}deg)`;
    }
  }

  // Preset Buttons
  document.querySelectorAll('.ptz-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playClickSound();
      const targetAngle = parseInt(btn.getAttribute('data-angle'), 10);
      setPtzAngle(targetAngle);
      showToast(`PTZ Rotated to ${targetAngle}°`, "fa-arrows-spin", "cyan");
    });
  });

  // ================= 8. REAL COMPUTER VISION MOTION DETECTION & AUTO-FOLLOW =================
  const motionCanvas = document.createElement('canvas');
  motionCanvas.width = 160;
  motionCanvas.height = 120;
  const motionCtx = motionCanvas.getContext('2d', { willReadFrequently: true });
  
  let prevFrameData = null;
  let lastAutoMotionTime = 0;
  let isAutoFollow = true;
  let isAutoSaveToSheets = true;
  let motionPixelThreshold = 35; // default medium
  let minMotionPixels = 22;

  // Toggle Auto-Follow Camera
  const toggleAutoFollow = document.getElementById('toggle-auto-follow');
  if (toggleAutoFollow) {
    toggleAutoFollow.addEventListener('change', e => {
      isAutoFollow = e.target.checked;
      playClickSound();
      showToast(isAutoFollow ? "PTZ Auto-Follow Camera: ON" : "PTZ Auto-Follow Camera: OFF", "fa-crosshairs", "cyan");
    });
  }

  // Toggle Auto-Save Snapshot to Google Sheets on Motion
  const toggleAutoSnapshot = document.getElementById('toggle-auto-snapshot');
  if (toggleAutoSnapshot) {
    toggleAutoSnapshot.addEventListener('change', e => {
      isAutoSaveToSheets = e.target.checked;
      playClickSound();
      showToast(isAutoSaveToSheets ? "Auto-Save to Sheets: ON" : "Auto-Save to Sheets: OFF", "fa-cloud-arrow-up", "cyan");
    });
  }

  // Motion Sensitivity Buttons (High, Medium, Low)
  document.querySelectorAll('.motion-sens-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playClickSound();
      document.querySelectorAll('.motion-sens-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const sens = btn.getAttribute('data-sens');
      if (sens === 'high') {
        motionPixelThreshold = 20;
        minMotionPixels = 12;
      } else if (sens === 'medium') {
        motionPixelThreshold = 35;
        minMotionPixels = 25;
      } else if (sens === 'low') {
        motionPixelThreshold = 55;
        minMotionPixels = 45;
      }
      showToast(`Motion Sensitivity: ${sens.toUpperCase()}`, "fa-sliders", "cyan");
    });
  });

  // ================= MOTION SENSOR ARM / DISARM CONTROLLER =================
  function updateAllMotionButtons(isArmed) {
    const configs = [
      { btn: 'header-arm-motion-btn', icon: 'header-sensor-icon', text: 'header-sensor-text', isSm: true },
      { btn: 'btn-arm-motion-sensor', icon: 'sensor-btn-icon', text: 'sensor-btn-text', isSm: false },
      { btn: 'home-arm-motion-btn', icon: 'home-sensor-icon', text: 'home-sensor-text', isSm: false },
      { btn: 'dash-arm-motion-btn', icon: 'dash-sensor-icon', text: 'dash-sensor-text', isSm: false },
      { btn: 'view-arm-motion-btn', icon: 'view-sensor-icon', text: 'view-sensor-text', isSm: false }
    ];

    configs.forEach(cfg => {
      const b = document.getElementById(cfg.btn);
      const i = document.getElementById(cfg.icon);
      const t = document.getElementById(cfg.text);
      if (b) {
        b.className = isArmed 
          ? (cfg.isSm ? 'btn btn-sm btn-sensor-armed' : 'btn btn-sensor-armed')
          : (cfg.isSm ? 'btn btn-glass btn-sm' : 'btn btn-glass');
      }
      if (i) {
        i.className = isArmed ? 'fas fa-person-running' : 'fas fa-shield text-dim';
      }
      if (t) {
        t.textContent = isArmed ? 'Motion Sensor: ON' : 'Motion Sensor: OFF';
      }
    });

    const sidebarBtn = document.getElementById('sidebar-arm-motion-btn');
    const sidebarText = document.getElementById('sidebar-arm-text');
    if (sidebarBtn) {
      sidebarBtn.className = isArmed ? 'btn btn-sensor-armed' : 'btn btn-glass';
    }
    if (sidebarText) {
      sidebarText.textContent = isArmed ? 'Turn OFF Motion Sensor' : 'Turn ON Camera Motion Sensor';
    }

    const badge = document.getElementById('hud-motion-state-badge');
    if (badge) {
      if (isArmed) {
        badge.className = 'badge-tag badge-motion';
        badge.style.background = '';
        badge.style.color = '';
        badge.textContent = 'ARMED (CAM ACTIVE)';
      } else {
        badge.className = 'badge-tag';
        badge.style.background = 'rgba(255,255,255,0.08)';
        badge.style.color = 'var(--text-dim)';
        badge.textContent = 'DISARMED';
      }
    }
  }

  function toggleMotionSensorState(forcedState = null) {
    state.motionSensorArmed = forcedState !== null ? forcedState : !state.motionSensorArmed;
    playClickSound();

    updateAllMotionButtons(state.motionSensorArmed);

    if (state.motionSensorArmed) {
      // If currently on simulation, switch to real camera feed so optical tracking can work
      if (state.streamSource === 'simulation') {
        showToast("🛡️ Motion Sensor ON! Activating camera for real-world motion detection...", "fa-video", "rose");
        activateWebcam();
        document.querySelectorAll('.source-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-source') === 'webcam');
        });
      } else {
        showToast("🛡️ Camera Motion Sensor ON! Monitoring live camera feed for motion.", "fa-shield-halved", "rose");
      }
    } else {
      const motionBoxEl = document.getElementById('hud-motion-box');
      if (motionBoxEl) motionBoxEl.classList.add('hidden');

      const intensityBar = document.getElementById('motion-intensity-bar');
      const intensityVal = document.getElementById('motion-intensity-val');
      if (intensityBar) intensityBar.style.width = '0%';
      if (intensityVal) intensityVal.textContent = 'OFF';

      showToast("Camera Motion Sensor Turned OFF (Disarmed)", "fa-shield", "cyan");
    }
  }

  // Bind Motion Sensor buttons everywhere across the entire app
  [
    'header-arm-motion-btn',
    'btn-arm-motion-sensor',
    'sidebar-arm-motion-btn',
    'home-arm-motion-btn',
    'dash-arm-motion-btn',
    'view-arm-motion-btn'
  ].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => toggleMotionSensorState());
  });

  // Real Optical Motion Detection Analysis Loop (Runs every 100ms strictly on real cameras)
  function analyzeLiveOpticalMotion() {
    const intensityBar = document.getElementById('motion-intensity-bar');
    const intensityVal = document.getElementById('motion-intensity-val');
    const motionBoxEl = document.getElementById('hud-motion-box');

    // 1. If Motion Sensor is OFF (Disarmed), do not analyze
    if (!state.motionSensorArmed) {
      if (intensityBar) intensityBar.style.width = '0%';
      if (intensityVal) intensityVal.textContent = 'OFF';
      if (motionBoxEl) motionBoxEl.classList.add('hidden');
      prevFrameData = null;
      setTimeout(analyzeLiveOpticalMotion, 150);
      return;
    }

    // 2. Do NOT trigger on simulation (Only run on real camera: Webcam or ESP32-CAM!)
    if (state.streamSource === 'simulation') {
      if (intensityBar) intensityBar.style.width = '0%';
      if (intensityVal) intensityVal.textContent = 'CAM ONLY';
      if (motionBoxEl) motionBoxEl.classList.add('hidden');
      prevFrameData = null;
      setTimeout(analyzeLiveOpticalMotion, 200);
      return;
    }

    let activeSource = null;
    if (state.streamSource === 'webcam' && videoElement.readyState >= 2) {
      activeSource = videoElement;
    } else if (state.streamSource === 'esp32' && mjpegImg && mjpegImg.complete) {
      activeSource = mjpegImg;
    }

    if (!activeSource) {
      if (intensityBar) intensityBar.style.width = '0%';
      if (intensityVal) intensityVal.textContent = 'WAITING CAM';
      setTimeout(analyzeLiveOpticalMotion, 150);
      return;
    }

    try {
      motionCtx.drawImage(activeSource, 0, 0, 160, 120);
      const currFrameData = motionCtx.getImageData(0, 0, 160, 120);

      if (prevFrameData) {
        let diffCount = 0;
        let minX = 160, maxX = 0, minY = 120, maxY = 0;
        let sumX = 0, sumY = 0;
        const dCurr = currFrameData.data;
        const dPrev = prevFrameData.data;
        const len = dCurr.length;

        // Sample every 4th pixel for high-performance 60fps analysis
        for (let i = 0; i < len; i += 16) {
          const rDiff = Math.abs(dCurr[i] - dPrev[i]);
          const gDiff = Math.abs(dCurr[i+1] - dPrev[i+1]);
          const bDiff = Math.abs(dCurr[i+2] - dPrev[i+2]);
          const avgDiff = (rDiff + gDiff + bDiff) / 3;

          if (avgDiff > motionPixelThreshold) {
            diffCount++;
            const pIdx = i / 4;
            const x = pIdx % 160;
            const y = Math.floor(pIdx / 160);

            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            sumX += x;
            sumY += y;
          }
        }

        const totalSamples = len / 16;
        const motionPercent = Math.min(100, Math.round((diffCount / (totalSamples * 0.12)) * 100));

        // Update Motion Intensity UI Elements
        if (intensityBar) intensityBar.style.width = motionPercent + '%';
        if (intensityVal) intensityVal.textContent = motionPercent + '%';

        if (diffCount > minMotionPixels) {
          // REAL CAMERA MOTION DETECTED!
          const avgX = sumX / diffCount;
          const avgY = sumY / diffCount;
          const normX = avgX / 160; // 0.0 to 1.0
          const normY = avgY / 120; // 0.0 to 1.0

          // 1. Move the On-Screen Bounding Box over the detected moving person
          if (motionBoxEl && state.motionBox) {
            const bLeft = Math.max(2, Math.min(80, (minX / 160) * 100));
            const bTop = Math.max(2, Math.min(75, (minY / 120) * 100));
            const bWidth = Math.max(14, Math.min(80, ((maxX - minX) / 160) * 100));
            const bHeight = Math.max(18, Math.min(85, ((maxY - minY) / 120) * 100));

            motionBoxEl.style.left = bLeft + '%';
            motionBoxEl.style.top = bTop + '%';
            motionBoxEl.style.width = bWidth + '%';
            motionBoxEl.style.height = bHeight + '%';
            motionBoxEl.innerHTML = `
              <span>🎯 TARGET DETECTED (${motionPercent}%)</span>
              <span>TRACK: X:${Math.round(normX*100)}% Y:${Math.round(normY*100)}%</span>
              <span>CAM: ${state.streamSource.toUpperCase()}</span>
            `;
            motionBoxEl.classList.remove('hidden');
          }

          // 2. AUTO-FOLLOW CAMERA: Rotate PTZ Dial to face the moving target!
          if (isAutoFollow) {
            // Webcam mirror orientation: user moving right on screen -> pan to right
            const targetAngle = Math.round(180 - (normX * 180));
            setPtzAngle(targetAngle);
          }

          // 3. AUTO-SNAPSHOT & ALARM TO GOOGLE SHEETS (Debounced every 6s)
          const now = Date.now();
          if (isAutoSaveToSheets && now - lastAutoMotionTime > 6000) {
            lastAutoMotionTime = now;
            playMotionAlarm();
            showToast("🚨 Camera Intrusion Motion Detected! Uploading to Google Sheets...", "fa-person-running", "rose");
            triggerSnapshot("PIR Motion Sensor (Camera AI)", true);
          }
        } else {
          // Fade out motion box if no motion in camera feed
          if (motionBoxEl) {
            motionBoxEl.classList.add('hidden');
          }
        }
      }

      prevFrameData = currFrameData;
    } catch (e) {
      // Stream cross-origin frame capture error fallback
    }

    setTimeout(analyzeLiveOpticalMotion, 100);
  }

  // Start real computer vision motion loop
  setTimeout(analyzeLiveOpticalMotion, 500);

  // ================= 11. NAVIGATION & TOUCH GESTURES =================
  function switchTab(tabId) {
    playClickSound();
    state.currentTab = tabId;

    // Update active page view
    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.remove('active');
    });
    const activeView = document.getElementById('view-' + tabId);
    if (activeView) {
      activeView.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update Desktop Nav Links
    document.querySelectorAll('.desktop-nav .nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-nav') === tabId);
    });

    // Update Mobile Dock Links
    document.querySelectorAll('.dock-item a').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-nav') === tabId);
    });

    // Lazy load or refresh data
    if (tabId === 'history' || tabId === 'home' || tabId === 'gallery' || tabId === 'motion') {
      loadAndRenderVisitors();
    }
  }

  // Click listeners for navigation
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = el.getAttribute('data-nav');
      if (tab) switchTab(tab);
    });
  });

  // Mobile Horizontal Swipe Gesture Detection
  let touchStartX = 0;
  let touchEndX = 0;
  const tabsList = ['home', 'camera', 'dashboard', 'history', 'motion', 'gallery', 'settings', 'about'];

  document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) < 90) return; // Minimum swipe threshold

    const currentIndex = tabsList.indexOf(state.currentTab);
    if (diff > 0 && currentIndex < tabsList.length - 1) {
      // Swiped Left -> Next Tab
      switchTab(tabsList[currentIndex + 1]);
    } else if (diff < 0 && currentIndex > 0) {
      // Swiped Right -> Prev Tab
      switchTab(tabsList[currentIndex - 1]);
    }
  }

  // ================= 12. DATA FETCHING & RENDERING (GOOGLE SHEETS) =================
  async function loadAndRenderVisitors() {
    const records = await window.googleSheetsService.fetchVisitorHistory();
    state.visitors = records;

    renderHomeTable(records.slice(0, 5));
    renderHistoryTable(records);
    renderMotionTable(records.filter(r => (r.trigger || '').toLowerCase().includes('motion')));
    renderGallery(records.filter(r => r.imageUrl && r.imageUrl !== 'No Image' && r.imageUrl !== '#'));
    updateDashboardStats(records);
  }

  function renderHomeTable(records) {
    const tbody = document.getElementById('home-recent-table-body');
    if (!tbody) return;
    if (records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-dim);">No recent activity recorded</td></tr>`;
      return;
    }

    tbody.innerHTML = records.map(r => {
      const isVid = r.isVideo || (r.trigger || '').toLowerCase().includes('video') || (r.id || '').startsWith('REC-');
      return `
      <tr class="event-card-row" onclick="window.openPhotoModal('${r.imageUrl || ''}', '${r.id}', '${r.date} ${r.time}', '${r.driveViewUrl || '#'}', ${isVid}, '${r.videoUrl || ''}')">
        <td class="col-thumb">
          <div class="table-thumb-wrapper">
            <img src="${r.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" class="table-thumb" alt="thumb">
            ${isVid ? '<span class="thumb-play-badge"><i class="fas fa-play"></i></span>' : ''}
          </div>
        </td>
        <td class="col-id" style="font-family: var(--font-mono); font-weight: 700; color: ${isVid ? 'var(--accent-rose)' : 'var(--accent-cyan)'};">${r.id}</td>
        <td class="col-time">${r.time || '10:00 AM'}</td>
        <td class="col-trigger">${r.trigger || (isVid ? 'Video Clip' : 'PIR Motion')}</td>
        <td class="col-status"><span class="badge-tag ${isVid ? 'badge-motion' : ((r.trigger || '').includes('Motion') ? 'badge-motion' : 'badge-doorbell')}">${isVid ? '🎬 VIDEO' : (r.motionStatus || 'DETECTED')}</span></td>
      </tr>
      `;
    }).join('');
  }

  function renderHistoryTable(records) {
    const tbody = document.getElementById('visitor-table-body');
    if (!tbody) return;

    const countEl = document.getElementById('visitor-count-text');
    if (countEl) countEl.textContent = `Showing ${records.length} records`;

    if (records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">No visitor records in Google Sheets</td></tr>`;
      return;
    }

    tbody.innerHTML = records.map(r => {
      const isVid = r.isVideo || (r.trigger || '').toLowerCase().includes('video') || (r.id || '').startsWith('REC-');
      return `
      <tr class="event-card-row" onclick="window.openPhotoModal('${r.imageUrl || ''}', '${r.id}', '${r.date} ${r.time}', '${r.driveViewUrl || '#'}', ${isVid}, '${r.videoUrl || ''}')">
        <td class="col-thumb">
          <div class="table-thumb-wrapper">
            <img src="${r.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" class="table-thumb" alt="thumb">
            ${isVid ? '<span class="thumb-play-badge"><i class="fas fa-play"></i></span>' : ''}
          </div>
        </td>
        <td class="col-id" style="font-family: var(--font-mono); font-weight: 700; color: ${isVid ? 'var(--accent-rose)' : 'var(--accent-cyan)'};">${r.id}</td>
        <td class="col-date">${r.date || '2026-09-12'}</td>
        <td class="col-time">${r.time || '10:00:00 AM'}</td>
        <td class="col-trigger">${r.trigger || (isVid ? 'Video Clip' : 'PIR Sensor')}</td>
        <td class="col-status"><span class="badge-tag ${isVid ? 'badge-motion' : ((r.trigger || '').includes('Motion') ? 'badge-motion' : 'badge-doorbell')}">${isVid ? '🎬 VIDEO' : (r.motionStatus || 'DETECTED')}</span></td>
        <td class="col-action"><button class="btn ${isVid ? 'btn-alert' : 'btn-glass'}" style="padding: 0.35rem 0.75rem; font-size: 0.75rem;"><i class="fas ${isVid ? 'fa-play' : 'fa-eye'}"></i> ${isVid ? 'Play' : 'View'}</button></td>
      </tr>
      `;
    }).join('');
  }

  function renderMotionTable(records) {
    const tbody = document.getElementById('motion-table-body');
    if (!tbody) return;

    if (records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-dim);">No motion sensor events recorded</td></tr>`;
      return;
    }

    tbody.innerHTML = records.map(r => {
      const isVid = r.isVideo || (r.trigger || '').toLowerCase().includes('video') || (r.id || '').startsWith('REC-');
      return `
      <tr class="event-card-row" onclick="window.openPhotoModal('${r.imageUrl || ''}', '${r.id}', '${r.date} ${r.time}', '${r.driveViewUrl || '#'}', ${isVid}, '${r.videoUrl || ''}')">
        <td class="col-thumb">
          <div class="table-thumb-wrapper">
            <img src="${r.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" class="table-thumb" alt="thumb">
            ${isVid ? '<span class="thumb-play-badge"><i class="fas fa-play"></i></span>' : ''}
          </div>
        </td>
        <td class="col-id" style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-rose);">${r.id}</td>
        <td class="col-time">${r.date} ${r.time}</td>
        <td class="col-trigger">${r.trigger}</td>
        <td class="col-status"><span class="badge-tag badge-motion">HIGH PRIORITY</span></td>
      </tr>
      `;
    }).join('');
  }

  function renderGallery(records) {
    const container = document.getElementById('gallery-container');
    if (!container) return;

    if (records.length === 0) {
      container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem;">No captured snapshot photos available yet. Click "Capture New" above!</div>`;
      return;
    }

    container.innerHTML = records.map(r => `
      <div class="gallery-card" onclick="window.openPhotoModal('${r.imageUrl}', '${r.id}', '${r.date} ${r.time}', '${r.driveViewUrl || '#'}')">
        <img src="${r.imageUrl}" alt="${r.id}" loading="lazy">
        <div class="gallery-card-overlay">
          <div>
            <div style="font-weight: 700; font-family: var(--font-mono); color: #fff;">${r.id}</div>
            <small style="color: var(--accent-cyan);">${r.time || ''}</small>
          </div>
          <span class="badge-tag badge-snapshot"><i class="fas fa-camera"></i></span>
        </div>
      </div>
    `).join('');
  }

  function updateDashboardStats(records) {
    const totalVisitorsEl = document.getElementById('stat-total-visitors');
    const motionCountEl = document.getElementById('stat-motion-count');
    const doorbellCountEl = document.getElementById('stat-doorbell-count');

    if (totalVisitorsEl) totalVisitorsEl.textContent = records.length;
    if (motionCountEl) {
      const count = records.filter(r => (r.trigger || '').toLowerCase().includes('motion')).length;
      motionCountEl.textContent = count;
    }
    if (doorbellCountEl) {
      const count = records.filter(r => (r.trigger || '').toLowerCase().includes('doorbell')).length;
      doorbellCountEl.textContent = count;
    }
  }

  // Search and Filter History
  const searchInput = document.getElementById('visitor-search-input');
  const filterSelect = document.getElementById('visitor-filter-select');

  function filterHistoryRecords() {
    const q = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const type = filterSelect ? filterSelect.value : 'ALL';

    const filtered = state.visitors.filter(r => {
      const matchQuery = !q || (r.id || '').toLowerCase().includes(q) || (r.trigger || '').toLowerCase().includes(q);
      let matchType = true;
      if (type === 'MOTION') matchType = (r.trigger || '').toLowerCase().includes('motion');
      else if (type === 'DOORBELL') matchType = (r.trigger || '').toLowerCase().includes('doorbell');
      else if (type === 'SNAPSHOT') matchType = (r.trigger || '').toLowerCase().includes('snapshot');
      return matchQuery && matchType;
    });

    renderHistoryTable(filtered);
  }

  if (searchInput) searchInput.addEventListener('input', filterHistoryRecords);
  if (filterSelect) filterSelect.addEventListener('change', filterHistoryRecords);

  // Export CSV
  const exportCsvBtn = document.getElementById('btn-export-csv');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      playClickSound();
      window.googleSheetsService.exportToCsv(state.visitors);
      showToast("Exported Visitor Logs to CSV!", "fa-file-csv", "emerald");
    });
  }

  // Refresh Sync Buttons
  document.getElementById('btn-refresh-history')?.addEventListener('click', () => {
    playClickSound();
    loadAndRenderVisitors();
    showToast("Synced Visitor Logs with Cloud!", "fa-arrows-rotate", "cyan");
  });
  document.getElementById('btn-refresh-dashboard')?.addEventListener('click', () => {
    playClickSound();
    loadAndRenderVisitors();
    showToast("Telemetry Refreshed", "fa-arrows-rotate", "cyan");
  });

  // ================= 13. GOOGLE SHEETS CONFIGURATION TAB =================
  const sheetUrlInput = document.getElementById('sheets-url-input');
  const spreadsheetUrlInput = document.getElementById('spreadsheet-view-url-input');
  const openSheetBtn = document.getElementById('btn-open-google-sheet');

  if (sheetUrlInput) {
    sheetUrlInput.value = window.googleSheetsService.getScriptUrl();
  }

  if (spreadsheetUrlInput) {
    spreadsheetUrlInput.value = localStorage.getItem('smartdoor_spreadsheet_url') || '';
    if (openSheetBtn) {
      openSheetBtn.href = spreadsheetUrlInput.value || '#';
      spreadsheetUrlInput.addEventListener('input', () => {
        const val = spreadsheetUrlInput.value.trim();
        localStorage.setItem('smartdoor_spreadsheet_url', val);
        openSheetBtn.href = val || '#';
      });
    }
  }

  const saveSheetBtn = document.getElementById('btn-save-sheet-url');
  if (saveSheetBtn) {
    saveSheetBtn.addEventListener('click', async () => {
      playClickSound();
      const rawUrl = sheetUrlInput.value.trim();
      const statusText = document.getElementById('ping-status-text');

      if (!rawUrl) {
        statusText.innerHTML = `<span class="text-rose">❌ Please enter a valid URL</span>`;
        return;
      }

      // Check if user entered Google Spreadsheet link instead of Web App URL
      if (rawUrl.includes("docs.google.com/spreadsheets")) {
        localStorage.setItem('smartdoor_spreadsheet_url', rawUrl);
        if (spreadsheetUrlInput) spreadsheetUrlInput.value = rawUrl;
        if (openSheetBtn) openSheetBtn.href = rawUrl;

        statusText.innerHTML = `
          <div style="color: var(--accent-amber); line-height: 1.6; text-align: left; font-size: 0.85rem;">
            ⚠️ <strong>You entered a Google Spreadsheet link!</strong><br>
            A spreadsheet URL can only be viewed, not written to by a website.<br>
            To save data, you need the <strong>Apps Script Web App URL</strong>:<br>
            1. In your Google Sheet, click <strong>Extensions &gt; Apps Script</strong><br>
            2. Paste the code from <code>google_sheets_code.js</code> and click <strong>Save</strong><br>
            3. Click <strong>Deploy &gt; New deployment &gt; Web app</strong> (Access: <strong>Anyone</strong>)<br>
            4. Copy the URL ending with <code>/exec</code> and paste it here!
          </div>
        `;
        showToast("Enter Apps Script /exec URL, not Spreadsheet link", "fa-triangle-exclamation", "amber");
        return;
      }

      try {
        window.googleSheetsService.setScriptUrl(rawUrl);
        statusText.textContent = "Testing connection to Google Apps Script...";

        const pingResult = await window.googleSheetsService.testConnection(rawUrl);
        if (pingResult.success) {
          statusText.innerHTML = `<span class="text-emerald">✅ ${pingResult.message}</span>`;
          showToast("Google Sheets Connection Verified!", "fa-check", "emerald");

          // Update header HUD pill
          const headerPill = document.getElementById('header-sheets-status');
          const headerPulse = document.getElementById('header-pulse');
          if (headerPill) headerPill.textContent = `Sheets: Connected (${pingResult.latency}ms)`;
          if (headerPulse) headerPulse.className = 'pulse-dot active';

          const latencyStat = document.getElementById('stat-ping-latency');
          if (latencyStat) latencyStat.textContent = `${pingResult.latency}ms`;

          // Refresh logs immediately
          loadAndRenderVisitors();
        } else {
          statusText.innerHTML = `<span class="text-rose">❌ ${pingResult.message}</span>`;
          showToast("Connection failed. Check permissions (Access: Anyone).", "fa-triangle-exclamation", "rose");
        }
      } catch (err) {
        statusText.innerHTML = `<span class="text-rose">❌ ${err.message}</span>`;
      }
    });
  }

  // Test Sample Row Button
  const testSampleBtn = document.getElementById('btn-test-sample-row');
  if (testSampleBtn) {
    testSampleBtn.addEventListener('click', async () => {
      playClickSound();
      await triggerSnapshot("Manual Config Test", false);
    });
  }

  // Clear Logs Button
  const clearLogsBtn = document.getElementById('btn-clear-sheet-logs');
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', async () => {
      playClickSound();
      if (confirm("Are you sure you want to clear all visitor log rows from Google Sheets?")) {
        await window.googleSheetsService.clearVisitorHistory();
        loadAndRenderVisitors();
        showToast("Cleared visitor records", "fa-trash-can", "rose");
      }
    });
  }

  // Ping Test from Dashboard
  document.getElementById('dash-ping-btn')?.addEventListener('click', async () => {
    playClickSound();
    showToast("Testing Google Sheets latency...", "fa-wifi", "cyan");
    const res = await window.googleSheetsService.testConnection();
    showToast(`Latency: ${res.latency}ms (${res.mode})`, "fa-bolt", "emerald");
  });

  // ================= 14. MODALS & LIGHTBOX =================
  window.openPhotoModal = function(imgSrc, id, timeStr, driveLink, isVideo = false, videoUrl = '') {
    playClickSound();
    const modal = document.getElementById('photo-modal');
    if (!modal) return;

    const imgEl = document.getElementById('modal-photo-img');
    const vidEl = document.getElementById('modal-video-player');
    const titleEl = document.getElementById('modal-photo-title');
    const driveLinkText = document.getElementById('modal-drive-link-text');
    const dlLinkText = document.getElementById('modal-download-text');
    const driveEl = document.getElementById('modal-drive-link');
    const dlEl = document.getElementById('modal-download-link');

    document.getElementById('modal-photo-id').textContent = id;
    document.getElementById('modal-photo-time').textContent = timeStr;

    const isRecordVideo = isVideo || (id && id.startsWith('REC-')) || (videoUrl && videoUrl.length > 0);

    if (isRecordVideo && vidEl) {
      if (imgEl) imgEl.style.display = 'none';
      vidEl.style.display = 'block';
      vidEl.src = videoUrl || imgSrc;
      vidEl.load();
      if (titleEl) titleEl.textContent = '🎬 Security Video Recording';
      if (driveLinkText) driveLinkText.textContent = '▶️ Play in Google Drive';
      if (dlLinkText) dlLinkText.textContent = '⬇️ Download Video';
      if (driveEl) driveEl.href = driveLink || 'https://drive.google.com';
      if (dlEl) {
        dlEl.href = videoUrl || imgSrc;
        dlEl.download = `${id}.webm`;
      }
    } else {
      if (vidEl) {
        vidEl.pause();
        vidEl.style.display = 'none';
        vidEl.src = '';
      }
      if (imgEl) {
        imgEl.style.display = 'block';
        imgEl.src = imgSrc;
      }
      if (titleEl) titleEl.textContent = 'Visitor Snapshot';
      if (driveLinkText) driveLinkText.textContent = 'View Drive';
      if (dlLinkText) dlLinkText.textContent = 'Download';
      if (driveEl) driveEl.href = driveLink || 'https://drive.google.com';
      if (dlEl) {
        dlEl.href = imgSrc;
        dlEl.download = `${id}.jpg`;
      }
    }

    modal.classList.add('active');
  };

  function closeModal() {
    playClickSound();
    const vidEl = document.getElementById('modal-video-player');
    if (vidEl) {
      vidEl.pause();
      vidEl.src = '';
    }
    document.getElementById('photo-modal')?.classList.remove('active');
  }

  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);

  // Backend Code Viewer Modal
  const viewCodeBtn = document.getElementById('btn-view-backend-code');
  const codeModal = document.getElementById('code-modal');
  const codeCloseBtn = document.getElementById('code-modal-close-btn');
  const codeTextarea = document.getElementById('code-modal-textarea');

  if (viewCodeBtn && codeModal) {
    viewCodeBtn.addEventListener('click', async () => {
      playClickSound();
      try {
        const response = await fetch('google-sheets-backend/google_sheets_code.js');
        if (response.ok) {
          codeTextarea.value = await response.text();
        } else {
          codeTextarea.value = "// Please copy code from google-sheets-backend/google_sheets_code.js";
        }
      } catch (e) {
        codeTextarea.value = "// google-sheets-backend/google_sheets_code.js";
      }
      codeModal.classList.add('active');
    });
  }

  if (codeCloseBtn) {
    codeCloseBtn.addEventListener('click', () => {
      playClickSound();
      codeModal.classList.remove('active');
    });
  }

  document.getElementById('btn-copy-backend-code')?.addEventListener('click', () => {
    playClickSound();
    codeTextarea.select();
    navigator.clipboard.writeText(codeTextarea.value).then(() => {
      showToast("Backend code copied to clipboard!", "fa-copy", "emerald");
    });
  });

  // Close modals on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });

  // ================= 15. THEME & AUDIO TOGGLES =================
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('security_theme', state.theme);
      document.documentElement.setAttribute('data-theme', state.theme);
      updateThemeIcon();
      playClickSound();
      showToast(`Theme switched to ${state.theme.toUpperCase()}`, "fa-palette", "cyan");
    });
  }

  function updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    if (icon) {
      icon.className = state.theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
  }

  const audioToggleBtn = document.getElementById('audio-toggle-btn');
  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      localStorage.setItem('security_sound', state.soundEnabled);
      updateAudioIcon();
      if (state.soundEnabled) playClickSound();
      showToast(state.soundEnabled ? "Sound Effects ON" : "Sound Muted", state.soundEnabled ? "fa-volume-high" : "fa-volume-xmark", "cyan");
    });
  }

  function updateAudioIcon() {
    const icon = document.getElementById('audio-icon');
    if (icon) {
      icon.className = state.soundEnabled ? 'fas fa-volume-high' : 'fas fa-volume-xmark';
    }
  }

  // Initial Data Load
  loadAndRenderVisitors();
  window.googleSheetsService.testConnection().then(res => {
    const headerPill = document.getElementById('header-sheets-status');
    if (headerPill && res.success) {
      headerPill.textContent = `Sheets: ${res.latency}ms`;
    }
  });

  // ================= NEW FEATURES =================

  // 1. Loader Screen Hide Logic
  const appLoader = document.getElementById('app-loader');
  if (appLoader) {
    setTimeout(() => {
      appLoader.classList.add('hidden');
      setTimeout(() => appLoader.remove(), 600); // Remove from DOM after fade
    }, 1200); // Minimum 1.2s loading time for polish
  }

  // 2. Ripple Effect Click Listener
  document.addEventListener('click', function(e) {
    const target = e.target.closest('.btn, .nav-link, .dock-item a');
    if (!target) return;
    
    const circle = document.createElement('span');
    const diameter = Math.max(target.clientWidth, target.clientHeight);
    const radius = diameter / 2;
    const rect = target.getBoundingClientRect();
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.classList.add('ripple');
    
    // Remove existing ripples to avoid clutter
    const ripple = target.querySelector('.ripple');
    if (ripple) {
      ripple.remove();
    }
    
    target.appendChild(circle);
  });

  // 3. Real-time Clock Logic
  function updateClock() {
    const clockEl = document.getElementById('header-time');
    if (!clockEl) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
    clockEl.textContent = timeStr;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // 4. Open-Meteo Weather API Logic
  async function fetchWeather() {
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    if (!tempEl || !descEl) return;
    
    try {
      // Using generic coordinates (London) to ensure it works without prompts
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=51.5085&longitude=-0.1257&current_weather=true');
      if (res.ok) {
        const data = await res.json();
        const weather = data.current_weather;
        tempEl.textContent = `${Math.round(weather.temperature)}°C`;
        
        // Simple weathercode translation
        const code = weather.weathercode;
        let desc = "Clear";
        let icon = "fa-sun text-amber";
        if (code > 0 && code <= 3) { desc = "Cloudy"; icon = "fa-cloud-sun text-amber"; }
        if (code >= 45 && code <= 48) { desc = "Foggy"; icon = "fa-smog text-dim"; }
        if (code >= 51 && code <= 67) { desc = "Raining"; icon = "fa-cloud-rain text-cyan"; }
        if (code >= 71 && code <= 77) { desc = "Snow"; icon = "fa-snowflake text-main"; }
        if (code >= 95) { desc = "Thunderstorm"; icon = "fa-cloud-bolt text-rose"; }
        
        descEl.textContent = desc;
        document.getElementById('weather-icon').className = `fas ${icon}`;
      } else {
        tempEl.textContent = "N/A";
        descEl.textContent = "Offline";
      }
    } catch (e) {
      tempEl.textContent = "N/A";
      descEl.textContent = "Error fetching";
    }
  }
  fetchWeather();
  setInterval(fetchWeather, 600000); // 10 mins

  // 5. Battery API Logic
  async function updateBattery() {
    const batteryLevel = document.getElementById('battery-level');
    const batteryStatus = document.getElementById('battery-status');
    const batteryIcon = document.getElementById('battery-icon');
    if (!batteryLevel || !batteryStatus || !navigator.getBattery) {
        if(batteryStatus) batteryStatus.textContent = "Battery API unsupported";
        return;
    }
    
    try {
      const battery = await navigator.getBattery();
      
      const setStatus = () => {
        const level = Math.round(battery.level * 100);
        batteryLevel.textContent = `${level}%`;
        
        if (battery.charging) {
          batteryStatus.textContent = "Charging";
          batteryIcon.className = "fas fa-battery-bolt text-emerald";
        } else {
          batteryStatus.textContent = "Discharging";
          if (level > 75) batteryIcon.className = "fas fa-battery-full text-emerald";
          else if (level > 50) batteryIcon.className = "fas fa-battery-half text-cyan";
          else if (level > 25) batteryIcon.className = "fas fa-battery-quarter text-amber";
          else batteryIcon.className = "fas fa-battery-empty text-rose";
        }
      };
      
      setStatus();
      battery.addEventListener('levelchange', setStatus);
      battery.addEventListener('chargingchange', setStatus);
    } catch (e) {
      console.warn("Battery API error:", e);
    }
  }
  updateBattery();

  // 6. Desktop Notification API Setup
  function requestNotificationPermission() {
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notification");
    } else if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }
  setTimeout(requestNotificationPermission, 2000);
  
  // Override showToast to also trigger a real push notification if enabled
  const originalShowToast = window.showToast || showToast;
  window.showToast = function(msg, iconClass, colorClass) {
    if (typeof originalShowToast === 'function') {
      originalShowToast(msg, iconClass, colorClass);
    }
    
    if ("Notification" in window && Notification.permission === "granted") {
      const importantAlerts = ["Motion Detected", "Doorbell", "Snapshot", "Alarm"];
      const isImportant = importantAlerts.some(alert => msg.includes(alert));
      
      if (isImportant) {
        new Notification("Smart Door System", {
          body: msg,
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23070a12"/><path d="M50 15 L80 30 V55 C80 72 50 85 50 85 C50 85 20 72 20 55 V30 Z" fill="none" stroke="%2300f2fe" stroke-width="6"/><circle cx="50" cy="48" r="12" fill="%2300f2fe"/></svg>'
        });
      }
    }
  };
});
