const MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const PERSONAS = {
    Analyst: "You are The Analyst. Purely logical, focused on data and facts. Respond in ONE short sentence.",
    Creative: "You are The Creative. Optimistic, out-of-the-box thinker. Respond in ONE short sentence.",
    Critic: "You are The Critic. Harsh, cynical, finds flaws. Respond in ONE short sentence."
};

let cachedModels = null;

async function getModelList() {
    if (cachedModels) return cachedModels;
    const res = await fetch(`${MODELS_URL}?key=${process.env.GEMINI_API_KEY}`);
    const data = await res.json();
    if (!data.models) throw new Error("No models returned");
    
    let validModels = data.models
        .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
        .map(m => m.name.replace("models/", ""));
        
    // PRIORITIZE GEMINI MODELS ONLY. They follow instructions. Gemma leaks thoughts.
    validModels = validModels.filter(m => m.includes("gemini"));
        
    cachedModels = validModels;
    return cachedModels;
}

async function callGemini(persona, chatHistory, modelList, modelIndex = 0) {
    if (modelIndex >= modelList.length) throw new Error("All available models failed or rate limited.");
    
    const modelId = modelList[modelIndex];
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
    
    const contents = chatHistory.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
    }));

    const res = await fetch(`${apiUrl}?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: persona }] },
            contents: contents,
            // 100 tokens is only enough for 1-2 sentences. It physically cannot write bullet points!
            generationConfig: { temperature: 0.7, maxOutputTokens: 100 }
        })
    });

    const data = await res.json();
    
    if (!res.ok || data.error || !data.candidates) {
        console.log(`Model ${modelId} failed. Swapping to next model...`);
        return callGemini(persona, chatHistory, modelList, modelIndex + 1);
    }
    
    return data.candidates[0].content.parts[0].text.trim();
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
        
        // Assign distinct models so they don't all use the exact same one
        const modelsForAIs = [
            modelList[0] || modelList[0],
            modelList[1] || modelList[0],
            modelList[2] || modelList[0]
        ];

        const responses = [];
        const combinedResponses = [];

        const promises = targets.map(async (name, index) => {
            try {
                // Give each AI a specific model from our list
                const assignedModel = [modelsForAIs[index]];
                const text = await callGemini(PERSONAS[name], chatHistory, assignedModel);
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
