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
  apiEndpoint: "https://httpbin.org/post",
  apiAuthToken: "",
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
  apiAuthToken: document.getElementById("cfg-apiAuthToken"),
  jsonPaste: document.getElementById("json-paste"),
  btnParseJson: document.getElementById("btn-parse-json"),
  btnLoadPreset: document.getElementById("btn-load-preset"),
  btnSaveConfig: document.getElementById("btn-save-config"),
  btnGetToken: document.getElementById("btn-get-token"),
  btnSendEndpoint: document.getElementById("btn-send-endpoint"),
  btnTestNotif: document.getElementById("btn-test-notif"),
  btnClearLogs: document.getElementById("btn-clear-logs"),
  btnCopyToken: document.getElementById("btn-copy-token"),
  tokenOutput: document.getElementById("token-output"),
  terminalLogs: document.getElementById("terminal-logs"),
  swStatusIndicator: document.getElementById("sw-status-indicator"),
  swStatusText: document.getElementById("sw-status-text"),
};

/**
 * Enhanced Console Logging Utility
 */
function sysLog(message, level = "INFO", details = null) {
  const now = new Date();
  const timeStr =
    now.toTimeString().split(" ")[0] +
    "." +
    String(now.getMilliseconds()).padStart(3, "0");

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
    const jsonStr =
      typeof details === "string" ? details : JSON.stringify(details, null, 2);
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
    apiAuthToken: dom.apiAuthToken ? dom.apiAuthToken.value.trim() : "",
  };
}

/**
 * Fill Form Fields from Config Object
 */
function populateFormFields(cfg, vapid = "", endpoint = "", authToken = "") {
  if (cfg.apiKey !== undefined) dom.apiKey.value = cfg.apiKey;
  if (cfg.authDomain !== undefined) dom.authDomain.value = cfg.authDomain;
  if (cfg.projectId !== undefined) dom.projectId.value = cfg.projectId;
  if (cfg.storageBucket !== undefined)
    dom.storageBucket.value = cfg.storageBucket;
  if (cfg.messagingSenderId !== undefined)
    dom.messagingSenderId.value = cfg.messagingSenderId;
  if (cfg.appId !== undefined) dom.appId.value = cfg.appId;
  if (cfg.measurementId !== undefined)
    dom.measurementId.value = cfg.measurementId;
  if (vapid !== undefined && vapid !== null) dom.vapidKey.value = vapid;
  if (endpoint !== undefined && endpoint !== null) dom.apiEndpoint.value = endpoint;
  if (authToken !== undefined && authToken !== null && authToken !== "") {
    dom.apiAuthToken.value = authToken;
  } else if (cfg.apiAuthToken !== undefined) {
    dom.apiAuthToken.value = cfg.apiAuthToken;
  }
}

/**
 * Save / Load LocalStorage
 */
function saveToLocalStorage() {
  const config = getFormConfig();
  const vapidKey = dom.vapidKey.value.trim();
  const apiEndpoint = dom.apiEndpoint.value.trim();
  const apiAuthToken = dom.apiAuthToken.value.trim();

  localStorage.setItem("fcm_config", JSON.stringify(config));
  localStorage.setItem("fcm_vapid_key", vapidKey);
  localStorage.setItem("fcm_api_endpoint", apiEndpoint);
  localStorage.setItem("fcm_api_auth_token", apiAuthToken);
  sysLog("Configuration saved to browser LocalStorage.", "SUCCESS");
}

function loadFromLocalStorage() {
  const savedCfg = localStorage.getItem("fcm_config");
  const savedVapid = localStorage.getItem("fcm_vapid_key");
  const savedEndpoint = localStorage.getItem("fcm_api_endpoint");
  const savedAuthToken = localStorage.getItem("fcm_api_auth_token");

  if (savedCfg) {
    try {
      const parsed = JSON.parse(savedCfg);
      const authToken = savedAuthToken || parsed.apiAuthToken || "";
      populateFormFields(
        parsed,
        savedVapid || "",
        savedEndpoint || "",
        authToken,
      );
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
    // Extract everything between first { and last }
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("No valid JSON / JS object '{ ... }' found in input.");
    }
    const jsonBlock = match[0];

    let parsed = null;
    // 1. Try standard JSON.parse first
    try {
      parsed = JSON.parse(jsonBlock);
    } catch (jsonErr) {
      // 2. Try evaluating as JS object expression (handles unquoted keys, single quotes, trailing commas, etc.)
      try {
        parsed = new Function(`return (${jsonBlock});`)();
      } catch (evalErr) {
        // 3. Fallback: sanitize JS object to JSON string
        let sanitized = jsonBlock
          .replace(/,\s*([\}\]])/g, "$1") // Remove trailing commas
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":') // Quote unquoted keys
          .replace(/'/g, '"'); // Convert single quotes to double quotes
        parsed = JSON.parse(sanitized);
      }
    }

    if (parsed && typeof parsed === "object") {
      populateFormFields(parsed);
      sysLog(
        "Successfully auto-filled form fields from parsed object!",
        "SUCCESS",
        parsed,
      );
    } else {
      throw new Error("Parsed result is not a valid object.");
    }
  } catch (err) {
    sysLog(
      "Could not parse object string. Please check format.",
      "ERROR",
      err.message,
    );
  }
}

/**
 * Trigger Visual Desktop Notification (for foreground / active tabs)
 */
function displayVisualNotification(payload, source = "Foreground") {
  if (!payload) return;
  const notif = payload.notification || {};
  const data = payload.data || {};

  const title = notif.title || data.title || `🔔 ${source} Notification`;
  const body =
    notif.body ||
    data.body ||
    (data && Object.keys(data).length > 0
      ? JSON.stringify(data)
      : "Push notification received.");
  const icon = notif.icon || data.icon || undefined;

  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      const n = new Notification(title, {
        body: body,
        icon: icon,
        data: payload,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (err) {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body: body,
            icon: icon,
            data: payload,
          });
        });
      }
    }
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
    sysLog("Foreground Message Received", "SUCCESS", payload);
    displayVisualNotification(payload, "Foreground");
  });

  sysLog(
    `Initialized Firebase Client App [Project: ${config.projectId}]`,
    "SUCCESS",
  );
  return currentMessaging;
}

/**
 * Register & Sync Service Worker with Dynamic Config
 */
async function syncServiceWorker(config) {
  if (!("serviceWorker" in navigator)) {
    throw new Error(
      "Service Workers are not supported in this browser context.",
    );
  }

  sysLog("Registering Service Worker (firebase-messaging-sw.js)...", "INFO");
  const registration = await navigator.serviceWorker.register(
    "./firebase-messaging-sw.js",
  );

  try {
    await registration.update();
  } catch (e) {
    // Ignore update check failures
  }

  const readyReg = await navigator.serviceWorker.ready;

  updateSwStatus("online", "SW: Active & Ready");
  sysLog("Service Worker active and ready.", "SUCCESS");

  // Post dynamic config to active SW and controlling worker
  const swTarget = readyReg.active || navigator.serviceWorker.controller;
  if (swTarget) {
    swTarget.postMessage({
      type: "SET_FIREBASE_CONFIG",
      config: config,
    });
    sysLog(
      "Dispatched dynamic firebaseConfig to Service Worker via postMessage.",
      "INFO",
    );
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
  if (
    !config.apiKey ||
    !config.projectId ||
    !config.messagingSenderId ||
    !config.appId
  ) {
    sysLog(
      "Missing required Firebase Config parameters (apiKey, projectId, messagingSenderId, appId).",
      "ERROR",
    );
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
      sysLog(
        `Notification permission denied or dismissed. Permission state: '${permission}'`,
        "WARN",
      );
      updateSwStatus("warn", `Permission: ${permission}`);
      return;
    }

    sysLog("Notification permission granted!", "SUCCESS");

    // Initialize Client & SW
    const messaging = await initializeFirebaseClient(config);
    const swRegistration = await syncServiceWorker(config);

    sysLog(
      "Requesting FCM Registration Token from Firebase Cloud Messaging...",
      "INFO",
    );
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
        sysLog(
          `Auto-triggering token dispatch to API Endpoint: ${targetEndpoint}`,
          "INFO",
        );
        await handleSendTokenToEndpoint();
      }
    } else {
      dom.tokenOutput.textContent = "-- Token Generation Failed --";
      sysLog(
        "No registration token available. Check FCM setup and VAPID key.",
        "ERROR",
      );
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

  const rawAuth = dom.apiAuthToken ? dom.apiAuthToken.value.trim() : "";
  const headers = {
    "Content-Type": "application/json",
    "X-FCM-Client": "FCM-Tester-Linux",
  };

  if (rawAuth) {
    const formattedAuth = rawAuth.toLowerCase().startsWith("user ")
      ? rawAuth
      : `User ${rawAuth}`;
    headers["Authorization"] = formattedAuth;
  }

  const payload = {
    token: activeToken,
  };

  sysLog(
    `Initiating HTTP POST request to API Endpoint: ${endpoint}`,
    "HTTP POST",
    {
      endpoint,
      headers,
      payload,
    },
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: headers,
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
      sysLog(
        `API Endpoint responded successfully [${statusText}]`,
        "SUCCESS",
        resData,
      );
    } else {
      sysLog(
        `API Endpoint returned non-2xx status [${statusText}]`,
        "WARN",
        resData,
      );
    }
  } catch (err) {
    sysLog(
      `Failed to POST token to API Endpoint: ${err.message}`,
      "ERROR",
      err,
    );
  }
}

/**
 * Test Local Browser & Service Worker Notification
 */
async function handleTestLocalNotification() {
  if (!("Notification" in window)) {
    sysLog("Notifications are not supported in this browser.", "ERROR");
    alert("Notifications are not supported in your browser.");
    return;
  }

  let permission = Notification.permission;
  if (permission !== "granted") {
    sysLog("Requesting browser Notification permission...", "INFO");
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    sysLog(
      `Cannot display test notification: Permission is '${permission}'`,
      "WARN",
    );
    alert(
      `Please enable notification permissions in your browser address bar/settings (currently '${permission}').`,
    );
    return;
  }

  const testPayload = {
    notification: {
      title: "🐧 FCM-Kernel Notification Test",
      body: "Notification system is working! You will receive messages from backend.",
    },
    data: {
      source: "local_test_button",
      timestamp: new Date().toISOString(),
    },
  };

  sysLog("Triggering local test notification...", "SUCCESS", testPayload);
  displayVisualNotification(testPayload, "Local Test");

  // Also trigger Service Worker test notification if SW is available
  if ("serviceWorker" in navigator) {
    try {
      const readyReg = await navigator.serviceWorker.ready;
      const swTarget = readyReg.active || navigator.serviceWorker.controller;
      if (swTarget) {
        swTarget.postMessage({
          type: "TEST_LOCAL_NOTIFICATION",
          title: "🐧 FCM-Kernel (SW Test)",
          body: "Service Worker notification display verified!",
        });
      }
    } catch (e) {
      // SW test optional
    }
  }
}

/**
 * Event Listeners & Bootstrapping
 */
function init() {
  sysLog("FCM Push Tester [Vercel Edition] Initialized.", "INFO");
  sysLog(
    "System ready. Enter Firebase Credentials & VAPID key or load defaults.",
    "INFO",
  );

  // Restore saved config if available, otherwise load preset defaults
  const loaded = loadFromLocalStorage();
  if (!loaded) {
    populateFormFields(
      DEMO_PRESET,
      DEMO_PRESET.vapidKey,
      DEMO_PRESET.apiEndpoint,
      DEMO_PRESET.apiAuthToken,
    );
    sysLog("Loaded default demo project settings.", "INFO");
  }

  // Auto-arm listeners if saved config and granted permissions exist
  const currentConfig = getFormConfig();
  if (
    currentConfig.apiKey &&
    !currentConfig.apiKey.startsWith("<") &&
    currentConfig.projectId &&
    !currentConfig.projectId.startsWith("<")
  ) {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      sysLog("Notification permission is granted. Auto-arming listeners...", "INFO");
      initializeFirebaseClient(currentConfig)
        .then(() => syncServiceWorker(currentConfig))
        .then(() => {
          sysLog(
            "Push listeners armed and active in foreground & background.",
            "SUCCESS",
          );
        })
        .catch((err) => {
          sysLog(`Auto-arm notice: ${err.message}`, "WARN");
        });
    } else if (typeof Notification !== "undefined") {
      updateSwStatus(
        Notification.permission === "denied" ? "error" : "warn",
        `Permission: ${Notification.permission}`,
      );
    }
  }

  // Button Actions
  dom.btnGetToken.addEventListener("click", handleGetFcmToken);
  dom.btnSendEndpoint.addEventListener("click", handleSendTokenToEndpoint);
  if (dom.btnTestNotif) {
    dom.btnTestNotif.addEventListener("click", handleTestLocalNotification);
  }
  dom.btnParseJson.addEventListener("click", parseQuickPasteJSON);

  dom.btnLoadPreset.addEventListener("click", () => {
    populateFormFields(
      DEMO_PRESET,
      DEMO_PRESET.vapidKey,
      DEMO_PRESET.apiEndpoint,
      DEMO_PRESET.apiAuthToken,
    );
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
        const src = event.data.source || "Service Worker";
        sysLog(
          `Background Notification Received [${src}]`,
          "SUCCESS",
          event.data.payload,
        );
      }
    });
  }
}

// Run Initialization
document.addEventListener("DOMContentLoaded", init);
