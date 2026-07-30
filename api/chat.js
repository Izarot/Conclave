const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

// The 3 Personas
const PERSONAS = {
    Analyst: "You are The Analyst. Purely logical, focused on data and facts. Be concise. Respond in ONE short sentence.",
    Creative: "You are The Creative. Optimistic, out-of-the-box thinker. Be concise. Respond in ONE short sentence.",
    Critic: "You are The Critic. Harsh, cynical, finds flaws. Be concise. Respond in ONE short sentence."
};

async function callGemini(persona, chatHistory) {
    const contents = chatHistory.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
    }));

    const res = await fetch(`${API_URL}?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: persona }] },
            contents: contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 150 }
        })
    });

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || "API Error");
    return data.candidates[0].content.parts[0].text.trim();
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { message, history } = req.body;
        let targets = [];
        let cleanText = message;

        // @mention parsing
        for (const name of Object.keys(PERSONAS)) {
            if (message.toLowerCase().includes(`@${name.toLowerCase()}`)) {
                targets.push(name);
                cleanText = cleanText.replace(new RegExp(`@${name}`, "gi"), "").trim();
            }
        }
        if (targets.length === 0) targets = ["Analyst", "Creative", "Critic"];

        // Add user message to history
        const chatHistory = [...history, { role: "user", content: cleanText || message }];
        const responses = [];
        const combinedResponses = [];

        // Call AIs in parallel for speed!
        const promises = targets.map(async (name) => {
            try {
                const text = await callGemini(PERSONAS[name], chatHistory);
                responses.push({ name, text });
                combinedResponses.push(`[${name}]: ${text}`);
            } catch (e) {
                responses.push({ name, text: `Error: ${e.message}` });
                combinedResponses.push(`[${name}]: Error: ${e.message}`);
            }
        });

        await Promise.all(promises);

        // Return the individual responses and the updated history
        res.status(200).json({
            responses: responses,
            history: [...chatHistory, { role: "assistant", content: combinedResponses.join("\n\n") }]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
