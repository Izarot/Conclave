const API_URL = "https://openrouter.ai/api/v1/chat/completions";

class AIModel {
    constructor(name, systemPrompt) {
        this.name = name;
        this.systemPrompt = systemPrompt;
        this.modelId = "google/gemini-2.0-flash-exp:free"; // Reliable, fast, free
    }

    async run(prompt) {
        console.log(`[${this.name}] is thinking...`);
        
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
                    { role: "system", content: this.systemPrompt },
                    { role: "user", content: prompt }
                ],
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${await response.text()}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        console.log(`[${this.name}] finished thinking.`);
        return content;
    }
}

module.exports = AIModel;
