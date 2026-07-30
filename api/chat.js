const MODELS_URL = "https://openrouter.ai/api/v1/models";
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

const PERSONAS = {
    Analyst: "You are The Analyst. Purely logical, focused on data and facts. Respond in ONE short sentence. Do not output internal reasoning.",
    Creative: "You are The Creative. Optimistic, out-of-the-box thinker. Respond in ONE short sentence. Do not output internal reasoning.",
    Critic: "You are The Critic. Harsh, cynical, finds flaws. Respond in ONE short sentence. Do not output internal reasoning."
};

let cachedModels = null;

async function getModelList() {
    if (cachedModels && cachedModels.length > 0) return cachedModels;
    try {
        const res = await fetch(MODELS_URL);
        const data = await res.json();
        if (!data.data) throw new Error("No models returned");
        
        // Find all models where the prompt price is exactly "0"
        let freeModels = data.data
            .filter(m => m.id && m.pricing && m.pricing.prompt === "0")
            .map(m => m.id);
            
        // Shuffle the models so the AIs don't all use the exact same one
        cachedModels = freeModels.sort(() => 0.5 - Math.random());
        return cachedModels.length > 0 ? cachedModels : ["meta-llama/llama-3.3-70b-instruct:free"];
    } catch (e) {
        return ["meta-llama/llama-3.3-70b-instruct:free"]; // Safety net
    }
}

async function callOpenRouter(persona, chatHistory, modelList, modelIndex = 0) {
    if (modelIndex >= modelList.length) throw new Error("All available models failed or rate limited.");
    
    const modelId = modelList[modelIndex];
    const headers = {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://conclave.vercel.app", // OpenRouter requires this
        "X-Title": "Conclave AI"
    };

    const messages = [
        { role: "system", content: persona },
        ...chatHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }))
    ];

    const res = await fetch(API_URL, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
            model: modelId,
            messages: messages,
            max_tokens: 100 // Keep it short to prevent thought leaks
        })
    });

    const data = await res.json();
    
    // If it fails (rate limit, server error, etc.), swap to the next model!
    if (!res.ok || data.error || !data.choices || data.choices.length === 0) {
        console.log(`Model ${modelId} failed. Swapping...`);
        return callOpenRouter(persona, chatHistory, modelList, modelIndex + 1);
    }
    
    return data.choices[0].message.content.trim();
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { message, history } = req.body;
        let targets = [];
        let cleanText = message;

        for (const name of Object.keys(PERSONAS)) {
            if (message.toLowerCase().includes(`@${name.toLowerCase()}`)) {
                targets.push(name);
                cleanText = cleanText.replace(new RegExp(`@${name}`, "gi"), "").trim();
            }
        }
        if (targets.length === 0) targets = ["Analyst", "Creative", "Critic"];

        const chatHistory = [...history, { role: "user", content: cleanText || message }];
        const modelList = await getModelList();
        
        const responses = [];
        const combinedResponses = [];

        const promises = targets.map(async (name, index) => {
            try {
                // Offset the starting index so they use different models if possible
                const text = await callOpenRouter(PERSONAS[name], chatHistory, modelList, index);
                responses.push({ name, text });
                combinedResponses.push(`[${name}]: ${text}`);
            } catch (e) {
                responses.push({ name, text: `Error: ${e.message}` });
                combinedResponses.push(`[${name}]: Error: ${e.message}`);
            }
        });

        await Promise.all(promises);

        res.status(200).json({
            responses: responses,
            history: [...chatHistory, { role: "assistant", content: combinedResponses.join("\n\n") }]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
