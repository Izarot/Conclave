require('dotenv').config();
const readline = require('readline');
const AIModel = require('./src/model');
const Orchestrator = require('./src/orchestrator');

async function main() {
    const analyst = new AIModel("Analyst", "You are The Analyst. Purely logical, focused on data and facts. Be concise.");
    const creative = new AIModel("Creative", "You are The Creative. Optimistic, out-of-the-box thinker. Be concise.");
    const critic = new AIModel("Critic", "You are The Critic. Harsh, cynical, finds flaws. Be concise.");

    const orchestrator = new Orchestrator([analyst, creative, critic]);

    console.log("\n===============================");
    console.log("🏛️ CONCLAVE GROUP CHAT INITIATED");
    console.log("===============================");
    console.log('Type a message to talk to everyone.');
    console.log('Use @Analyst, @Creative, or @Critic to target someone secretly.');
    console.log('Type "exit" to quit.\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'You: '
    });

    rl.prompt();

    rl.on('line', async (input) => {
        if (input.toLowerCase().trim() === 'exit') {
            rl.close();
            return;
        }

        // Process the message through the orchestrator
        const responses = await orchestrator.processUserMessage(input);

        // Print everyone's responses
        for (const res of responses) {
            console.log(`\n=========================================`);
            console.log(`[${res.name}]:`);
            console.log(`=========================================`);
            console.log(res.text);
        }
        console.log("\n"); // Spacing
        
        rl.prompt();
    });
}

main();