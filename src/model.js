const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

class AIModel {
    constructor(name, persona) {
        this.name = name;
        this.persona = persona;
    }

    async run(chatHistory) {
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