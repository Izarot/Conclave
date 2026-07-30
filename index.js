require('dotenv').config();
const AIModel = require('./src/model');
const Orchestrator = require('./src/orchestrator');

async function main() {
    // We get the prompt from environment variables (for GitHub Actions) or default to a test prompt
    const userPrompt = process.env.USER_PROMPT || "What is the most efficient way to travel between planets, considering current physics limitations?";

    const workerModel = new AIModel(
        "Worker-1", 
        "You are an expert problem solver. Be concise and logical."
    );

    const orchestrator = new Orchestrator();

    try {
        const finalResult = await orchestrator.start(userPrompt, workerModel);
        console.log("=========================================");
        console.log("📜 FINAL REFINED OUTPUT:");
        console.log("=========================================");
        console.log(finalResult);
        console.log("=========================================\n");
    } catch (error) {
        console.error("❌ Orchestration failed:", error.message);
        process.exit(1); // Exit with error code so GitHub Actions marks it as failed
    }
}

main();
