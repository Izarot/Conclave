const API_URL = "https://openrouter.ai/api/v1/chat/completions";

class AIModel {
    constructor(name, persona) {
        this.name = name;
        this.persona = persona;
        this.modelId = "google/gemini-2.0-flash-exp:free"; 
    }

    async run(chatHistory) {
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
                    ...chatHistory // Pass the whole conversation history!
                ],
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${await response.text()}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        console.log(`[${this.name}]: ${content.substring(0, 100)}...`); // Preview their message
        return content;
    }
}

module.exports = AIModel;
