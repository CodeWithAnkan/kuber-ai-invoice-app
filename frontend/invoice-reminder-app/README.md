<div align="center">
  <img src="assets/images/icon.png" width="80" alt="KuberAI Logo">
  <h1>KuberAI</h1>
  <p><strong>AI-Powered Invoice & Budget Manager</strong></p>
</div>

---

> **KuberAI** is a full-stack, cross-platform mobile app built with React Native and Node.js that revolutionizes personal finance management.  
> It leverages the power of Google’s Gemini API to scan invoices, analyze spending, and offer AI-driven insights to help users save smarter. 💸

---

## ✨ Key Features

- 🤖 **AI Invoice Scanning:** Instantly scan invoices (image or PDF). The Gemini Vision model extracts vendor, amount, and due date automatically.  
- 🧠 **AI Financial Coach:** Personalized monthly spending reviews with actionable insights.  
- 💡 **Smart Deal Finder:** Uses Google Search grounding to find cheaper alternatives for recurring bills.  
- 📊 **Dynamic Data Visualization:** Interactive dashboard with weekly, monthly, and yearly charts.  
- 🔁 **Automated Recurring Bills:** Backend automation for future due dates + notifications.  
- 🔒 **Secure User Authentication:** Firebase-based sign-up/sign-in for private user data.  
- 🔔 **Hybrid Notifications:** Combines backend push (for recurring bills) + local notifications (for due dates).  
- 🔢 **PIN & Biometric Protection:** Protects sensitive actions like delete/update with a 4-digit PIN or biometrics.  
- ⚙️ **Full CRUD:** Complete modern mobile app experience for managing all financial data.  

---

## 🛠️ Tech Stack

| Category | Technologies |
|-----------|--------------|
| **Frontend** | `React Native (Expo)`, `Expo Router`, `React Native Reanimated` |
| **Backend** | `Node.js`, `Express.js` |
| **Database** | `MongoDB (Mongoose)` |
| **AI** | `Google Gemini API (Vision & Grounded Search)` |
| **Auth** | `Firebase Authentication` |
| **Deployment** | `Railway` (Backend), `EAS (Expo)` (Frontend) |
| **Notifications** | `Firebase Cloud Messaging (FCM)`, `Expo Notifications` |

---

## 🚀 Getting Started

Follow these steps to set up **KuberAI** locally 👇  

### 🔧 Prerequisites
- Node.js (v18+)
- npm
- Expo Go app or custom development build
- MongoDB Atlas account
- Google AI Studio API key
- Firebase project

---

### 🖥️ Backend Setup

```bash
# Clone the repo
git clone https://github.com/CodeWithAnkan/kuberai.git
cd kuberai/backend

# Install dependencies
npm install

# Create a .env file inside /backend:
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
MONGO_URI="YOUR_MONGODB_CONNECTION_STRING"
FIREBASE_SERVICE_ACCOUNT_BASE64="YOUR_BASE64_ENCODED_SERVICE_ACCOUNT_KEY"

# Then run the server:
npm start
```

### 📱 Frontend Setup

```bash
# Navigate to frontend
cd ../frontend/invoice-reminder-app

# Install dependencies
npm install

# Now add:
# google-services.json → from Firebase (Android app config)
# firebaseConfig.js → your Firebase Web configuration
# Make sure to update backend URLs in:
# index.tsx
# analysis.tsx
# notifications.js
# Then start the app:
npx expo start --dev-client
```

### 📜 License

This project is licensed under the MIT License — see the LICENSE file for details.

<div align="center"> <sub>💰 Built with ❤️ by <a href="https://github.com/CodeWithAnkan">Ankan</a></sub> </div>
