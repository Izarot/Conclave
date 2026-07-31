export default async function handler(req, res) {
    let allModels = [];

    const [gemRes, orRes] = await Promise.allSettled([
        fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`).then(r => r.json()),
        fetch("https://openrouter.ai/api/v1/models").then(r => r.json())
    ]);

    // 1. Google Gemini (Dynamic + Bulletproof Blacklist)
    if (gemRes.status === 'fulfilled' && gemRes.value.models) {
        const gemModels = gemRes.value.models
            .filter(m => {
                if (!m.supportedGenerationMethods?.includes("generateContent")) return false;
                const name = m.name.toLowerCase();
                
                // Blacklist: Pro models (require paid tier)
                if (name.includes("pro")) return false;
                // Blacklist: Deprecated models
                if (name.includes("2.5-flash")) return false;
                // Blacklist: Restricted/Preview models with limit: 0
                if (name.includes("omni")) return false;
                if (name.includes("antigravity") || name.includes("deep-research")) return false;
                // Blacklist: Non-text models
                if (name.includes("tts") || name.includes("image") || name.includes("audio") || name.includes("vision")) return false;
                if (name.includes("lyria") || name.includes("aqa") || name.includes("embedding")) return false;
                if (name.includes("gemma")) return false; 
                // Blacklist: 3.5-flash (hits high demand constantly, keep -lite)
                if (name.includes("3.5-flash") && !name.includes("lite")) return false;
                
                return true;
            })
            .map(m => ({ id: `gemini:${m.name.replace('models/', '')}`, name: `[Google] ${m.displayName || m.name}` }));
        allModels.push(...gemModels);
    }

    // 2. OpenRouter (Dynamic fetch, free models only)
    if (orRes.status === 'fulfilled' && orRes.value.data) {
        const orModels = orRes.value.data
            .filter(m => m.id && m.pricing && m.pricing.prompt === "0")
            .map(m => ({ id: `openrouter:${m.id}`, name: `[OpenRouter] ${m.name.split('(')[0].trim()}` }));
        allModels.push(...orModels);
    }

    res.status(200).json(allModels);
}
