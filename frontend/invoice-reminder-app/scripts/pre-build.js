const fs = require('fs');

console.log("Running pre-build script to create secret files...");

if (process.env.GOOGLE_SERVICES_JSON) {
    fs.writeFileSync('./google-services.json', process.env.GOOGLE_SERVICES_JSON);
    console.log("✅ google-services.json created successfully.");
} else {
    console.warn("⚠️ GOOGLE_SERVICES_JSON secret not found.");
}

if (process.env.FIREBASE_CONFIG_JS) {
    fs.writeFileSync('./firebaseConfig.js', process.env.FIREBASE_CONFIG_JS);
    console.log("✅ firebaseConfig.js created successfully.");
} else {
    console.warn("⚠️ FIREBASE_CONFIG_JS secret not found.");
}
