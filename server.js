/* Mindspark backend
Features:
- Auth (register/login) with JWT
- Stripe Checkout subscription
- Chat proxy to OpenAI + daily message cap (200/day for free users)
- Save chats (per user) and fetch them
- File upload (PDF text extraction)
- Voice transcription endpoint (if using client audio uploads)
- lowdb (file based JSON DB) for simple persistence
*/


const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const Razorpay = require('razorpay');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------- DB (lowdb) ---------------- //
const { JSONFile, Low } = require('lowdb');
const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

async function initDB() {
    await db.read();
    db.data = db.data || { users: [], chats: [], dailyCounts: [] };
    await db.write();
}
initDB();

// ---------------- Razorpay Instance ---------------- //
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ---------------- Express Setup ---------------- //
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json({ limit: '15mb' }));
const upload = multer({ dest: 'uploads/' });

// ---------------- Helpers ---------------- //
function signToken(email) {
    return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

async function findUser(email) {
    await db.read();
    return db.data.users.find(u => u.email === email);
}

// ---------------- Middleware ---------------- //
async function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "No token" });

    try {
        const token = header.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.email;
        next();
    } catch (e) {
        return res.status(401).json({ error: "Invalid token" });
    }
}

// ---------------- User Register ---------------- //
app.post('/register', async (req, res) => {
    const { email, password } = req.body;

    const existing = await findUser(email);
    if (existing) return res.json({ error: "User exists" });

    const hashed = await bcrypt.hash(password, 10);
    db.data.users.push({
        email,
        password: hashed,
        premium: false,
        createdAt: Date.now()
    });
    await db.write();

    return res.json({ message: "Registered" });
});

// ---------------- Login ---------------- //
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await findUser(email);

    if (!user) return res.json({ error: "Not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ error: "Wrong password" });

    const token = signToken(email);
    res.json({ token, premium: user.premium });
});

// ---------------- DAILY 200 LIMIT ENFORCER ---------------- //
async function canChatToday(email) {
    await db.read();
    const today = new Date().toDateString();

    let entry = db.data.dailyCounts.find(d => d.email === email && d.date === today);

    if (!entry) {
        db.data.dailyCounts.push({ email, date: today, count: 0 });
        await db.write();
        return true;
    }

    return entry.count < 200;
}

async function incrementCount(email) {
    await db.read();
    const today = new Date().toDateString();
    let entry = db.data.dailyCounts.find(d => d.email === email && d.date === today);

    if (!entry) {
        db.data.dailyCounts.push({ email, date: today, count: 1 });
    } else {
        entry.count++;
    }
    await db.write();
}

// ---------------- CHAT AI ---------------- //
app.post('/chat', auth, async (req, res) => {
    const { message } = req.body;
    const email = req.user;

    const user = await findUser(email);

    if (!user.premium) {
        const ok = await canChatToday(email);
        if (!ok) return res.json({ error: "Daily limit reached. Buy premium." });
    }

    try {
        const aiResponse = await openai.responses.create({
            model: "gpt-4.1",
            input: message
        });

        const reply = aiResponse.output[0].content[0].text;

        // save chat
        db.data.chats.push({
            email,
            message,
            reply,
            timestamp: Date.now()
        });
        await db.write();

        if (!user.premium) await incrementCount(email);

        res.json({ reply });
    } catch (e) {
        res.json({ error: "AI error", details: e.message });
    }
});

// ---------------- FILE UPLOAD (PDF/IMG) ---------------- //
app.post('/upload', auth, upload.single('file'), async (req, res) => {
    const filePath = req.file.path;

    if (req.file.mimetype.endsWith("pdf")) {
        const data = await pdfParse(fs.readFileSync(filePath));
        fs.unlinkSync(filePath);
        return res.json({ text: data.text });
    }

    // For images → You can integrate OCR or OpenAI vision model
    return res.json({ text: "Image uploaded. Vision OCR not added yet." });
});

// ---------------- Save / Fetch chats ---------------- //
app.get('/chats', auth, async (req, res) => {
    const email = req.user;
    await db.read();
    const chats = db.data.chats.filter(c => c.email === email);
    res.json({ chats });
});

// ---------------- RAZORPAY PREMIUM PAYMENT (ONE TIME) ---------------- //
app.post('/create-order', auth, async (req, res) => {
    const email = req.user;

    const options = {
        amount: 9900, // ₹99 × 100 paise
        currency: "INR",
        receipt: "receipt_order_" + Date.now()
    };

    try {
        const order = await razorpay.orders.create(options);
        res.json({ order });
    } catch (e) {
        res.json({ error: "Payment error", details: e.message });
    }
});

// ---------------- PAYMENT VERIFICATION WEBHOOK ---------------- //
app.post('/payment-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers["x-razorpay-signature"];

    const body = req.body;

    try {
        const expected = Razorpay.validateWebhookSignature(
            JSON.stringify(body),
            signature,
            process.env.RAZORPAY_WEBHOOK_SECRET
        );

        if (!expected) return res.status(400).json({ error: "Invalid signature" });

        const email = body.payload.payment.entity.notes.email;

        let user = await findUser(email);
        if (user) {
            user.premium = true;
            await db.write();
        }

        res.json({ status: "ok" });

    } catch (e) {
        res.status(400).json({ error: "Webhook validation failed" });
    }
});

// ---------------- START SERVER ---------------- //
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Mindspark backend running on ${PORT}`));
