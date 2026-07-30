class Orchestrator {
    constructor(models) {
        this.models = models; 
        this.chatHistory = []; 
    }

    async processUserMessage(text) {
        let targets = [];
        let cleanText = text;

        for (const model of this.models) {
            if (text.toLowerCase().includes(`@${model.name.toLowerCase()}`)) {
                targets.push(model);
                cleanText = cleanText.replace(new RegExp(`@${model.name}`, "gi"), "").trim();
            }
        }

        if (targets.length === 0) {
            targets = this.models;
        }

        // Add user's message to shared history
        this.chatHistory.push({ role: "user", content: cleanText || text });

        const responses = [];
        const combinedResponses = [];

        for (const model of targets) {
            try {
                console.log(`\n[${model.name}] is typing...`);
                const response = await model.run(this.chatHistory);
                
                responses.push({ name: model.name, text: response });
                combinedResponses.push(`[${model.name}]: ${response}`);
            } catch (e) {
                responses.push({ name: model.name, text: `Error: ${e.message}` });
                combinedResponses.push(`[${model.name}]: Error: ${e.message}`);
            }
        }

        // CRITICAL FIX: Push all responses as a SINGLE 'assistant' turn
        // This keeps the history alternating strictly: user -> assistant -> user
        this.chatHistory.push({ role: "assistant", content: combinedResponses.join("\n\n") });

        return responses;
    }
}

module.exports = Orchestrator;