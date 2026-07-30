require('dotenv').config();
const AIModel = require('./src/model');
const Orchestrator = require('./src/orchestrator');

async function main() {
    const userPrompt = process.env.USER_PROMPT || "Should humanity focus on building a Mars colony or an underwater city first?";

    // Create our 3 experts
    const analyst = new AIModel(
        "Analyst", 
        "You are The Analyst. You are purely logical, focus on data, costs, and structural feasibility. You speak concisely."
    );
    
    const creative = new AIModel(
        "Creative", 
        "You are The Creative. You think about human culture, inspiration, and out-of-the-box ideas. You are optimistic."
    );
    
    const critic = new AIModel(
        "Critic", 
        "You are The Critic. You are harsh, cynical, and look for every possible flaw, danger, and risk. You do not sugarcoat things."
    );

    const orchestrator = new Orchestrator([analyst, creative, critic]);

    try {
        const finalResult = await orchestrator.start(userPrompt);
        console.log("=========================================");
        console.log("📜 FINAL CONCLAVE DECISION:");
        console.log("=========================================");
        console.log(finalResult);
        console.log("=========================================\n");
    } catch (error) {
        console.error("❌ Orchestration failed:", error.message);
        process.exit(1);
    }
}

main();
