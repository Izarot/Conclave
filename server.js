require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Use native fetch (Node 18+)
const API_URL = "https://models.inference.ai.azure.com/chat/completions";

// Middleware to parse JSON and serve our frontend files
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = 'db.json';
// Initialize db.json if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }, null, 2));
}

function readDB() {
    return JSON.parse(fs.readFileSync(DB_FILE));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- AUTH ROUTES ---
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    if (db.users.find(u => u.username === username)) {
        return res.status(400).json({ error: "User already exists" });
    }
    db.users.push({ username, password, chats: [] });
    writeDB(db);
    res.json({ success: true, username });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ success: true, username: user.username, chats: user.chats });
});

// --- SAVE/LOAD CHAT ROUTES ---
app.post('/api/save-chat', (req, res) => {
    const { username, chatId, chatName, history, models } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.username === username);
    if (!user) return res.status(404).json({ error: "User not found" });

    const existingIndex = user.chats.findIndex(c => c.id === chatId);
    const chatData = { id: chatId, name: chatName, history, models, updatedAt: new Date().toISOString() };
    
    if (existingIndex >= 0) {
        user.chats[existingIndex] = chatData; // Overwrite
    } else {
        user.chats.push(chatData); // New
    }
    
    writeDB(db);
    res.json({ success: true });
});

// --- AI CHAT ROUTE (NO PERSONAS, RAW MODELS) ---
app.post('/api/chat', async (req, res) => {
    const { message, history, models } = req.body;
    
    // models is an array like: [{ id: "gpt-4o", nickname: "Brainiac" }]
    if (!models || models.length === 0) return res.status(400).json({ error: "No models selected" });

    const chatHistory = [...history, { role: "user", content: message }];
    const responses = [];
    const combinedResponses = [];

    const promises = models.map(async (modelObj) => {
        try {
            const apiRes = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: modelObj.id,
                    messages: chatHistory, // No system prompt! Bands are off.
                    max_tokens: 200
                })
            });

            const data = await apiRes.json();
            if (!apiRes.ok) throw new Error(data.error?.message || "API Error");
            
            const text = data.choices[0].message.content.trim();
            const displayName = modelObj.nickname || modelObj.id;
            responses.push({ name: displayName, text });
            combinedResponses.push(`[${displayName}]: ${text}`);
        } catch (e) {
            const displayName = modelObj.nickname || modelObj.id;
            responses.push({ name: displayName, text: `Error: ${e.message}` });
            combinedResponses.push(`[${displayName}]: Error: ${e.message}`);
        }
    });

    await Promise.all(promises);

    res.json({
        responses: responses,
        history: [...chatHistory, { role: "assistant", content: combinedResponses.join("\n\n") }]
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Conclave Server running at http://localhost:${PORT}`);
    // DEBUG: Print the first 10 characters of the token to prove it's loaded
    console.log("DEBUG: GITHUB_TOKEN loaded as:", process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.substring(0, 10) + "..." : "UNDEFINED");
});