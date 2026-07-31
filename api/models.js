export default async function handler(req, res) {
    let allModels = [];

    // Fetch NVIDIA, Z.AI, OpenRouter, and Google in parallel
    const [nvRes, zaiRes, orRes, gemRes] = await Promise.allSettled([
        // 1. NVIDIA NIM (Dynamic fetch)
        fetch("https://integrate.api.nvidia.com/v1/models", {
            headers: { "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}` }
        }).then(r => r.json()),
        
        // 2. Z.AI (Dynamic fetch)
        fetch("https://open.bigmodel.cn/api/paas/v4/models", {
            headers: { "Authorization": `Bearer ${process.env.ZAI_API_KEY}` }
        }).then(r => r.json()),
        
        // 3. OpenRouter (Dynamic fetch)
        fetch("https://openrouter.ai/api/v1/models").then(r => r.json()),
        
        // 4. Google Gemini (Dynamic fetch)
        fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`).then(r => r.json())
    ]);

    // Process NVIDIA
    if (nvRes.status === 'fulfilled' && nvRes.value.data) {
        const nvModels = nvRes.value.data
            .filter(m => m.id)
            .map(m => ({ id: `nvidia:${m.id}`, name: `[NVIDIA] ${m.id.split('/').pop()}` }));
        allModels.push(...nvModels);
    }

    // Process Z.AI
    if (zaiRes.status === 'fulfilled' && zaiRes.value.data) {
        const zaiModels = zaiRes.value.data
            .filter(m => m.id)
            .map(m => ({ id: `zai:${m.id}`, name: `[Z.AI] ${m.id}` }));
        allModels.push(...zaiModels);
    }

    // Process OpenRouter (Free models only)
    if (orRes.status === 'fulfilled' && orRes.value.data) {
        const orModels = orRes.value.data
            .filter(m => m.id && m.pricing && m.pricing.prompt === "0")
            .map(m => ({ id: `openrouter:${m.id}`, name: `[OpenRouter] ${m.name.split('(')[0].trim()}` }));
        allModels.push(...orModels);
    }

    // Process Google Gemini (Dynamic + Ultimate Blacklist)
    if (gemRes.status === 'fulfilled' && gemRes.value.models) {
        const gemModels = gemRes.value.models
            .filter(m => {
                if (!m.supportedGenerationMethods?.includes("generateContent")) return false;
                const name = m.name.toLowerCase();
                if (name.includes("pro")) return false; 
                if (name.includes("2.0") || name.includes("2.5")) return false; 
                if (name.includes("robotics") || name.includes("computer-use")) return false;
                if (name.includes("omni") || name.includes("antigravity") || name.includes("deep-research")) return false;
                if (name.includes("tts") || name.includes("image") || name.includes("audio") || name.includes("vision")) return false;
                if (name.includes("lyria") || name.includes("aqa") || name.includes("embedding")) return false;
                if (name.includes("gemma")) return false; 
                if (name.includes("3.5-flash") && !name.includes("lite")) return false; 
                return true;
            })
            .map(m => ({ id: `gemini:${m.name.replace('models/', '')}`, name: `[Google] ${m.displayName || m.name}` }));
        allModels.push(...gemModels);
    }

    res.status(200).json(allModels);
}
