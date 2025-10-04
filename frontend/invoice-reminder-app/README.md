KuberAI - AI-Powered Invoice & Budget Manager
<p align="center">
<img src="assets/images/icon.png" style="width: 48px; height: 48px;" alt="KuberAI Banner">
</p>

KuberAI is a full-stack, cross-platform mobile application built with React Native and Node.js that revolutionizes personal finance management. It leverages the power of Google's Gemini API to scan and understand invoices, provide intelligent financial analysis, and help users save money with smart, AI-driven insights.

✨ Key Features
📄 AI Invoice Scanning: Instantly scan physical or digital invoices (images & PDFs). The Gemini vision model automatically extracts the vendor, amount, due date, and assigns a spending category.

🤖 AI Financial Coach: Receive personalized, conversational monthly spending reviews. The AI analyzes your habits, compares them to your budget, and provides actionable advice.

💸 Smart Deal Finder: For recurring bills, the AI uses Google Search grounding to find better deals on the market, helping you save money on subscriptions and services.

📊 Dynamic Data Visualization: An interactive dashboard with weekly, monthly, and yearly charts to visualize your spending patterns over time.

🔄 Automated Recurring Bills: Set any invoice as recurring. The backend automatically manages future due dates and sends push notifications when a new billing cycle begins.

🔐 Secure User Authentication: Full user sign-up and sign-in functionality powered by Firebase, ensuring all financial data is private and scoped to the individual user.

🔔 Hybrid Notification System: A robust system combining backend push notifications (for recurring bills) and offline local notifications (for upcoming due dates).

🔒 PIN & Biometric Protection: Users can secure sensitive actions like editing, deleting, or removing a PIN with a 4-digit code.

Full CRUD Functionality: A complete, modern mobile app experience with create, read, update, and delete operations for all your financial data.

🛠️ Tech Stack
Category

Technology

Frontend

React Native (Expo), Expo Router, React Native Reanimated

Backend

Node.js, Express.js

Database

MongoDB (with Mongoose)

AI

Google Gemini API (Vision & Grounded Search)

Auth

Firebase Authentication

Deployment

Railway (Backend), Expo Application Services (EAS) (Frontend)

Notifications

Firebase Cloud Messaging (FCM), Expo Notifications

🚀 Getting Started
To get a local copy up and running, follow these simple steps.

Prerequisites
Node.js (v18 or higher)

npm

A physical device with the Expo Go app or a custom development build.

A MongoDB Atlas account.

A Google AI Studio API Key.

A Firebase project.

Backend Setup
Clone the repository:

git clone [https://github.com/CodeWithAnkan/kuberai.git](https://github.com/CodeWithAnkan/kuberai.git)
cd kuberai/backend

Install NPM packages:

npm install

Set up your environment variables:

Create a .env file in the /backend directory.

Add your secrets using the .env.example as a template:

GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
MONGO_URI="YOUR_MONGODB_CONNECTION_STRING"
FIREBASE_SERVICE_ACCOUNT_BASE64="YOUR_BASE64_ENCODED_SERVICE_ACCOUNT_KEY"

Run the server:

npm start

Frontend Setup
Navigate to the frontend directory:

cd ../frontend/invoice-reminder-app

Install NPM packages:

npm install

Add your configuration files:

google-services.json: Download this from your Firebase project settings (for the Android app) and place it in the root of the /frontend/invoice-reminder-app directory.

firebaseConfig.js: Create this file in the root of the /frontend/invoice-reminder-app directory and add your Firebase web app configuration.

Update the Backend URL: In index.tsx, analysis.tsx, and notifications.js, change the BACKEND_URL constant to point to your local server (e.g., http://YOUR_COMPUTER_IP:3001).

Run the app:

npx expo start --dev-client

License
Distributed under the MIT License. See LICENSE for more information.
