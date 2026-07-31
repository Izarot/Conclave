export default async function handler(req, res) {
    let allModels = [];

    // Hardcoded GitHub models (if you add GITHUB_TOKEN to Vercel, the chat route will use it)
    allModels.push(
        { id: "github:gpt-4o", name: "[GitHub] GPT-4o" },
        { id: "github:Llama-3.3-70B-Instruct", name: "[GitHub] Llama 3.3 70B" },
        { id: "github:Phi-3.5-mini-instruct", name: "[GitHub] Phi 3.5 Mini" }
    );

    // Fetch OpenRouter and Pollinations in parallel
    const [orRes, pollRes] = await Promise.allSettled([
        fetch("https://openrouter.ai/api/v1/models").then(r => r.json()),
        fetch("https://text.pollinations.ai/models").then(r => r.json())
    ]);

    if (orRes.status === 'fulfilled' && orRes.value.data) {
        const orModels = orRes.value.data
            .filter(m => m.id && m.pricing && m.pricing.prompt === "0")
            .map(m => ({ id: `openrouter:${m.id}`, name: `[OpenRouter] ${m.name.split('(')[0].trim()}` }));
        allModels.push(...orModels);
    }

    if (pollRes.status === 'fulfilled' && Array.isArray(pollRes.value)) {
        const pollModels = pollRes.value
            .map(m => ({ id: `pollinations:${m.name}`, name: `[Pollinations] ${m.name}` }));
        allModels.push(...pollModels);
    }

    res.status(200).json(allModels);
}