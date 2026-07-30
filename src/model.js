const LIST_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models";

async function getWorkingModels(count) {
    console.log(`🔍 Finding ${count} distinct working models...`);
    const workingIds = [];
    try {
        const res = await fetch(`${LIST_MODELS_URL}?key=${process.env.GEMINI_API_KEY}`);
        const data = await res.json();
        
        if (!data.models) throw new Error("No models returned.");
        
        const validModels = data.models.filter(m => m.supportedGenerationMethods?.includes("generateContent"));
        
        for (const model of validModels) {
            if (workingIds.length >= count) break;
            
            const testId = model.name.replace("models/", "");
            const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${testId}:generateContent?key=${process.env.GEMINI_API_KEY}`;
            
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                
                const testRes = await fetch(testUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] }),
                    signal: controller.signal
                });
                clearTimeout(timeout);
                
                const testData = await testRes.json();
                if (testRes.ok && testData.candidates) {
                    console.log(`✅ Valid model found: ${testId}`);
                    workingIds.push(testId);
                }
            } catch (e) {
                // Silent catch
            }
        }
        
        if (workingIds.length === 0) throw new Error("No working text models found.");
        return workingIds;
    } catch (e) {
        console.error(`Failed to find working models: ${e.message}`);
        process.exit(1);
    }
}

class AIModel {
    constructor(name, persona, modelId) {
        this.name = name;
        // Hardcoded rule to stop bullet points and internal monologue
        this.persona = `${persona} CRITICAL RULE: Never output your internal reasoning, thought process, or markdown bullet points (*). Output ONLY your final spoken response.`;
        this.modelId = modelId;
        console.log(`[${this.name}] assigned model: ${this.modelId}`);
    }

    async run(chatHistory) {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:generateContent`;

        const contents = chatHistory.map(msg => {
            return {
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }]
            };
        });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        try {
            const response = await fetch(`${API_URL}?key=${process.env.GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    // Properly using systemInstruction keeps the chat history clean
                    systemInstruction: { parts: [{ text: this.persona }] },
                    contents: contents,
                    generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
                }),
                signal: controller.signal
            });
            clearTimeout(timeout);

            const data = await response.json();
            if (!response.ok || data.error) throw new Error(data.error?.message || "API Error");
            
            return data.candidates[0].content.parts[0].text;

        } catch (e) {
            if (e.name === 'AbortError') throw new Error("Request timed out after 20s.");
            throw e;
        }
    }
}

module.exports = { AIModel, getWorkingModels };