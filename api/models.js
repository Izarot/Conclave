export default async function handler(req, res) {
    let allModels = [];

    // 1. DeepInfra (Reliable, smart, free tier)
    allModels.push(
        { id: "deepinfra:meta-llama/Llama-3.3-70B-Instruct", name: "[DeepInfra] Llama 3.3 70B" },
        { id: "deepinfra:mistralai/Mixtral-8x7B-Instruct-v0.1", name: "[DeepInfra] Mixtral 8x7B" },
        { id: "deepinfra:meta-llama/Meta-Llama-3.1-8B-Instruct", name: "[DeepInfra] Llama 3.1 8B" }
    );

    // 2. Hugging Face (Free, open-source)
    allModels.push(
        { id: "hf:meta-llama/Meta-Llama-3-8B-Instruct", name: "[HF] Llama 3 8B" },
        { id: "hf:mistralai/Mistral-7B-Instruct-v0.3", name: "[HF] Mistral 7B" },
        { id: "hf:Qwen/Qwen2.5-7B-Instruct", name: "[HF] Qwen 2.5 7B" }
    );

    // 3. Pollinations (No key needed, good for quick tests)
    allModels.push(
        { id: "pollinations:openai", name: "[Pollinations] GPT-4o" },
        { id: "pollinations:llama", name: "[Pollinations] Llama 3" }
    );

    // 4. OpenRouter (Fetch dynamic free models)
    try {
        const orRes = await fetch("https://openrouter.ai/api/v1/models");
        const orData = await orRes.json();
        if (orData.data) {
            const orModels = orData.data
                .filter(m => m.id && m.pricing && m.pricing.prompt === "0")
                .map(m => ({ id: `openrouter:${m.id}`, name: `[OpenRouter] ${m.name.split('(')[0].trim()}` }));
            allModels.push(...orModels);
        }
    } catch (e) {
        console.error("Failed to fetch OR models");
    }

    res.status(200).json(allModels);
}
