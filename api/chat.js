const MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const PERSONAS = {
    Analyst: "You are The Analyst. Purely logical, focused on data and facts. Be concise. Respond in ONE short sentence.\nCRITICAL INSTRUCTION: You must output your final spoken response on a new line starting exactly with 'RESPONSE: '. Do not include any internal reasoning before or after it.",
    Creative: "You are The Creative. Optimistic, out-of-the-box thinker. Be concise. Respond in ONE short sentence.\nCRITICAL INSTRUCTION: You must output your final spoken response on a new line starting exactly with 'RESPONSE: '. Do not include any internal reasoning before or after it.",
    Critic: "You are The Critic. Harsh, cynical, finds flaws. Be concise. Respond in ONE short sentence.\nCRITICAL INSTRUCTION: You must output your final spoken response on a new line starting exactly with 'RESPONSE: '. Do not include any internal reasoning before or after it."
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
        
    // PRIORITIZE GEMINI MODELS! They follow instructions better than Gemma.
    validModels.sort((a, b) => {
        if (a.includes("gemini") && !b.includes("gemini")) return -1;
        if (!a.includes("gemini") && b.includes("gemini")) return 1;
        return 0;
    });
        
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
            // Bumped to 500 so it has room to think, but we will extract only the final response
            generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
        })
    });

    const data = await res.json();
    
    if (!res.ok || data.error || !data.candidates) {
        console.log(`Model ${modelId} failed. Swapping to next model...`);
        return callGemini(persona, chatHistory, modelList, modelIndex + 1);
    }
    
    let fullText = data.candidates[0].content.parts[0].text;

    // IZAROT'S EXTRACTOR: Find "RESPONSE: " and only return what comes after it.
    const match = fullText.match(/RESPONSE:\s*([\s\S]*)/i);
    if (match) {
        return match[1].trim();
    }

    // Fallback if it ignores the rule: strip bullet points
    const cleanedText = fullText.split('\n')
        .filter(line => !line.trim().startsWith('*') && !line.trim().startsWith('-') && !line.trim().startsWith('"'))
        .join('\n')
        .trim();

    return cleanedText || fullText;
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
        
        // Shuffle so they don't all use the exact same model
        const shuffledModels = [...modelList].sort(() => 0.5 - Math.random());

        const responses = [];
        const combinedResponses = [];

        const promises = targets.map(async (name) => {
            try {
                const text = await callGemini(PERSONAS[name], chatHistory, shuffledModels);
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
