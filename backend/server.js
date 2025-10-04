require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fetch = require('node-fetch');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const {
    startOfWeek, endOfWeek, subWeeks, format,
    subMonths, subYears, startOfMonth, endOfMonth,
    startOfYear, endOfYear, addDays, addWeeks, addMonths, addYears
} = require('date-fns');

// --- Firebase Admin Initialization ---
const serviceAccount_base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
if (!serviceAccount_base64) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable not set.");
}
const serviceAccount = JSON.parse(Buffer.from(serviceAccount_base64, 'base64').toString('ascii'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const app = express();
const port = 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// --- Authentication Middleware ---
const authMiddleware = async (req, res, next) => {
    const { authorization } = req.headers;
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(401).send('Unauthorized: No token provided.');
    }
    const idToken = authorization.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        res.status(401).send('Unauthorized: Invalid token.');
    }
};

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected successfully."))
    .catch(err => console.error("❌ MongoDB connection error:", err));

const userSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true },
    fcmToken: { type: String, required: false },
    monthlyBudget: { type: Number, default: 0 }
});
const User = mongoose.model('User', userSchema);

// --- Mongoose Schema & Model ---
const invoiceSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    vendor: { type: String, required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: false, default: null },
    // nextRecurringDate: { type: Date, required: false, default: null },
    category: { type: String, default: 'Other' },
    isRecurring: { type: Boolean, default: false },
    recurrenceInterval: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

const analysisCache = new Map();

function setCache(userId,analysis, count, total) {
    analysisCache.set(userId, {
        data: analysis,
        lastInvoiceCount: count,
        lastTotalAmount: total,
        lastUpdatedAt: new Date()
    });
}

function getCache(userId) {
    return analysisCache.get(userId);
}

const Invoice = mongoose.model('Invoice', invoiceSchema);

async function callGeminiAPI(fileBuffer, mimeType) {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    const prompt = `Analyze this document. Extract: "vendor", "amount", "dueDate" (YYYY-MM-DD, null if not found), "category". Return as minified JSON.`;
    const payload = {
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: fileBuffer.toString('base64') } }] }],
        generationConfig: { "response_mime_type": "application/json" }
    };
    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);
        const result = await response.json();
        return JSON.parse(result.candidates[0].content.parts[0].text);
    } catch (error) {
        return null;
    }
};

async function generateAnalysis(invoices, userName, budget) {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    const prompt = `
        Act as a friendly, encouraging financial coach named 'Fin'.
        The user's name is ${userName || 'there'}. Their monthly budget is ₹${budget}.
        Here is a JSON array of their spending over the last 30 days:
        ${JSON.stringify(invoices)}

        Your task is to provide a short, conversational summary (2-3 paragraphs).
        1. Start by addressing ${userName || 'them'} directly. Keep the font simple and refrain using bold or italics in the message text.
        2. Mention their total spending and compare it to their budget. Are they on track?
        3. Identify their top spending category.
        4. Find one simple, actionable insight related to their budget.
        5. End with a positive, forward-looking thought.
        IMPORTANT: Use gender-neutral pronouns (they/them).
    `;

    const payload = { contents: [{ parts: [{ text: prompt }] }] };

    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API call failed: ${response.status}`);
        const result = await response.json();
        return result.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Error generating analysis:", error);
        return "I'm having a little trouble analyzing the data right now. Please try again in a moment.";
    }
}

async function findBetterDeals(vendor, amount, category) {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const prompt = `
        Act as a helpful financial assistant in India. The user is currently paying ₹${amount} on ${category} for a service from "${vendor}".
        Search for better deals for this service.
    `;

    const payload = { contents: [{ parts: [{ text: prompt }] }], tools: [{ "google_search": {} }] };

    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API call failed: ${response.status}`);
        const result = await response.json();
        return result.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Error finding deals:", error);
        return "Sorry, I couldn't search for deals at the moment. Please try again later.";
    }
}

app.use('/api', authMiddleware);

app.get('/api/analysis', async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));
        const [userInvoices, user] = await Promise.all([
            Invoice.find({ userId: req.user.uid, createdAt: { $gte: thirtyDaysAgo } }),
            User.findOne({ uid: req.user.uid })
        ]);
        
        const currentInvoiceCount = userInvoices.length;
        const currentTotalAmount = userInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        const budget = user ? user.monthlyBudget : 0;

        const cache = getCache(req.user.uid);
        if (cache &&
            cache.lastInvoiceCount === currentInvoiceCount &&
            cache.lastTotalAmount === currentTotalAmount
        ) {
            return res.json({ cached: true, analysis: cache.data });
        }

        const analysisText = await generateAnalysis(userInvoices, req.user.name, budget);
        setCache(req.user.uid, analysisText, currentInvoiceCount, currentTotalAmount);
        res.json({ cached: false, analysis: analysisText });

    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to generate analysis.' });
    }
});

app.get('/api/user/budget', async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.user.uid });
        const start = startOfMonth(new Date());
        const end = endOfMonth(new Date());

        const monthlyExpenses = await Invoice.aggregate([
            { $match: { userId: req.user.uid, createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        res.json({
            monthlyBudget: user ? user.monthlyBudget : 0,
            totalExpenses: monthlyExpenses.length > 0 ? monthlyExpenses[0].total : 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch budget data.' });
    }
});

app.put('/api/user/budget', async (req, res) => {
    try {
        const { monthlyBudget } = req.body;
        await User.findOneAndUpdate(
            { uid: req.user.uid },
            { monthlyBudget },
            { new: true, upsert: true }
        );
        res.json({ status: 'success', message: "Budget updated" });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update budget.' });
    }
});

app.get('/api/invoices', async (req, res) => {
    try {
        const { sortBy = 'createdAt', order = 'desc', search = '' } = req.query;

        // Build the search query
        const query = { userId: req.user.uid };
        if (search) {
            // Case-insensitive search on the vendor field
            query.vendor = { $regex: search, $options: 'i' };
        }

        // Build the sort options
        const sortOptions = { [sortBy]: order === 'asc' ? 1 : -1 };

        const invoices = await Invoice.find(query).sort(sortOptions);
        res.json(invoices);

    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch invoices.' });
    }
});

app.post('/api/invoices', async (req, res) => {
    try {
        const invoiceData = { ...req.body, userId: req.user.uid };
        const newInvoice = new Invoice(invoiceData);
        await newInvoice.save();
        res.status(201).json({ status: 'success', data: newInvoice });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to save invoice.' });
    }
});

app.post('/api/upload', upload.single('invoice'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    try {
        const resultData = await callGeminiAPI(req.file.buffer, req.file.mimetype);
        if (resultData && resultData.vendor && resultData.amount) {
            const invoiceData = { ...resultData, userId: req.user.uid };
            const newInvoice = new Invoice(invoiceData);
            await newInvoice.save();
            res.status(201).json({ status: 'success', data: newInvoice });
        } else {
            res.json({ status: 'manual_required', partialData: resultData || {} });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'An unexpected error occurred.' });
    }
});

app.put('/api/invoices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedInvoice = await Invoice.findOneAndUpdate(
            { _id: id, userId: req.user.uid },
            req.body,
            { new: true }
        );
        if (!updatedInvoice) {
            return res.status(404).json({ status: 'error', message: 'Invoice not found or user not authorized.' });
        }
        res.json({ status: 'success', data: updatedInvoice });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to update invoice.' });
    }
});

app.delete('/api/invoices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Invoice.findOneAndDelete({ _id: id, userId: req.user.uid });

        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Invoice not found or user not authorized.' });
        }
        res.json({ status: 'success', message: 'Invoice deleted successfully.' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to delete invoice.' });
    }
});

app.post('/api/find-deals', async (req, res) => {
    try {
        const { vendor, amount } = req.body;
        if (!vendor || !amount) {
            return res.status(400).json({ error: 'Vendor and amount are required.' });
        }
        const dealText = await findBetterDeals(vendor, amount);
        res.json({ deal: dealText });
    } catch (error) {
        res.status(500).json({ error: 'Failed to find deals.' });
    }
});

app.patch('/api/invoices/:id/set-recurring', async (req, res) => {
    try {
        const { id } = req.params;
        const { interval } = req.body;

        const invoice = await Invoice.findOne({ _id: id, userId: req.user.uid });
        if (!invoice) return res.status(404).json({ status: 'error', message: 'Invoice not found.' });

        if (interval) {
            if (!invoice.dueDate) return res.status(400).json({ status: 'error', message: 'Cannot set recurrence on an invoice with no due date.' });

            invoice.isRecurring = true;
            invoice.recurrenceInterval = interval;
            
            // This logic is now handled by the cron job, so we just set the flag.
            // You could optionally calculate the first future date here as well.

        } else {
            invoice.isRecurring = false;
            invoice.recurrenceInterval = null;
        }

        await invoice.save();
        res.json({ status: 'success', data: invoice });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to update invoice.' });
    }
});


app.get('/api/chart-data', async (req, res) => {
    try {
        const { range = 'week', offset = 0 } = req.query;
        const offsetNum = parseInt(offset, 10);
        const today = new Date();
        let start, end, groupBy, labels, data;

        switch (range) {
            case 'month': {
                const targetMonth = subMonths(today, offsetNum);
                start = startOfMonth(targetMonth);
                end = endOfMonth(targetMonth);
                groupBy = { $dayOfMonth: "$createdAt" };

                const totalDays = end.getDate();
                data = new Array(totalDays).fill(0); // each index = exact day

                // Labels only for multiples of 5 + last day
                labels = Array.from({ length: totalDays }, (_, i) => {
                    const day = i + 1;
                    if (day % 5 === 0 || day === totalDays) return day.toString();
                    return '';
                });

                break;
            }
            case 'year': {
                const targetYear = today.getFullYear() - offsetNum;
                start = startOfYear(new Date(targetYear, 0, 1));
                end = endOfYear(new Date(targetYear, 11, 31));
                groupBy = { $month: "$createdAt" };
                data = new Array(12).fill(0);
                labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                break;
            }
            case 'week':
            default: {
                const targetWeek = subWeeks(today, offsetNum);
                start = startOfWeek(targetWeek, { weekStartsOn: 0 });
                end = endOfWeek(targetWeek, { weekStartsOn: 0 });
                groupBy = { $dayOfWeek: "$createdAt" };
                data = new Array(7).fill(0);
                labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                break;
            }
        }

        const aggregation = await Invoice.aggregate([
            { $match: { userId: req.user.uid, createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: groupBy, totalAmount: { $sum: "$amount" } } },
            { $sort: { _id: 1 } }
        ]);

        let total = 0;

        aggregation.forEach(item => {
            let index;
            if (range === 'year' || range === 'week') {
                index = item._id - 1; // Mongo months/days are 1-based
            } else { // month
                index = item._id - 1; // exact day
            }

            if (index >= 0 && index < data.length) {
                data[index] = item.totalAmount;
                total += item.totalAmount;
            }
        });

        const dateRange = `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;

        res.json({
            chartData: { labels, datasets: [{ data }] },
            total,
            dateRange
        });

    } catch (error) {
        console.error("Error fetching chart data:", error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch chart data.' });
    }
});

async function updateRecurringInvoices() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueInvoices = await Invoice.find({
        isRecurring: true,
        dueDate: { $lte: today }
    });
    
    console.log(`[Recurring Job] Found ${dueInvoices.length} invoices to update.`);

    for (const invoice of dueInvoices) {
        console.log(`[Recurring Job] Updating invoice: ${invoice._id} for vendor ${invoice.vendor}`);

        let nextDueDate = new Date(invoice.dueDate);
        const [value, unit] = invoice.recurrenceInterval.split('-');
        const numValue = parseInt(value, 10);
        const addInterval = (date) => {
            switch (unit) {
                case 'week': return addWeeks(date, numValue);
                case 'month': return addMonths(date, numValue);
                case 'year': return addYears(date, numValue);
                default: return date;
            }
        };

        // Keep adding the interval until the due date is in the future
        while (nextDueDate <= today) {
            nextDueDate = addInterval(nextDueDate);
        }
        
        invoice.dueDate = nextDueDate;
        await invoice.save();

        await sendNotificationToUser(
            invoice.userId,
            "Recurring Bill Updated",
            `Your bill for ${invoice.vendor} has a new due date: ${format(nextDueDate, 'MMM d, yyyy')}.`
        );
    }
}

async function sendNotificationToUser(userId, title, body, data = {}) {
    try {
        const user = await User.findOne({ uid: userId });
        if (!user || !user.fcmToken) {
            console.log(`[Push Notification] No FCM token for user ${userId}. Skipping.`);
            return;
        }

        // The fcmToken we have is an Expo Push Token
        const expoPushToken = user.fcmToken;

        const message = {
            to: expoPushToken,
            sound: 'default',
            title: title,
            body: body,
            data: data,
        };

        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        console.log(`✅ Push notification sent to Expo for user ${userId}`);
    } catch (err) {
        console.error("❌ Error sending push notification via Expo:", err);
    }
}

const cron = require('node-cron');

// Run every day at 1 AM
cron.schedule('0 3 * * *', () => { 
    console.log("Running recurring invoice update job...");
    updateRecurringInvoices().catch(console.error);
});

app.post('/api/save-token', async (req, res) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) return res.status(400).json({ message: "FCM token required" });
        await User.findOneAndUpdate(
            { uid: req.user.uid },
            { fcmToken },
            { upsert: true }
        );
        res.json({ status: "success", message: "Token saved" });
    } catch (err) {
        res.status(500).json({ status: "error", message: "Failed to save token" });
    }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
