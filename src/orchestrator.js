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

        this.chatHistory.push({ role: "user", content: cleanText || text });

        const responses = [];

        for (const model of targets) {
            try {
                console.log(`\n[${model.name}] is typing...`);
                
                // We no longer need to inject the persona into the chat history!
                // The model.js handles it via systemInstruction.
                const response = await model.run(this.chatHistory);
                
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