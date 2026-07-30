class Orchestrator {
    constructor(models) {
        this.models = models; // Array of AIModels
        this.chatHistory = []; // Shared group chat memory
    }

    async processUserMessage(text) {
        // Add user's message to shared history
        this.chatHistory.push({ role: "user", content: text });

        // SECRET @ MENTION PARSING
        let targets = [];
        let cleanText = text;

        for (const model of this.models) {
            if (text.toLowerCase().includes(`@${model.name.toLowerCase()}`)) {
                targets.push(model);
                // Strip the @name out of the text so the AI doesn't see it
                cleanText = cleanText.replace(new RegExp(`@${model.name}`, "gi"), "").trim();
            }
        }

        // If no @mentions, everyone responds
        if (targets.length === 0) {
            targets = this.models;
        }

        // Overwrite the history with the clean text (no @ tags)
        this.chatHistory[this.chatHistory.length - 1].content = cleanText || text;

        const responses = [];

        for (const model of targets) {
            try {
                console.log(`\n[${model.name}] is typing...`);
                const response = await model.run(this.chatHistory);
                
                // Save AI response to shared history
                this.chatHistory.push({ role: "assistant", content: `[${model.name}]: ${response}` });
                
                responses.push({ name: model.name, text: response });
            } catch (e) {
                responses.push({ name: model.name, text: `Error: ${e.message}` });
            }
        }

        return responses;
    }
}

module.exports = Orchestrator;