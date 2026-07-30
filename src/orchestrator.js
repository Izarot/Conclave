class Orchestrator {
    constructor(models) {
        this.models = models; // Array of AIModel instances
        this.chatHistory = []; // The shared group chat memory
    }

    async broadcast(message) {
        // Adds a message to the shared history
        this.chatHistory.push({ role: "user", content: message });
    }

    async start(userPrompt) {
        console.log("\n===============================");
        console.log("🏛️ CONCLAVE INITIATED");
        console.log("===============================\n");
        
        // --- PHASE 1: INDEPENDENT REASONING ---
        console.log("[Orchestrator]: Phase 1 - Independent Reasoning");
        const phase1Prompt = `The user has asked this question: "${userPrompt}"\n\nProvide your initial independent answer. Do not ask questions, just give your best take.`;
        this.broadcast(phase1Prompt);

        // We have to save their responses to add to the history
        const initialResponses = [];
        for (const model of this.models) {
            const response = await model.run(this.chatHistory);
            initialResponses.push(response);
            // Add the AI's response to the shared chat history
            this.chatHistory.push({ role: "assistant", content: `[${model.name}]: ${response}` });
        }

        // --- PHASE 2: THE DEBATE (GROUP CHAT) ---
        console.log("\n[Orchestrator]: Phase 2 - The Debate");
        const phase2Prompt = `You are in a group chat with other AI experts. Here are everyone's initial thoughts. Read them, argue your point, defend your idea, or concede if someone else has a better idea. Be concise but ruthless.`;
        this.broadcast(phase2Prompt);

        for (const model of this.models) {
            const debateResponse = await model.run(this.chatHistory);
            this.chatHistory.push({ role: "assistant", content: `[${model.name}]: ${debateResponse}` });
        }

        // --- PHASE 3: FINAL CONCLUSION ---
        console.log("\n[Orchestrator]: Phase 3 - Final Conclusion");
        // Pick the first model (The Analyst) to write the final summary based on the whole chat
        const finalPrompt = `The debate is over. Look at the entire chat history. Write the ultimate, final answer to the user's original question, incorporating the best points from the debate.`;
        this.broadcast(finalPrompt);
        
        const finalResult = await this.models[0].run(this.chatHistory);

        console.log("\n===============================");
        console.log("✅ CONCLAVE COMPLETE");
        console.log("===============================\n");
        return finalResult;
    }
}

module.exports = Orchestrator;
