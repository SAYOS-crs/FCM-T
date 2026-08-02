importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"
);

let messaging = null;

function initFirebaseConfig(config) {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
      console.log("[SW] Firebase initialized with dynamic config for project:", config.projectId);
    }
    if (!messaging) {
      messaging = firebase.messaging();
      messaging.onBackgroundMessage((payload) => {
        console.log("[SW] Background message received:", payload);

        // Broadcast event to all open browser windows for UI terminal logging
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "BACKGROUND_MESSAGE",
              payload: payload,
            });
          });
        });

        // Display browser notification if notification field exists
        if (payload.notification) {
          const title = payload.notification.title || "FCM Notification";
          const options = {
            body: payload.notification.body || "",
            icon: payload.notification.icon || "",
            data: payload.data || {},
          };
          self.registration.showNotification(title, options);
        }
      });
    }
  } catch (err) {
    console.error("[SW] Error initializing Firebase in Service Worker:", err);
  }
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SET_FIREBASE_CONFIG") {
    initFirebaseConfig(event.data.config);
  }
});
