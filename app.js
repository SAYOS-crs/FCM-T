import {
  initializeApp,
  getApps,
  deleteApp,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getMessaging,
  getToken,
  onMessage,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js";

// Global App State
let currentApp = null;
let currentMessaging = null;
let activeToken = "";

// Default Demo Preset Values
const DEMO_PRESET = {
  apiKey: "<Set your api key here>",
  authDomain: "<Set you Domain>.firebaseapp.com",
  projectId: "<project_id>",
  storageBucket: "<project_id>.firebasestorage.app",
  messagingSenderId: "<sender_id>",
  appId: "<app_id>",
  measurementId: "G-<...>",
  vapidKey: "<vap id key>",
  apiEndpoint: "<your backend api endpint>",
};

// DOM References
const dom = {
  apiKey: document.getElementById("cfg-apiKey"),
  authDomain: document.getElementById("cfg-authDomain"),
  projectId: document.getElementById("cfg-projectId"),
  storageBucket: document.getElementById("cfg-storageBucket"),
  messagingSenderId: document.getElementById("cfg-messagingSenderId"),
  appId: document.getElementById("cfg-appId"),
  measurementId: document.getElementById("cfg-measurementId"),
  vapidKey: document.getElementById("cfg-vapidKey"),
  apiEndpoint: document.getElementById("cfg-apiEndpoint"),
  jsonPaste: document.getElementById("json-paste"),
  btnParseJson: document.getElementById("btn-parse-json"),
  btnLoadPreset: document.getElementById("btn-load-preset"),
  btnSaveConfig: document.getElementById("btn-save-config"),
  btnGetToken: document.getElementById("btn-get-token"),
  btnSendEndpoint: document.getElementById("btn-send-endpoint"),
  btnClearLogs: document.getElementById("btn-clear-logs"),
  btnCopyToken: document.getElementById("btn-copy-token"),
  tokenOutput: document.getElementById("token-output"),
  terminalLogs: document.getElementById("terminal-logs"),
  swStatusIndicator: document.getElementById("sw-status-indicator"),
  swStatusText: document.getElementById("sw-status-text"),
};

/**
 * Enhanced Linux Terminal Logging Utility
 */
function sysLog(message, level = "INFO", details = null) {
  const now = new Date();
  const timeStr = now.toTimeString().split(" ")[0] + "." + String(now.getMilliseconds()).padStart(3, "0");

  const entry = document.createElement("div");
  entry.className = "log-entry";

  let tagClass = "tag-info";
  if (level === "SUCCESS") tagClass = "tag-success";
  if (level === "WARN") tagClass = "tag-warn";
  if (level === "ERROR") tagClass = "tag-error";
  if (level === "HTTP POST" || level === "API") tagClass = "tag-api";

  let html = `<span class="log-time">[${timeStr}]</span>`;
  html += `<span class="log-tag ${tagClass}">[${level}]</span>`;
  html += `<span class="log-msg">${escapeHtml(message)}`;

  if (details) {
    const jsonStr = typeof details === "string" ? details : JSON.stringify(details, null, 2);
    html += `<pre>${escapeHtml(jsonStr)}</pre>`;
  }

  html += `</span>`;
  entry.innerHTML = html;

  dom.terminalLogs.appendChild(entry);
  dom.terminalLogs.scrollTop = dom.terminalLogs.scrollHeight;

  console.log(`[${level}] ${message}`, details || "");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Update Service Worker Status Badge
 */
function updateSwStatus(status, text) {
  dom.swStatusIndicator.className = `status-indicator ${status}`;
  dom.swStatusText.textContent = text;
}

/**
 * Extract Form Input Configuration Object
 */
function getFormConfig() {
  return {
    apiKey: dom.apiKey.value.trim(),
    authDomain: dom.authDomain.value.trim(),
    projectId: dom.projectId.value.trim(),
    storageBucket: dom.storageBucket.value.trim(),
    messagingSenderId: dom.messagingSenderId.value.trim(),
    appId: dom.appId.value.trim(),
    measurementId: dom.measurementId.value.trim(),
  };
}

/**
 * Fill Form Fields from Config Object
 */
function populateFormFields(cfg, vapid = "", endpoint = "") {
  if (cfg.apiKey !== undefined) dom.apiKey.value = cfg.apiKey;
  if (cfg.authDomain !== undefined) dom.authDomain.value = cfg.authDomain;
  if (cfg.projectId !== undefined) dom.projectId.value = cfg.projectId;
  if (cfg.storageBucket !== undefined) dom.storageBucket.value = cfg.storageBucket;
  if (cfg.messagingSenderId !== undefined) dom.messagingSenderId.value = cfg.messagingSenderId;
  if (cfg.appId !== undefined) dom.appId.value = cfg.appId;
  if (cfg.measurementId !== undefined) dom.measurementId.value = cfg.measurementId;
  if (vapid) dom.vapidKey.value = vapid;
  if (endpoint) dom.apiEndpoint.value = endpoint;
}

/**
 * Save / Load LocalStorage
 */
function saveToLocalStorage() {
  const config = getFormConfig();
  const vapidKey = dom.vapidKey.value.trim();
  const apiEndpoint = dom.apiEndpoint.value.trim();

  localStorage.setItem("fcm_config", JSON.stringify(config));
  localStorage.setItem("fcm_vapid_key", vapidKey);
  localStorage.setItem("fcm_api_endpoint", apiEndpoint);
  sysLog("Configuration saved to browser LocalStorage.", "SUCCESS");
}

function loadFromLocalStorage() {
  const savedCfg = localStorage.getItem("fcm_config");
  const savedVapid = localStorage.getItem("fcm_vapid_key");
  const savedEndpoint = localStorage.getItem("fcm_api_endpoint");

  if (savedCfg) {
    try {
      const parsed = JSON.parse(savedCfg);
      populateFormFields(parsed, savedVapid || "", savedEndpoint || "");
      sysLog("Restored configuration from LocalStorage.", "INFO");
      return true;
    } catch (e) {
      sysLog("Failed to parse saved config from LocalStorage.", "WARN");
    }
  }
  return false;
}

/**
 * Parse Quick JSON / JS Object Paste
 */
function parseQuickPasteJSON() {
  const rawText = dom.jsonPaste.value.trim();
  if (!rawText) {
    sysLog("Quick Paste box is empty.", "WARN");
    return;
  }

  try {
    // Convert JS Object format to valid JSON string if needed (quote keys)
    let formattedStr = rawText
      .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
      .replace(/'/g, '"');
    
    const parsed = JSON.parse(formattedStr);
    populateFormFields(parsed);
    sysLog("Successfully auto-filled form fields from parsed object!", "SUCCESS", parsed);
  } catch (err) {
    sysLog("Could not parse object string. Please check format.", "ERROR", err.message);
  }
}

/**
 * Dynamic Firebase Initialization
 */
async function initializeFirebaseClient(config) {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    sysLog("Cleaning up previous Firebase App instance...", "INFO");
    await deleteApp(existingApps[0]);
  }

  currentApp = initializeApp(config);
  currentMessaging = getMessaging(currentApp);

  // Foreground Message Handler
  onMessage(currentMessaging, (payload) => {
    sysLog("⚡ Foreground Message Received!", "SUCCESS", payload);
  });

  sysLog(`Initialized Firebase Client App [Project: ${config.projectId}]`, "SUCCESS");
  return currentMessaging;
}

/**
 * Register & Sync Service Worker with Dynamic Config
 */
async function syncServiceWorker(config) {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Workers are not supported in this browser context.");
  }

  sysLog("Registering Service Worker (firebase-messaging-sw.js)...", "INFO");
  const registration = await navigator.serviceWorker.register("./firebase-messaging-sw.js");
  const readyReg = await navigator.serviceWorker.ready;

  updateSwStatus("online", "SW: Active & Ready");
  sysLog("Service Worker active and ready.", "SUCCESS");

  // Post dynamic config to SW
  if (readyReg.active) {
    readyReg.active.postMessage({
      type: "SET_FIREBASE_CONFIG",
      config: config,
    });
    sysLog("Dispatched dynamic firebaseConfig to Service Worker via postMessage.", "INFO");
  }

  return readyReg;
}

/**
 * Primary Action: Fetch FCM Registration Token
 */
async function handleGetFcmToken() {
  const config = getFormConfig();
  const vapidKey = dom.vapidKey.value.trim();

  // Validate required inputs
  if (!config.apiKey || !config.projectId || !config.messagingSenderId || !config.appId) {
    sysLog("Missing required Firebase Config parameters (apiKey, projectId, messagingSenderId, appId).", "ERROR");
    alert("Please fill in all required Firebase configuration fields.");
    return;
  }

  if (!vapidKey) {
    sysLog("Web Push VAPID Key is missing.", "ERROR");
    alert("Please provide a valid Web Push VAPID key.");
    return;
  }

  try {
    sysLog("Requesting browser Notification permission...", "INFO");
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      sysLog(`Notification permission denied or dismissed. Permission state: '${permission}'`, "WARN");
      updateSwStatus("warn", `Permission: ${permission}`);
      return;
    }

    sysLog("Notification permission granted!", "SUCCESS");

    // Initialize Client & SW
    const messaging = await initializeFirebaseClient(config);
    const swRegistration = await syncServiceWorker(config);

    sysLog("Requesting FCM Registration Token from Firebase Cloud Messaging...", "INFO");
    const token = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      activeToken = token;
      dom.tokenOutput.textContent = token;
      sysLog("Successfully acquired FCM Registration Token!", "SUCCESS");
      sysLog(`Token: ${token}`, "INFO");

      // Save valid settings
      saveToLocalStorage();

      // If API Endpoint is specified, automatically send or log prompt
      const targetEndpoint = dom.apiEndpoint.value.trim();
      if (targetEndpoint) {
        sysLog(`Auto-triggering token dispatch to API Endpoint: ${targetEndpoint}`, "INFO");
        await handleSendTokenToEndpoint();
      }
    } else {
      dom.tokenOutput.textContent = "-- Token Generation Failed --";
      sysLog("No registration token available. Check FCM setup and VAPID key.", "ERROR");
    }
  } catch (error) {
    updateSwStatus("error", "SW Error");
    sysLog(`Error fetching FCM token: ${error.message}`, "ERROR", error.stack);
  }
}

/**
 * Secondary Action: POST Token to Target API Endpoint
 */
async function handleSendTokenToEndpoint() {
  const endpoint = dom.apiEndpoint.value.trim();
  if (!endpoint) {
    sysLog("Target API Endpoint URL is required to send token.", "WARN");
    alert("Please enter a Target API Endpoint URL first.");
    return;
  }

  if (!activeToken) {
    sysLog("No active FCM token available. Generate a token first.", "WARN");
    alert("Please click 'Get FCM Token' first to generate a valid token.");
    return;
  }

  const config = getFormConfig();
  const payload = {
    token: activeToken,
    projectId: config.projectId,
    messagingSenderId: config.messagingSenderId,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  };

  sysLog(`Initiating HTTP POST request to API Endpoint: ${endpoint}`, "HTTP POST", payload);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-FCM-Client": "FCM-Tester-Linux",
      },
      body: JSON.stringify(payload),
    });

    const statusText = `${response.status} ${response.statusText}`;
    let resData;
    try {
      resData = await response.json();
    } catch (e) {
      resData = await response.text();
    }

    if (response.ok) {
      sysLog(`API Endpoint responded successfully [${statusText}]`, "SUCCESS", resData);
    } else {
      sysLog(`API Endpoint returned non-2xx status [${statusText}]`, "WARN", resData);
    }
  } catch (err) {
    sysLog(`Failed to POST token to API Endpoint: ${err.message}`, "ERROR", err);
  }
}

/**
 * Event Listeners & Bootstrapping
 */
function init() {
  sysLog("FCM Tester [Linux Kernel Edition v2.0] Initialized.", "INFO");
  sysLog("System ready. Enter Firebase Credentials & VAPID key or load defaults.", "INFO");

  // Restore saved config if available, otherwise load preset defaults
  const loaded = loadFromLocalStorage();
  if (!loaded) {
    populateFormFields(DEMO_PRESET, DEMO_PRESET.vapidKey, DEMO_PRESET.apiEndpoint);
    sysLog("Loaded default demo project settings.", "INFO");
  }

  // Button Actions
  dom.btnGetToken.addEventListener("click", handleGetFcmToken);
  dom.btnSendEndpoint.addEventListener("click", handleSendTokenToEndpoint);
  dom.btnParseJson.addEventListener("click", parseQuickPasteJSON);

  dom.btnLoadPreset.addEventListener("click", () => {
    populateFormFields(DEMO_PRESET, DEMO_PRESET.vapidKey, DEMO_PRESET.apiEndpoint);
    sysLog("Reset form fields to Demo Preset values.", "INFO");
  });

  dom.btnSaveConfig.addEventListener("click", saveToLocalStorage);

  dom.btnClearLogs.addEventListener("click", () => {
    dom.terminalLogs.innerHTML = "";
    sysLog("Terminal log buffer cleared.", "INFO");
  });

  dom.btnCopyToken.addEventListener("click", () => {
    if (!activeToken || activeToken.startsWith("--")) {
      alert("No token to copy yet.");
      return;
    }
    navigator.clipboard.writeText(activeToken).then(() => {
      sysLog("FCM Token copied to clipboard!", "SUCCESS");
    });
  });

  // Listen for messages forwarded from Service Worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "BACKGROUND_MESSAGE") {
        sysLog("🔔 Background Notification Received by Service Worker!", "SUCCESS", event.data.payload);
      }
    });
  }
}

// Run Initialization
document.addEventListener("DOMContentLoaded", init);
