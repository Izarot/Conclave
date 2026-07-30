require('dotenv').config();
const readline = require('readline');
const { AIModel, getWorkingModels } = require('./src/model');
const Orchestrator = require('./src/orchestrator');

async function main() {
    // 1. Find 3 distinct working models from Google
    const workingModelIds = await getWorkingModels(3);
    
    // Pad the array just in case Google only had 2 working models today
    while(workingModelIds.length < 3) {
        workingModelIds.push(workingModelIds[0]);
    }

    // 2. Assign a different model to each persona
    const analyst = new AIModel("Analyst", "You are The Analyst. Purely logical, focused on data and facts. Be concise.", workingModelIds[0]);
    const creative = new AIModel("Creative", "You are The Creative. Optimistic, out-of-the-box thinker. Be concise.", workingModelIds[1]);
    const critic = new AIModel("Critic", "You are The Critic. Harsh, cynical, finds flaws. Be concise.", workingModelIds[2]);

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

        const responses = await orchestrator.processUserMessage(input);

        for (const res of responses) {
            console.log(`\n=========================================`);
            console.log(`[${res.name}]:`);
            console.log(`=========================================`);
            console.log(res.text);
        }
        console.log("\n"); 
        
        rl.prompt();
    });
}

main();