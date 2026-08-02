# 🐧 FCM-Kernel (Firebase Cloud Messaging Tester)

> A sleek, Linux-terminal-styled Web Push & Firebase Cloud Messaging (FCM) testing tool for developers.

![FCM-Kernel Terminal UI](https://img.shields.io/badge/UI-Linux%20Terminal-00ff9d?style=for-the-badge)
![Firebase](https://img.shields.io/badge/Firebase-v10%20Web%20SDK-ffca28?style=for-the-badge&logo=firebase)
![License](https://img.shields.io/badge/License-MIT-38bdf8?style=for-the-badge)

**FCM-Kernel** allows developers to quickly test Firebase Cloud Messaging push notifications, generate Web Push FCM tokens dynamically using custom Firebase credentials and VAPID keys, and verify token registration by dispatching payloads directly to custom backend API endpoints.

---

## ✨ Features

- ⚙️ **Dynamic Firebase Configuration**: Input or quick-paste any Firebase JS config object/JSON on the fly without modifying source code.
- 🔑 **Custom VAPID Key Support**: Test Web Push FCM token generation across different project environments.
- 🌐 **Target API Endpoint Dispatch**: Send generated FCM registration tokens to your backend API via HTTP POST with full response status and payload logging.
- 🐧 **Linux Terminal UI**: Sleek, developer-focused terminal interface featuring dark charcoal themes, neon green accents, and high-contrast monospace code styling.
- 📜 **Real-Time System Log Stream**: High-precision timestamped logs (`[HH:MM:SS.mmm]`) for Service Worker lifecycle events, token generation, foreground notifications, and HTTP API debugging.
- 🔔 **Background Notification Inspector**: Relays background push notifications caught by `firebase-messaging-sw.js` directly to the live terminal log stream.
- 💾 **LocalStorage Auto-Save**: Preserves your credentials locally so you don't lose configuration on browser refresh.
- 📋 **One-Click Token Copying**: Instant clipboard copy button for FCM registration tokens.

---

## 📂 Project Structure

```text
.
├── index.html               # Main Linux terminal UI structure & input forms
├── styles.css               # Linux code-style design system & CSS variables
├── app.js                   # Client logic, FCM dynamic initialization & logger
├── firebase-messaging-sw.js # Service worker for background push notifications
└── README.md                # Project documentation
```

---

## 🚀 Quick Start / Local Setup

Because Web Push Service Workers and ES modules require an HTTP/HTTPS context (they cannot run directly via `file://`), run a simple local web server:

### Option A: Using Node.js (`npx`)
```bash
# Serve current directory on http://localhost:3000
npx serve .
```

### Option B: Using Python
```bash
# Serve current directory on http://localhost:8000
python3 -m http.server 8000
```

Open `http://localhost:8000` (or `http://localhost:3000`) in your browser.

---

## 📖 How to Use

1. **Configure Firebase Credentials**:
   - Paste your raw Firebase configuration object into the **Quick Paste** box and click **⚡ Auto-fill Fields**, or enter `apiKey`, `projectId`, `messagingSenderId`, `appId`, etc., manually into the input fields.
2. **Enter VAPID Key**:
   - Provide your Web Push VAPID key (found in Firebase Console > Project Settings > Cloud Messaging > Web Push certificates).
3. **Set Target API Endpoint (Optional)**:
   - Enter your backend API URL (e.g., `https://api.yourdomain.com/v1/fcm/register`) to test sending tokens to your server.
4. **Get FCM Token**:
   - Click **▶ Get FCM Token**. Grant browser notification permissions when prompted.
   - The generated FCM Registration Token will appear in the output box and terminal logs.
5. **Dispatch Token to API Endpoint**:
   - Click **🚀 POST Token to API Endpoint** to test sending the token payload to your server.

---

## 📡 API Endpoint Payload Schema

When dispatching a token to your specified Target API Endpoint, **FCM-Kernel** sends an HTTP `POST` request with `Content-Type: application/json` containing:

```json
{
  "token": "fcm_registration_token_string_here",
  "projectId": "your-firebase-project-id",
  "messagingSenderId": "1234567890",
  "timestamp": "2026-08-02T06:50:00.000Z",
  "userAgent": "Mozilla/5.0..."
}
```

---

## 🛠️ Built With

- **HTML5 & Vanilla JavaScript (ES Modules)**
- **Firebase Web SDK v10 (Modular & Compat)**
- **Vanilla CSS (Linux Hacker / Terminal Design System)**

---

## 📄 License

MIT License. Feel free to customize and use in your developer workflow!
