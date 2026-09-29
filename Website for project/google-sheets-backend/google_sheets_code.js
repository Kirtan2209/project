/**
 * ==============================================================================
 * SMART DOOR SECURITY SYSTEM - GOOGLE APPS SCRIPT BACKEND
 * ==============================================================================
 * 
 * Features:
 * 1. Live Camera Stream Auto-Discovery & Relay (ESP32-CAM -> Google Sheets -> Website)
 * 2. Real-time Device IP & Stream URL registration via PropertiesService & Sheets
 * 3. Visitor Logging with Base64 photo saving to Google Drive folder
 * 4. REAL VIDEO STORAGE: Decodes Base64 video clips (.webm / .mp4), creates
 *    dedicated Google Drive video files with playable links & logs to Google Sheets!
 * 5. Direct web image URLs (lh3.googleusercontent.com) for website <img> tags
 * 6. Auto-formatted sheets with frozen header rows & dark slate theme
 * 7. Google Sheets custom menu (🛡️ Smart Door Security)
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open Google Sheets (sheets.new)
 * 2. Go to Extensions -> Apps Script
 * 3. Replace all code with this file & save (Ctrl + S)
 * 4. Click 'Deploy' -> 'New Deployment'
 * 5. Select type: 'Web app' | Execute as: 'Me' | Access: 'Anyone'
 * 6. Copy the Web app URL and paste into:
 *    - Your ESP32 program: const char* GOOGLE_SCRIPT_URL = "YOUR_URL";
 *    - Your Website: 'Sheet Config' tab
 * ==============================================================================
 */

// Configuration Constants
var CONFIG = {
  DRIVE_FOLDER_NAME: "Smart Door Security Captures",
  DRIVE_VIDEO_FOLDER_NAME: "Smart Door Security Video Recordings",
  LOGS_SHEET_NAME: "Visitor Logs",
  VIDEO_SHEET_NAME: "Video Recordings",
  STREAM_SHEET_NAME: "Live Stream Status",
  LOGS_HEADERS: [
    "Visitor ID",
    "Date",
    "Time",
    "Motion Status",
    "Trigger Type",
    "Direct Image URL",
    "Drive View Link",
    "Device Status",
    "Timestamp ISO"
  ],
  VIDEO_HEADERS: [
    "Video ID",
    "Date",
    "Time",
    "Duration",
    "File Size",
    "Drive Play Link",
    "Direct Download Link",
    "Trigger Type",
    "Direct Thumbnail",
    "Timestamp ISO"
  ],
  STREAM_HEADERS: [
    "Device Name",
    "Device IP",
    "Stream URL",
    "Status",
    "Last Heartbeat",
    "Timestamp ISO"
  ]
};

/**
 * Handle HTTP POST requests (Camera Registration, Stream Updates, Visitor Logs, Video Storage)
 */
function doPost(e) {
  try {
    var payload = {};
    
    // Parse incoming payload safely
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action || "logVisitor";
    var now = new Date();
    var timeZone = Session.getScriptTimeZone();
    var timestampIso = now.toISOString();

    // ================= ACTION 1: REGISTER CAMERA / UPDATE STREAM URL =================
    if (action === "registerCamera" || action === "updateStreamUrl" || action === "heartbeat") {
      var deviceIp = payload.deviceIp || payload.ip || "Unknown IP";
      var streamUrl = payload.streamUrl || ("http://" + deviceIp + "/");
      var deviceName = payload.deviceName || "ESP32-CAM Subsystem";

      // 1. Fast Cache in ScriptProperties (Sub-millisecond retrieval for website)
      var props = PropertiesService.getScriptProperties();
      props.setProperty("CAM_IP", deviceIp);
      props.setProperty("CAM_STREAM_URL", streamUrl);
      props.setProperty("CAM_LAST_SEEN", timestampIso);
      props.setProperty("CAM_STATUS", "ONLINE");
      props.setProperty("CAM_NAME", deviceName);

      if (payload.image && payload.image.length > 50) {
        props.setProperty("CAM_LATEST_FRAME", payload.image);
      }

      // 2. Log in "Live Stream Status" sheet
      var streamSheet = getOrCreateStreamSheet();
      var streamRow = [
        deviceName,
        deviceIp,
        streamUrl,
        "ONLINE",
        Utilities.formatDate(now, timeZone, "yyyy-MM-dd hh:mm:ss a"),
        timestampIso
      ];
      if (streamSheet.getLastRow() < 2) {
        streamSheet.appendRow(streamRow);
      } else {
        streamSheet.getRange(2, 1, 1, streamRow.length).setValues([streamRow]);
      }
      streamSheet.getRange(2, 1, 1, streamRow.length).setHorizontalAlignment("center");

      return createJsonResponse({
        status: "success",
        message: "ESP32 Live Stream URL registered successfully!",
        streamUrl: streamUrl,
        deviceIp: deviceIp,
        timestamp: timestampIso
      });
    }

    // ================= ACTION 2: CLEAR LOGS =================
    if (action === "clearLogs" || action === "clearHistory") {
      var sheet = getOrCreateLogSheet();
      clearAllLogs(sheet);
      var vSheet = getOrCreateVideoSheet();
      clearAllLogs(vSheet);
      return createJsonResponse({
        status: "success",
        message: "Visitor history and video recordings cleared successfully."
      });
    }

    // ================= ACTION 3: STORE REAL VIDEO RECORDING IN GOOGLE DRIVE & SHEETS =================
    if (action === "logVideo" || action === "uploadVideo" || (payload.video && payload.video.length > 100)) {
      var videoId = payload.videoId || payload.id || ("REC-" + Math.floor(100000 + Math.random() * 900000));
      var durationNum = payload.duration || 0;
      var durationStr = durationNum > 0 ? (durationNum + "s") : "Live Clip";
      var triggerType = payload.triggerType || ("Video Recording (" + durationStr + ")");
      var motionStatus = "DETECTED";
      var deviceStatus = payload.deviceStatus || "ONLINE";
      var dateStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd");
      var timeStr = Utilities.formatDate(now, timeZone, "hh:mm:ss a");

      var driveVideoUrl = "No Video Data";
      var driveDownloadUrl = "No Video Data";
      var fileSizeKB = "0 KB";
      var thumbDirectUrl = "No Thumbnail";

      // 1. Decode and Save Video File to Dedicated Google Drive Folder
      if (payload.video && payload.video.length > 50) {
        try {
          var base64Video = payload.video;
          if (base64Video.indexOf("base64,") !== -1) {
            base64Video = base64Video.split("base64,")[1];
          }

          var mimeType = payload.mimeType || "video/webm";
          var ext = mimeType.indexOf("mp4") !== -1 ? ".mp4" : ".webm";
          var videoFileName = videoId + "_" + Utilities.formatDate(now, timeZone, "yyyyMMdd_HHmmss") + ext;

          var videoFolder = getOrCreateDriveFolder(CONFIG.DRIVE_VIDEO_FOLDER_NAME);
          var decodedVideoBlob = Utilities.newBlob(Utilities.base64Decode(base64Video), mimeType, videoFileName);
          var videoFile = videoFolder.createFile(decodedVideoBlob);
          
          videoFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          
          var fileId = videoFile.getId();
          driveVideoUrl = videoFile.getUrl(); // Direct view in Google Drive web player
          driveDownloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;
          fileSizeKB = Math.round(decodedVideoBlob.getBytes().length / 1024) + " KB";
        } catch (vidErr) {
          driveVideoUrl = "Video Upload Error: " + vidErr.toString();
          driveDownloadUrl = "Error";
        }
      }

      // 2. Decode and Save Video Thumbnail (if provided)
      if (payload.thumbnail && payload.thumbnail.length > 50) {
        try {
          var base64Thumb = payload.thumbnail;
          if (base64Thumb.indexOf("base64,") !== -1) {
            base64Thumb = base64Thumb.split("base64,")[1];
          }
          var thumbFolder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
          var thumbFileName = "THUMB_" + videoId + "_" + Utilities.formatDate(now, timeZone, "yyyyMMdd_HHmmss") + ".jpg";
          var thumbBlob = Utilities.newBlob(Utilities.base64Decode(base64Thumb), "image/jpeg", thumbFileName);
          var thumbFile = thumbFolder.createFile(thumbBlob);
          thumbFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          thumbDirectUrl = "https://lh3.googleusercontent.com/d/" + thumbFile.getId();
        } catch (tErr) {
          thumbDirectUrl = payload.imageUrl || "Thumbnail Error";
        }
      } else if (payload.imageUrl) {
        thumbDirectUrl = payload.imageUrl;
      }

      // 3. Insert Row in Dedicated "Video Recordings" Sheet
      var videoSheet = getOrCreateVideoSheet();
      videoSheet.insertRowBefore(2);
      var videoRow = [
        videoId,
        dateStr,
        timeStr,
        durationStr,
        fileSizeKB,
        driveVideoUrl,
        driveDownloadUrl,
        triggerType,
        thumbDirectUrl,
        timestampIso
      ];
      videoSheet.getRange(2, 1, 1, videoRow.length).setValues([videoRow]);
      videoSheet.getRange(2, 1, 1, videoRow.length).setHorizontalAlignment("center");

      // Set Hyperlinks for effortless 1-click video playback inside Google Sheets
      if (driveVideoUrl.indexOf("http") === 0) {
        videoSheet.getRange(2, 6).setFormula('=HYPERLINK("' + driveVideoUrl + '", "▶️ Play Video")');
      }
      if (driveDownloadUrl.indexOf("http") === 0) {
        videoSheet.getRange(2, 7).setFormula('=HYPERLINK("' + driveDownloadUrl + '", "⬇️ Download")');
      }

      // 4. Also Insert into Unified "Visitor Logs" Sheet so it appears in the master history
      var logSheet = getOrCreateLogSheet();
      logSheet.insertRowBefore(2);
      var unifiedRow = [
        videoId,
        dateStr,
        timeStr,
        motionStatus,
        triggerType,
        thumbDirectUrl,
        driveVideoUrl,
        deviceStatus,
        timestampIso
      ];
      logSheet.getRange(2, 1, 1, unifiedRow.length).setValues([unifiedRow]);
      logSheet.getRange(2, 1, 1, unifiedRow.length).setHorizontalAlignment("center");
      if (driveVideoUrl.indexOf("http") === 0) {
        logSheet.getRange(2, 7).setFormula('=HYPERLINK("' + driveVideoUrl + '", "🎬 Watch Video")');
      }

      return createJsonResponse({
        status: "success",
        message: "Video recording successfully saved to Google Drive and logged in Google Sheets!",
        videoId: videoId,
        driveVideoUrl: driveVideoUrl,
        driveDownloadUrl: driveDownloadUrl,
        duration: durationStr,
        fileSize: fileSizeKB,
        directThumbnailUrl: thumbDirectUrl,
        timestamp: timestampIso
      });
    }

    // ================= ACTION 4: LOG VISITOR / CAPTURED PHOTO FRAME =================
    var logSheet = getOrCreateLogSheet();
    var dateStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd");
    var timeStr = Utilities.formatDate(now, timeZone, "hh:mm:ss a");

    var visitorId = payload.visitorId || payload.id || ("VIS-" + Math.floor(100000 + Math.random() * 900000));
    var motionStatus = payload.motionStatus || (payload.triggerType === "PIR Motion Sensor" ? "DETECTED" : "IDLE");
    var triggerType = payload.triggerType || "Manual Snapshot";
    var deviceStatus = payload.deviceStatus || "ONLINE";

    var driveViewUrl = "No Image";
    var directImageUrl = payload.imageUrl || "No Image";

    // Handle Base64 Image Upload to Google Drive
    if (payload.image && payload.image.length > 50) {
      try {
        var base64Data = payload.image;
        if (base64Data.indexOf("base64,") !== -1) {
          base64Data = base64Data.split("base64,")[1];
        }

        var folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
        var filename = visitorId + "_" + Utilities.formatDate(now, timeZone, "yyyyMMdd_HHmmss") + ".jpg";
        var decodedBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), "image/jpeg", filename);
        var file = folder.createFile(decodedBlob);
        
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        var fileId = file.getId();
        driveViewUrl = file.getUrl();
        directImageUrl = "https://lh3.googleusercontent.com/d/" + fileId;

        PropertiesService.getScriptProperties().setProperty("CAM_LATEST_FRAME", directImageUrl);
      } catch (imgErr) {
        driveViewUrl = "Upload Error: " + imgErr.toString();
        directImageUrl = "Upload Error";
      }
    }

    // Insert new record at Row 2 (Top of the sheet)
    logSheet.insertRowBefore(2);
    var newRowData = [
      visitorId,
      dateStr,
      timeStr,
      motionStatus,
      triggerType,
      directImageUrl,
      driveViewUrl,
      deviceStatus,
      timestampIso
    ];
    logSheet.getRange(2, 1, 1, newRowData.length).setValues([newRowData]);
    logSheet.getRange(2, 1, 1, newRowData.length).setHorizontalAlignment("center");
    if (driveViewUrl.indexOf("http") === 0) {
      logSheet.getRange(2, 7).setFormula('=HYPERLINK("' + driveViewUrl + '", "🖼️ View Photo")');
    }

    return createJsonResponse({
      status: "success",
      message: "Visitor photo event logged successfully to Google Sheets & Drive",
      visitorId: visitorId,
      date: dateStr,
      time: timeStr,
      triggerType: triggerType,
      motionStatus: motionStatus,
      directImageUrl: directImageUrl,
      driveViewUrl: driveViewUrl
    });

  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * Handle HTTP GET requests (Live Stream Info, History, Video Recordings, Ping check, Stats)
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "ping";

    // ================= 1. GET LIVE STREAM INFO =================
    if (action === "getLiveStream" || action === "getStreamUrl") {
      var props = PropertiesService.getScriptProperties();
      var camIp = props.getProperty("CAM_IP") || "";
      var streamUrl = props.getProperty("CAM_STREAM_URL") || "";
      var lastSeenStr = props.getProperty("CAM_LAST_SEEN") || "";
      var latestFrame = props.getProperty("CAM_LATEST_FRAME") || "";
      var deviceName = props.getProperty("CAM_NAME") || "ESP32-CAM Subsystem";

      var isOnline = false;
      var secondsAgo = -1;

      if (lastSeenStr) {
        var lastSeenDate = new Date(lastSeenStr);
        var now = new Date();
        secondsAgo = Math.round((now.getTime() - lastSeenDate.getTime()) / 1000);
        isOnline = secondsAgo >= 0 && secondsAgo <= 120;
      }

      return createJsonResponse({
        status: "success",
        online: isOnline,
        deviceIp: camIp,
        streamUrl: streamUrl,
        deviceName: deviceName,
        lastSeen: lastSeenStr,
        secondsAgo: secondsAgo,
        latestFrame: latestFrame
      });
    }

    // ================= 2. PING / HEALTH CHECK =================
    if (action === "ping" || action === "test") {
      var logSheet = getOrCreateLogSheet();
      var vidSheet = getOrCreateVideoSheet();
      return createJsonResponse({
        status: "online",
        message: "Smart Door Security Google Apps Script Backend is fully operational!",
        timestamp: new Date().toISOString(),
        timeZone: Session.getScriptTimeZone(),
        sheetName: logSheet.getName(),
        totalLogs: Math.max(0, logSheet.getLastRow() - 1),
        totalVideos: Math.max(0, vidSheet.getLastRow() - 1)
      });
    }

    // ================= 3. FETCH VISITOR HISTORY =================
    if (action === "getHistory") {
      var sheet = getOrCreateLogSheet();
      var lastRow = sheet.getLastRow();
      var records = [];

      if (lastRow > 1) {
        var values = sheet.getRange(2, 1, lastRow - 1, CONFIG.LOGS_HEADERS.length).getDisplayValues();
        for (var i = 0; i < values.length; i++) {
          var row = values[i];
          records.push({
            id: row[0],
            date: row[1],
            time: row[2],
            motionStatus: row[3],
            trigger: row[4],
            directImageUrl: row[5],
            driveViewUrl: row[6],
            imageUrl: row[5] !== "No Image" ? row[5] : (row[6] !== "No Image" ? row[6] : ""),
            deviceStatus: row[7],
            timestamp: row[8]
          });
        }
      }

      return createJsonResponse({
        status: "success",
        count: records.length,
        records: records
      });
    }

    // ================= 4. FETCH DEDICATED VIDEO RECORDINGS =================
    if (action === "getVideos" || action === "getVideoRecordings") {
      var vSheet = getOrCreateVideoSheet();
      var vLastRow = vSheet.getLastRow();
      var videos = [];

      if (vLastRow > 1) {
        var vValues = vSheet.getRange(2, 1, vLastRow - 1, CONFIG.VIDEO_HEADERS.length).getDisplayValues();
        for (var k = 0; k < vValues.length; k++) {
          var vRow = vValues[k];
          videos.push({
            id: vRow[0],
            date: vRow[1],
            time: vRow[2],
            duration: vRow[3],
            fileSize: vRow[4],
            drivePlayLink: vRow[5],
            downloadLink: vRow[6],
            trigger: vRow[7],
            thumbnail: vRow[8],
            timestamp: vRow[9]
          });
        }
      }

      return createJsonResponse({
        status: "success",
        count: videos.length,
        videos: videos
      });
    }

    // ================= 5. SYSTEM STATS =================
    if (action === "stats") {
      var logSheet = getOrCreateLogSheet();
      var vidSheet = getOrCreateVideoSheet();
      var lastRow = logSheet.getLastRow();
      var total = Math.max(0, lastRow - 1);
      var totalVideos = Math.max(0, vidSheet.getLastRow() - 1);
      var motionCount = 0;
      var doorbellCount = 0;
      var snapshotCount = 0;

      if (lastRow > 1) {
        var triggers = logSheet.getRange(2, 5, lastRow - 1, 1).getValues();
        for (var j = 0; j < triggers.length; j++) {
          var trig = String(triggers[j][0]).toLowerCase();
          if (trig.indexOf("motion") !== -1) motionCount++;
          else if (trig.indexOf("doorbell") !== -1) doorbellCount++;
          else snapshotCount++;
        }
      }

      var streamProps = PropertiesService.getScriptProperties();
      var isCamOnline = false;
      var camLastSeen = streamProps.getProperty("CAM_LAST_SEEN");
      if (camLastSeen) {
        var diff = (new Date().getTime() - new Date(camLastSeen).getTime()) / 1000;
        isCamOnline = diff <= 120;
      }

      return createJsonResponse({
        status: "success",
        stats: {
          totalVisitors: total,
          totalVideos: totalVideos,
          motionTriggers: motionCount,
          doorbellRings: doorbellCount,
          snapshots: snapshotCount,
          cameraOnline: isCamOnline,
          cameraIp: streamProps.getProperty("CAM_IP") || "Offline",
          streamUrl: streamProps.getProperty("CAM_STREAM_URL") || "",
          lastUpdated: new Date().toISOString()
        }
      });
    }

    // ================= 6. CLEAR HISTORY =================
    if (action === "clearHistory") {
      var logSheet = getOrCreateLogSheet();
      clearAllLogs(logSheet);
      var vidSheet = getOrCreateVideoSheet();
      clearAllLogs(vidSheet);
      return createJsonResponse({
        status: "success",
        message: "Visitor history and video recordings cleared successfully."
      });
    }

    // Default welcome
    return createJsonResponse({
      status: "online",
      message: "Smart Door Security API active. Actions: getLiveStream, getHistory, getVideos, ping, stats"
    });

  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

/**
 * Get or create the log sheet and enforce headers
 */
function getOrCreateLogSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.LOGS_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.getActiveSheet();
    sheet.setName(CONFIG.LOGS_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    setupSheetHeaders(sheet, CONFIG.LOGS_HEADERS);
  }

  return sheet;
}

/**
 * Get or create the dedicated Video Recordings sheet
 */
function getOrCreateVideoSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.VIDEO_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.VIDEO_SHEET_NAME);
    setupSheetHeaders(sheet, CONFIG.VIDEO_HEADERS);
  } else if (sheet.getLastRow() === 0) {
    setupSheetHeaders(sheet, CONFIG.VIDEO_HEADERS);
  }

  return sheet;
}

/**
 * Get or create the Live Stream Status sheet
 */
function getOrCreateStreamSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.STREAM_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.STREAM_SHEET_NAME);
    setupSheetHeaders(sheet, CONFIG.STREAM_HEADERS);
  } else if (sheet.getLastRow() === 0) {
    setupSheetHeaders(sheet, CONFIG.STREAM_HEADERS);
  }

  return sheet;
}

/**
 * Format headers with dark slate styling, freeze pane, and auto widths
 */
function setupSheetHeaders(sheet, headers) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#0f172a");
  headerRange.setFontColor("#00f2fe");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  headerRange.setFontFamily("Inter");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);

  for (var col = 1; col <= headers.length; col++) {
    sheet.autoResizeColumn(col);
  }
}

/**
 * Get or create Google Drive folder for camera captures or video recordings
 */
function getOrCreateDriveFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  var newFolder = DriveApp.createFolder(folderName);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * Clear data rows while preserving headers
 */
function clearAllLogs(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
}

/**
 * Helper to build JSON responses with CORS compliance
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Custom UI Menu added to Google Sheets on open
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("🛡️ Smart Door Security")
    .addItem("⚡ Format All Sheet Headers", "menuSetupAllHeaders")
    .addItem("🎥 Check Live Camera Status", "menuCheckCameraStatus")
    .addItem("🎬 Open Video Recordings Folder", "menuOpenVideoFolder")
    .addItem("📸 Add Test Video & Visitor Record", "menuAddTestRecord")
    .addItem("🗑️ Clear All Visitor Logs", "menuClearLogs")
    .addSeparator()
    .addItem("ℹ️ Deployment Guide", "menuShowHelp")
    .addToUi();
}

function menuSetupAllHeaders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = getOrCreateLogSheet();
  setupSheetHeaders(logSheet, CONFIG.LOGS_HEADERS);

  var videoSheet = getOrCreateVideoSheet();
  setupSheetHeaders(videoSheet, CONFIG.VIDEO_HEADERS);

  var streamSheet = getOrCreateStreamSheet();
  setupSheetHeaders(streamSheet, CONFIG.STREAM_HEADERS);

  SpreadsheetApp.getUi().alert("✅ All sheet headers (Visitor Logs, Video Recordings, Live Stream Status) formatted successfully with frozen headers!");
}

function menuOpenVideoFolder() {
  var folder = getOrCreateDriveFolder(CONFIG.DRIVE_VIDEO_FOLDER_NAME);
  SpreadsheetApp.getUi().alert("Google Drive Video Folder", "Your video recordings are stored at:\n\n" + folder.getUrl(), SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuCheckCameraStatus() {
  var props = PropertiesService.getScriptProperties();
  var ip = props.getProperty("CAM_IP") || "Not connected";
  var url = props.getProperty("CAM_STREAM_URL") || "N/A";
  var last = props.getProperty("CAM_LAST_SEEN") || "Never";

  var msg = "CAMERA LIVE STREAM STATUS:\n\n" +
    "Device IP: " + ip + "\n" +
    "Stream URL: " + url + "\n" +
    "Last Heartbeat: " + last;
  SpreadsheetApp.getUi().alert("Camera Status", msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuAddTestRecord() {
  var now = new Date();
  var timeZone = Session.getScriptTimeZone();
  var sheet = getOrCreateLogSheet();
  var vSheet = getOrCreateVideoSheet();
  
  var testId = "REC-" + Math.floor(100000 + Math.random() * 900000);
  var dateStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd");
  var timeStr = Utilities.formatDate(now, timeZone, "hh:mm:ss a");

  // Sample in Video Recordings
  vSheet.insertRowBefore(2);
  var sampleVideo = [
    testId,
    dateStr,
    timeStr,
    "12s",
    "1.4 MB",
    "https://drive.google.com",
    "https://drive.google.com",
    "Video Recording (12s)",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    now.toISOString()
  ];
  vSheet.getRange(2, 1, 1, sampleVideo.length).setValues([sampleVideo]);
  vSheet.getRange(2, 1, 1, sampleVideo.length).setHorizontalAlignment("center");
  vSheet.getRange(2, 6).setFormula('=HYPERLINK("https://drive.google.com", "▶️ Play Video")');
  vSheet.getRange(2, 7).setFormula('=HYPERLINK("https://drive.google.com", "⬇️ Download")');

  // Sample in Visitor Logs
  sheet.insertRowBefore(2);
  var sample = [
    testId,
    dateStr,
    timeStr,
    "DETECTED",
    "Video Recording (12s)",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    "https://drive.google.com",
    "ONLINE",
    now.toISOString()
  ];
  sheet.getRange(2, 1, 1, sample.length).setValues([sample]);
  sheet.getRange(2, 1, 1, sample.length).setHorizontalAlignment("center");
  sheet.getRange(2, 7).setFormula('=HYPERLINK("https://drive.google.com", "🎬 Watch Video")');
  
  SpreadsheetApp.getUi().alert("✅ Sample video record " + testId + " inserted in both 'Video Recordings' and 'Visitor Logs'!");
}

function menuClearLogs() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert("Confirm Clear", "Are you sure you want to clear all visitor log and video rows?", ui.ButtonSet.YES_NO);
  if (response == ui.Button.YES) {
    var sheet = getOrCreateLogSheet();
    clearAllLogs(sheet);
    var vSheet = getOrCreateVideoSheet();
    clearAllLogs(vSheet);
    ui.alert("✅ Log and video records cleared.");
  }
}

function menuShowHelp() {
  var ui = SpreadsheetApp.getUi();
  var msg = "DEPLOYMENT QUICK STEPS:\n\n" +
    "1. Click 'Deploy' (top right) -> 'New Deployment'\n" +
    "2. Select type 'Web app'\n" +
    "3. Set Execute as: 'Me'\n" +
    "4. Set Who has access: 'Anyone'\n" +
    "5. Click Deploy & Copy the Web app URL\n" +
    "6. Paste this URL in:\n" +
    "   - ESP32 Code: const char* GOOGLE_SCRIPT_URL = '...';\n" +
    "   - Website: 'Sheet Config' tab";
  ui.alert("Deployment Guide", msg, ui.ButtonSet.OK);
}
