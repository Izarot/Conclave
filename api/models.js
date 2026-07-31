export default async function handler(req, res) {
    let allModels = [];

    // Fetch all 4 providers in parallel!
    const [diRes, hfRes, orRes, pollRes] = await Promise.allSettled([
        // 1. DeepInfra (Requires Auth)
        fetch("https://api.deepinfra.com/v1/openai/models", {
            headers: { "Authorization": `Bearer ${process.env.DEEPINFRA_API_KEY}` }
        }).then(r => r.json()),
        
        // 2. Hugging Face (Public API, no key needed to list)
        fetch("https://huggingface.co/api/models?filter=text-generation&sort=downloads&direction=-1&limit=50").then(r => r.json()),
        
        // 3. OpenRouter (Public API)
        fetch("https://openrouter.ai/api/v1/models").then(r => r.json()),
        
        // 4. Pollinations (Public API)
        fetch("https://text.pollinations.ai/models").then(r => r.json())
    ]);

    // Process DeepInfra
    if (diRes.status === 'fulfilled' && diRes.value.data) {
        const diModels = diRes.value.data
            .filter(m => m.id)
            .map(m => ({ id: `deepinfra:${m.id}`, name: `[DeepInfra] ${m.id.split('/').pop()}` }));
        allModels.push(...diModels);
    }

    // Process Hugging Face
    if (hfRes.status === 'fulfilled' && Array.isArray(hfRes.value)) {
        const hfModels = hfRes.value
            .filter(m => m.pipeline_tag === 'text-generation')
            .map(m => ({ id: `hf:${m.id}`, name: `[HF] ${m.id.split('/').pop()}` }));
        allModels.push(...hfModels);
    }

    // Process OpenRouter (Free models only)
    if (orRes.status === 'fulfilled' && orRes.value.data) {
        const orModels = orRes.value.data
            .filter(m => m.id && m.pricing && m.pricing.prompt === "0")
            .map(m => ({ id: `openrouter:${m.id}`, name: `[OpenRouter] ${m.name.split('(')[0].trim()}` }));
        allModels.push(...orModels);
    }

    // Process Pollinations
    if (pollRes.status === 'fulfilled' && Array.isArray(pollRes.value)) {
        const pollModels = pollRes.value
            .map(m => ({ id: `pollinations:${m.name}`, name: `[Pollinations] ${m.name}` }));
        allModels.push(...pollModels);
    }

    res.status(200).json(allModels);
}
