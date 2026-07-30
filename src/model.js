const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELS_URL = "https://openrouter.ai/api/v1/models";

class AIModel {
    constructor(name, persona) {
        this.name = name;
        this.persona = persona;
        this.modelId = null; // Will be fetched dynamically
    }

    async init() {
        if (this.modelId) return;
        console.log(`[${this.name}] Fetching available free models...`);
        try {
            const res = await fetch(MODELS_URL);
            const data = await res.json();
            
            // Find all models where the prompt price is exactly "0"
            const freeModels = data.data
                .filter(m => m.pricing && m.pricing.prompt === "0")
                .map(m => m.id);
                
            if (freeModels.length === 0) throw new Error("No free models found.");
            
            // Prefer these if they are free, otherwise just use the first free one we find
            const preferred = ["deepseek/deepseek-chat", "meta-llama/llama-3.3", "qwen/qwen-2.5", "google/gemini"];
            let chosen = freeModels.find(m => preferred.some(p => m.startsWith(p)));
            if (!chosen) chosen = freeModels[0];
            
            this.modelId = chosen;
            console.log(`[${this.name}] Selected Model: ${this.modelId}`);
        } catch (e) {
            console.error("Failed to fetch models, falling back to Llama 3.3.");
            this.modelId = "meta-llama/llama-3.3-70b-instruct:free";
        }
    }

    async run(chatHistory) {
        await this.init(); // Ensure we have a model selected
        
        console.log(`[${this.name}] is typing...`);
        
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com",
                "X-Title": "Conclave Orchestrator",
            },
            body: JSON.stringify({
                model: this.modelId,
                messages: [
                    { role: "system", content: this.persona },
                    ...chatHistory 
                ],
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${await response.text()}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        console.log(`[${this.name}]: ${content.substring(0, 100)}...`); 
        return content;
    }
}

module.exports = AIModel;
