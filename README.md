# ▲ FCM-Kernel (Firebase Cloud Messaging Tester)

> A sleek, Vercel-inspired Web Push & Firebase Cloud Messaging (FCM) testing tool for developers.

![FCM-Kernel Vercel UI](https://img.shields.io/badge/UI-Vercel%20Design-000000?style=for-the-badge&logo=vercel)
![Firebase](https://img.shields.io/badge/Firebase-v10%20Web%20SDK-ffca28?style=for-the-badge&logo=firebase)
![License](https://img.shields.io/badge/License-MIT-0070f3?style=for-the-badge)

**FCM-Kernel** allows developers to quickly test Firebase Cloud Messaging push notifications, generate Web Push FCM tokens dynamically using custom Firebase credentials and VAPID keys, and verify token registration by dispatching payloads directly to custom backend API endpoints.

---

## ✨ Features

- ⚙️ **Dynamic Firebase Configuration**: Input or quick-paste any Firebase JS config object/JSON on the fly without modifying source code.
- 🔑 **Custom VAPID Key Support**: Test Web Push FCM token generation across different project environments.
- 🌐 **Target API Endpoint Dispatch**: Send generated FCM registration tokens to your backend API via HTTP POST with custom auth headers and payload logging.
- ▲ **Vercel-Inspired UI**: Clean, obsidian-dark modern design system featuring Inter/JetBrains Mono typography, subtle radial gradients, and crisp 1px borders.
- 📜 **Real-Time System Log Stream**: High-precision timestamped logs (`[HH:MM:SS.mmm]`) for Service Worker lifecycle events, token generation, foreground notifications, and HTTP API debugging.
- 🔔 **Background Notification Inspector**: Relays background push notifications caught by `firebase-messaging-sw.js` directly to the live log stream with system notification popups.
- 💾 **LocalStorage Auto-Save**: Preserves your credentials locally so you don't lose configuration on browser refresh.
- 📋 **One-Click Token Copying**: Instant clipboard copy button for FCM registration tokens.

---

## 📂 Project Structure

```text
.
├── index.html               # Main Vercel-style UI structure & input forms
├── styles.css               # Vercel design system & CSS variables
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
3. **Set Target API Endpoint & Authorization Header (Optional)**:
   - Enter your backend API URL (e.g., `https://api.yourdomain.com/v1/fcm/register`) and an optional Bearer/User authorization token.
4. **Get FCM Token**:
   - Click **▶ Get FCM Token**. Grant browser notification permissions when prompted.
   - The generated FCM Registration Token will appear in the output box and terminal logs.
5. **Dispatch Token to API Endpoint**:
   - Click **🚀 POST Token to API Endpoint** to test sending the token payload to your server.
6. **Note**
   - make sure that " Use Google services for push messaging " option in you browser in ON
---

## 📡 API Endpoint Request & Payload Schema

When dispatching a token to your specified Target API Endpoint, **FCM-Kernel** sends an HTTP `POST` request with:

### Request Headers
```http
Content-Type: application/json
Authorization: User <token_value>
X-FCM-Client: FCM-Tester-Linux
```

### Request Body (JSON)
```json
{
  "token": "fcm_registration_token_string_here"
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
