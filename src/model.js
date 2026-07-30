const LIST_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models";

class AIModel {
    constructor(name, persona) {
        this.name = name;
        this.persona = persona;
        this.modelId = null; // Will be fetched dynamically
    }

    async init() {
        if (this.modelId) return;
        console.log(`[${this.name}] Fetching available Google models...`);
        try {
            const res = await fetch(`${LIST_MODELS_URL}?key=${process.env.GEMINI_API_KEY}`);
            const data = await res.json();
            
            if (!data.models) throw new Error("No models returned.");
            
            // Find a model that supports generateContent (text generation)
            // Prefer 'flash' models because they are fast and free.
            const validModels = data.models.filter(m => m.supportedGenerationMethods?.includes("generateContent"));
            let chosen = validModels.find(m => m.name.includes("flash")) || validModels[0];
            
            if (!chosen) throw new Error("No text generation models found.");
            
            // Google returns name like "models/gemini-1.5-flash", we need just the ID part for the URL
            this.modelId = chosen.name.replace("models/", "");
            console.log(`[${this.name}] Selected Model: ${this.modelId}`);
        } catch (e) {
            console.error(`Failed to fetch Google models: ${e.message}`);
            process.exit(1);
        }
    }

    async run(chatHistory) {
        await this.init(); // Ensure we have a model selected
        
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:generateContent`;

        // Convert OpenAI-style history to Google's format
        const contents = chatHistory.map(msg => {
            return {
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }]
            };
        });

        const response = await fetch(`${API_URL}?key=${process.env.GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: this.persona }] },
                contents: contents,
                generationConfig: { temperature: 0.7 }
            })
        });

        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error?.message || "API Error");
        
        return data.candidates[0].content.parts[0].text;
    }
}

module.exports = AIModel;