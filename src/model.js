const LIST_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models";

async function getWorkingModels(count) {
    console.log(`🔍 Finding ${count} distinct working models...`);
    const workingIds = [];
    try {
        const res = await fetch(`${LIST_MODELS_URL}?key=${process.env.GEMINI_API_KEY}`);
        const data = await res.json();
        
        if (!data.models) throw new Error("No models returned.");
        
        let validModels = data.models.filter(m => m.supportedGenerationMethods?.includes("generateContent"));
        
        // PRIORITIZE GEMINI MODELS! They follow instructions better than Gemma.
        validModels.sort((a, b) => {
            if (a.name.includes("gemini") && !b.name.includes("gemini")) return -1;
            if (!a.name.includes("gemini") && b.name.includes("gemini")) return 1;
            return 0;
        });
        
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
            } catch (e) {}
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
        // Force the model to use a strict RESPONSE: format
        this.persona = `${persona}\nCRITICAL INSTRUCTION: You must output your final spoken response on a new line starting exactly with "RESPONSE: ". Do not include any internal reasoning before or after it.`;
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
                    systemInstruction: { parts: [{ text: this.persona }] },
                    contents: contents,
                    // Bumped to 500 so it has room to think, but we will extract only the final response
                    generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
                }),
                signal: controller.signal
            });
            clearTimeout(timeout);

            const data = await response.json();
            if (!response.ok || data.error) throw new Error(data.error?.message || "API Error");
            
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

        } catch (e) {
            if (e.name === 'AbortError') throw new Error("Request timed out after 20s.");
            throw e;
        }
    }
}

module.exports = { AIModel, getWorkingModels };