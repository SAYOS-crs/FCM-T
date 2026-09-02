importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"
);

// Service Worker Lifecycle Management
self.addEventListener("install", (event) => {
  console.log("[SW] Installed. Activating immediately...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activated. Claiming clients...");
  event.waitUntil(self.clients.claim());
});

// IndexedDB Helper for Persisting Firebase Config across cold worker restarts
const DB_NAME = "fcm_kernel_sw_db";
const STORE_NAME = "sw_config";

function openConfigDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveConfigToStorage(config) {
  try {
    const db = await openConfigDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(config, "firebase_config");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[SW] Failed to save config to IndexedDB:", err);
  }
}

async function loadConfigFromStorage() {
  try {
    const db = await openConfigDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get("firebase_config");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[SW] Failed to load config from IndexedDB:", err);
    return null;
  }
}

let messaging = null;

// Initialize or Re-initialize Firebase in Service Worker
function initFirebaseConfig(config) {
  if (!config || !config.apiKey || !config.projectId) {
    return;
  }

  try {
    if (firebase.apps.length > 0) {
      // Clean up previous app if re-configuring
      try {
        firebase.app().delete();
      } catch (e) {
        // App delete may fail if in use, continue
      }
    }

    firebase.initializeApp(config);
    console.log(
      "[SW] Firebase initialized with dynamic config for project:",
      config.projectId
    );

    messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      console.log("[SW] Firebase onBackgroundMessage received:", payload);

      // Broadcast payload to all open tabs for live logging
      broadcastToClients(payload, "Firebase Background Listener");

      // Show system notification
      showNotificationFromPayload(payload);
    });
  } catch (err) {
    console.error("[SW] Error initializing Firebase in Service Worker:", err);
  }
}

// Auto-restore configuration on worker thread startup
loadConfigFromStorage().then((savedConfig) => {
  if (savedConfig) {
    console.log("[SW] Restored config from IndexedDB on startup:", savedConfig.projectId);
    initFirebaseConfig(savedConfig);
  }
});

// Broadcast received payload to all active client windows
async function broadcastToClients(payload, source = "Background") {
  try {
    const clients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    clients.forEach((client) => {
      client.postMessage({
        type: "BACKGROUND_MESSAGE",
        source: source,
        payload: payload,
      });
    });
  } catch (err) {
    console.error("[SW] Error broadcasting message to clients:", err);
  }
}

// Display System Notification Banner
async function showNotificationFromPayload(payload) {
  try {
    if (!payload) return;

    const notif = payload.notification || {};
    const data = payload.data || {};

    const title = notif.title || data.title || "🔔 Push Notification";
    const body =
      notif.body ||
      data.body ||
      (data && Object.keys(data).length > 0
        ? JSON.stringify(data)
        : "New message received.");
    const icon = notif.icon || data.icon || undefined;
    const image = notif.image || data.image || undefined;

    const options = {
      body: body,
      icon: icon,
      image: image,
      data: payload,
      badge: icon,
      vibrate: [200, 100, 200],
      tag: payload.collapseKey || "fcm-notification-" + Date.now(),
      renotify: true,
    };

    return await self.registration.showNotification(title, options);
  } catch (err) {
    console.error("[SW] Error displaying notification in SW:", err);
  }
}

// Universal Web Push Event Listener (Catches both FCM & standard Push payloads)
self.addEventListener("push", (event) => {
  console.log("[SW] Universal Push Event received by Service Worker.");

  event.waitUntil(
    (async () => {
      let payload = null;
      if (event.data) {
        try {
          payload = event.data.json();
        } catch (e) {
          try {
            payload = { text: event.data.text() };
          } catch (textErr) {
            payload = { raw: "Push event data received" };
          }
        }
      } else {
        payload = { notification: { title: "Push Notification", body: "Empty push event received" } };
      }

      console.log("[SW] Push Event payload:", payload);

      // Ensure Firebase config is restored from IndexedDB if not yet initialized
      if (!firebase.apps.length) {
        try {
          const storedConfig = await loadConfigFromStorage();
          if (storedConfig) {
            initFirebaseConfig(storedConfig);
          }
        } catch (storageErr) {
          console.warn("[SW] Could not read stored config during push:", storageErr);
        }
      }

      // Broadcast to UI tabs for live terminal logging
      await broadcastToClients(payload, "Service Worker Push Event");

      // Ensure a system notification is shown
      await showNotificationFromPayload(payload);
    })()
  );
});

// Listen for Main Thread Messages (Config Dispatch & Commands)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SET_FIREBASE_CONFIG") {
    console.log("[SW] Received SET_FIREBASE_CONFIG message.");
    saveConfigToStorage(event.data.config);
    initFirebaseConfig(event.data.config);
  } else if (event.data && event.data.type === "TEST_LOCAL_NOTIFICATION") {
    showNotificationFromPayload({
      notification: {
        title: event.data.title || "🧪 Test Notification",
        body: event.data.body || "Local test notification triggered successfully!",
      },
      data: { source: "local_test", timestamp: new Date().toISOString() },
    });
  }
});

// Handle Notification Click to Focus or Open the Test Tool
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow("./");
        }
      })
  );
});
