class Orchestrator {
    constructor() {
        this.state = {
            originalPrompt: "",
            reasoningRound: "",
            refinedResult: "",
        };
    }

    async start(userPrompt, model) {
        console.log("\n===============================");
        console.log("🏛️ CONCLAVE INITIATED");
        console.log("===============================\n");
        
        this.state.originalPrompt = userPrompt;
        
        // Round 1: Reasoning
        console.log("[Orchestrator]: Starting Round 1 - Initial Reasoning");
        const reasoningPrompt = `User Request: "${userPrompt}"\n\nProvide your initial independent reasoning and solution.`;
        this.state.reasoningRound = await model.run(reasoningPrompt);
        
        // Round 2: Refinement
        console.log("\n[Orchestrator]: Starting Round 2 - Self-Refinement");
        const refinementPrompt = `Your initial reasoning was:\n"${this.state.reasoningRound}"\n\nReview your own reasoning. Find flaws, correct mistakes, and provide a highly polished, final version.`;
        this.state.refinedResult = await model.run(refinementPrompt);

        console.log("\n===============================");
        console.log("✅ CONCLAVE COMPLETE");
        console.log("===============================\n");
        return this.state.refinedResult;
    }
}

module.exports = Orchestrator;
