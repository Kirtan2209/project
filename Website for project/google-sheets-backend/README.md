# 📊 Google Sheets Backend Deployment Guide

This guide explains how to deploy the Google Apps Script backend code (`google_sheets_code.js`) to power your Smart Door & Camera Streaming system with real-time visitor logging, photo captures, and Google Drive storage.

---

## 🚀 Quick Setup (Under 3 Minutes)

### Step 1: Create a New Google Sheet
1. Open your browser and go to: [https://sheets.new](https://sheets.new)
2. Rename the spreadsheet to **`Smart Door Security Logs`**.

### Step 2: Open Google Apps Script
1. In the top menu, click **Extensions** -> **Apps Script**.
2. A new tab will open with the Apps Script code editor.
3. Delete any default code (`function myFunction() { ... }`) present in the `Code.gs` file.

### Step 3: Paste Backend Code
1. Open [`google_sheets_code.js`](./google_sheets_code.js).
2. Copy the entire contents of the file.
3. Paste it into the Apps Script editor.
4. Click the **💾 Save project** icon (or press `Ctrl + S`).
5. Name the project: **`Smart Door Security Backend`**.

### Step 4: Deploy as Web App
1. At the top right, click the blue **Deploy** button -> click **New deployment**.
2. Next to *Select type*, click the gear icon (⚙️) and choose **Web app**.
3. Fill in the deployment details:
   - **Description**: `Smart Door Security Production API`
   - **Execute as**: `Me (your_email@gmail.com)`
   - **Who has access**: `Anyone` *(⚠️ CRITICAL: Must be set to "Anyone" so the website and cameras can make HTTP requests without login blocks)*
4. Click **Deploy**.

### Step 5: Authorize Permissions
1. Click **Authorize access** when prompted.
2. Choose your Google account.
3. If Google shows *"Google hasn't verified this app"*:
   - Click **Advanced** (at the bottom left).
   - Click **Go to Smart Door Security Backend (unsafe)**.
4. Review the permissions (Google Drive & Spreadsheets access) and click **Allow**.

### Step 6: Copy Web App URL & Connect Website
1. You will see a dialog with:
   - **Web app URL**: `https://script.google.com/macros/s/AKfycb.../exec`
2. Click **Copy** to copy this URL.
3. Open your project website in your browser.
4. Navigate to the **Sheet Config** tab.
5. Paste your Web App URL into the **Google Apps Script Web App URL** input field.
6. Click **Save & Test Connection**.
7. You will see an instant success confirmation showing ping latency! 🎉

---

## 📹 How Live Stream Works (ESP32-CAM -> Google Sheets -> Website)

1. **In your ESP32 Program (`ESP32_Camera_Stream.ino`)**:
   - Set:
     ```cpp
     const char* GOOGLE_SCRIPT_URL = "YOUR_DEPLOYMENT_URL_HERE";
     ```
   - Upload the program to your ESP32-CAM.
2. **Auto-Discovery via Google Sheets**:
   - When the ESP32 connects to Wi-Fi, it automatically executes an HTTPS POST to your Google Sheets Web App URL with its local IP and stream link (`http://192.168.x.x/`).
   - Google Sheets stores the camera IP in its fast cache and creates a `"Live Stream Status"` tab.
3. **Automatic Website Connection**:
   - The website queries Google Sheets every 10 seconds.
   - As soon as the camera is detected, the button **`Live ESP32-CAM`** lights up green (`🟢 Online (192.168.x.x)`).
   - Click the button to stream directly from your camera!

---

## 🎯 Features Included in the Script

| Feature | Description |
| :--- | :--- |
| **Real Video Storage in Google Drive** | When you record video on the website, it encodes the `.webm` clip into Base64 and creates real video files inside a dedicated `"Smart Door Security Video Recordings"` folder in Google Drive. |
| **Dedicated "Video Recordings" Sheet** | Automatically creates a `"Video Recordings"` sheet tab with Video ID, Duration, File Size, and 1-click `=HYPERLINK(driveUrl, "▶️ Play Video")` and `=HYPERLINK(dlUrl, "⬇️ Download")` formulas! |
| **Unified "Visitor Logs" Integration** | Video sessions are also mirrored in `"Visitor Logs"` with thumbnail previews and direct links to watch the video in Google Drive. |
| **Live Stream Auto-Discovery** | ESP32-CAM posts its live IP & stream URL to Google Sheets; the website automatically discovers and displays it. |
| **Automatic Header Styling** | Freezes row 1, sets dark slate `#0f172a` background, cyber cyan text `#00f2fe`, and auto-resizes columns for all sheets. |
| **Google Drive Image Storage** | Creates a dedicated `"Smart Door Security Captures"` folder in Google Drive and saves captured photos. |
| **Direct Web Image URLs** | Generates direct links (`https://lh3.googleusercontent.com/d/{ID}`) that display directly inside `<img>` tags on your website. |
| **REST API (`doPost` & `doGet`)** | Supports `logVideo`, `logVisitor`, `getVideos`, `getHistory`, `getLiveStream`, ping test, and log clearing. |
| **Custom Menu** | Adds a `🛡️ Smart Door Security` menu inside Google Sheets with 1-click test video record creation, Drive folder link, and header formatting. |

---

## 🧪 Testing the API in Your Browser

You can verify that your Web App URL is active by pasting it in any browser tab with:
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=ping
```
You will receive an instant JSON response:
```json
{
  "status": "online",
  "message": "Smart Door Security Google Apps Script Backend is fully operational!",
  "timestamp": "2026-09-12T04:55:00.000Z",
  "totalRows": 0
}
```
