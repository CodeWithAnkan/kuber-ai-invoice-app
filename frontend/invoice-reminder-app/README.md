<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KuberAI - AI-Powered Invoice & Budget Manager</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #1e1f22;
            --bg-secondary: #2b2d31;
            --bg-tertiary: #111214;
            --text-primary: #dcddde;
            --text-secondary: #949ba4;
            --text-headings: #ffffff;
            --accent-primary: #5865f2;
            --accent-secondary: #8ade64;
            --border-color: #4e5058;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Poppins', sans-serif;
            background-color: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.7;
            padding: 20px;
        }

        .container {
            max-width: 900px;
            margin: 40px auto;
            background-color: var(--bg-secondary);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            border: 1px solid var(--border-color);
        }

        .banner {
            background: linear-gradient(135deg, var(--accent-primary) 0%, #3a429b 100%);
            padding: 60px 40px;
            text-align: center;
        }

        .banner h1 {
            font-size: 3.5rem;
            color: var(--text-headings);
            font-weight: 700;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        
        .banner p {
            font-size: 1.1rem;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 10px;
        }

        main {
            padding: 40px;
        }

        section {
            margin-bottom: 40px;
        }

        h2 {
            font-size: 1.8rem;
            color: var(--text-headings);
            font-weight: 600;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid var(--accent-primary);
            display: inline-block;
        }
        
        h3 {
            font-size: 1.3rem;
            color: var(--text-headings);
            margin-top: 30px;
            margin-bottom: 15px;
        }

        p, li {
            font-size: 1rem;
            margin-bottom: 10px;
        }
        
        ul {
            list-style: none;
            padding-left: 0;
        }
        
        li {
            padding-left: 25px;
            position: relative;
        }
        
        li::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: var(--accent-secondary);
            font-weight: bold;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th, td {
            text-align: left;
            padding: 12px 15px;
            border-bottom: 1px solid var(--border-color);
        }

        th {
            background-color: var(--bg-primary);
            color: var(--text-headings);
            font-weight: 600;
        }
        
        tr:last-child td {
            border-bottom: none;
        }

        code {
            font-family: 'Courier New', Courier, monospace;
            background-color: var(--bg-tertiary);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9rem;
            color: #ffb86c; /* A nice color for inline code */
        }
        
        pre {
            background-color: var(--bg-tertiary);
            border: 1px solid #000;
            border-radius: 8px;
            padding: 20px;
            overflow-x: auto;
            margin: 20px 0;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        
        pre code {
            padding: 0;
            background-color: transparent;
            color: var(--text-primary);
        }

        a {
            color: var(--accent-primary);
            text-decoration: none;
            font-weight: 600;
            transition: color 0.3s ease;
        }

        a:hover {
            color: var(--accent-secondary);
        }
    </style>
</head>
<body>

    <div class="container">
        <header class="banner">
            <h1>KuberAI</h1>
            <p>AI-Powered Invoice & Budget Manager</p>
        </header>

        <main>
            <p><strong>KuberAI</strong> is a full-stack, cross-platform mobile application built with React Native and Node.js that revolutionizes personal finance management. It leverages the power of Google's Gemini API to scan and understand invoices, provide intelligent financial analysis, and help users save money with smart, AI-driven insights.</p>
            
            <section>
                <h2>✨ Key Features</h2>
                <ul>
                    <li><strong>AI Invoice Scanning:</strong> Instantly scan physical or digital invoices (images & PDFs). The Gemini vision model automatically extracts the vendor, amount, due date, and assigns a spending category.</li>
                    <li><strong>AI Financial Coach:</strong> Receive personalized, conversational monthly spending reviews. The AI analyzes your habits, compares them to your budget, and provides actionable advice.</li>
                    <li><strong>Smart Deal Finder:</strong> For recurring bills, the AI uses Google Search grounding to find better deals on the market, helping you save money on subscriptions and services.</li>
                    <li><strong>Dynamic Data Visualization:</strong> An interactive dashboard with weekly, monthly, and yearly charts to visualize your spending patterns over time.</li>
                    <li><strong>Automated Recurring Bills:</strong> Set any invoice as recurring. The backend automatically manages future due dates and sends push notifications when a new billing cycle begins.</li>
                    <li><strong>Secure User Authentication:</strong> Full user sign-up and sign-in functionality powered by Firebase, ensuring all financial data is private and scoped to the individual user.</li>
                    <li><strong>Hybrid Notification System:</strong> A robust system combining backend push notifications (for recurring bills) and offline local notifications (for upcoming due dates).</li>
                    <li><strong>PIN & Biometric Protection:</strong> Users can secure sensitive actions like editing, deleting, or removing a PIN with a 4-digit code.</li>
                    <li><strong>Full CRUD Functionality:</strong> A complete, modern mobile app experience with create, read, update, and delete operations for all your financial data.</li>
                </ul>
            </section>

            <section>
                <h2>🛠️ Tech Stack</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Technology</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Frontend</strong></td>
                            <td><code>React Native (Expo)</code>, <code>Expo Router</code>, <code>React Native Reanimated</code></td>
                        </tr>
                        <tr>
                            <td><strong>Backend</strong></td>
                            <td><code>Node.js</code>, <code>Express.js</code></td>
                        </tr>
                        <tr>
                            <td><strong>Database</strong></td>
                            <td><code>MongoDB</code> (with Mongoose)</td>
                        </tr>
                        <tr>
                            <td><strong>AI</strong></td>
                            <td><code>Google Gemini API</code> (Vision & Grounded Search)</td>
                        </tr>
                        <tr>
                            <td><strong>Auth</strong></td>
                            <td><code>Firebase Authentication</code></td>
                        </tr>
                        <tr>
                            <td><strong>Deployment</strong></td>
                            <td><code>Railway</code> (Backend), <code>Expo Application Services (EAS)</code> (Frontend)</td>
                        </tr>
                        <tr>
                            <td><strong>Notifications</strong></td>
                            <td><code>Firebase Cloud Messaging (FCM)</code>, <code>Expo Notifications</code></td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section>
                <h2>🚀 Getting Started</h2>
                <p>To get a local copy up and running, follow these simple steps.</p>
                <h3>Prerequisites</h3>
                <ul>
                    <li>Node.js (v18 or higher)</li>
                    <li>npm</li>
                    <li>A physical device with the Expo Go app or a custom development build.</li>
                    <li>A MongoDB Atlas account.</li>
                    <li>A Google AI Studio API Key.</li>
                    <li>A Firebase project.</li>
                </ul>

                <h3>Backend Setup</h3>
                <ol>
                    <li>Clone the repository:
                        <pre><code>git clone https://github.com/CodeWithAnkan/kuberai.git
cd kuberai/backend</code></pre>
                    </li>
                    <li>Install NPM packages:
                        <pre><code>npm install</code></pre>
                    </li>
                    <li>Set up your environment variables:
                        <p>Create a <code>.env</code> file in the <code>/backend</code> directory and add your secrets:</p>
                        <pre><code>GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
MONGO_URI="YOUR_MONGODB_CONNECTION_STRING"
FIREBASE_SERVICE_ACCOUNT_BASE64="YOUR_BASE64_ENCODED_SERVICE_ACCOUNT_KEY"</code></pre>
                    </li>
                    <li>Run the server:
                        <pre><code>npm start</code></pre>
                    </li>
                </ol>

                <h3>Frontend Setup</h3>
                <ol>
                    <li>Navigate to the frontend directory:
                        <pre><code>cd ../frontend/invoice-reminder-app</code></pre>
                    </li>
                    <li>Install NPM packages:
                        <pre><code>npm install</code></pre>
                    </li>
                    <li>Add your configuration files:
                        <ul>
                            <li><strong><code>google-services.json</code></strong>: Download this from your Firebase project settings (for the Android app) and place it in the root of the <code>/frontend/invoice-reminder-app</code> directory.</li>
                            <li><strong><code>firebaseConfig.js</code></strong>: Create this file in the root of the <code>/frontend/invoice-reminder-app</code> directory and add your Firebase web app configuration.</li>
                        </ul>
                    </li>
                    <li>Update the Backend URL in <code>index.tsx</code>, <code>analysis.tsx</code>, and <code>notifications.js</code> to point to your local server (e.g., <code>http://YOUR_COMPUTER_IP:3001</code>).</li>
                    <li>Run the app:
                        <pre><code>npx expo start --dev-client</code></pre>
                    </li>
                </ol>
            </section>

            <section>
                <h2>License</h2>
                <p>Distributed under the MIT License. See <code>LICENSE</code> for more information.</p>
            </section>
        </main>
    </div>

</body>
</html>
