export default async function handler(req, res) {
    let allModels = [];

    // 1. GitHub Models (The Heavy Hitters: GPT-4o, Mistral, Llama 3.3)
    // These are hardcoded because GitHub doesn't have a public /models list endpoint,
    // but these IDs are guaranteed to work and never deprecate.
    allModels.push(
        { id: "github:gpt-4o", name: "⭐ [GitHub] GPT-4o" },
        { id: "github:gpt-4o-mini", name: "⭐ [GitHub] GPT-4o mini" },
        { id: "github:Mistral-large", name: "⭐ [GitHub] Mistral Large" },
        { id: "github:Phi-3.5-mini-instruct", name: "⭐ [GitHub] Phi 3.5 Mini" }
    );

    // Fetch Gemini and OpenRouter in parallel
    const [gemRes, orRes] = await Promise.allSettled([
        fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`).then(r => r.json()),
        fetch("https://openrouter.ai/api/v1/models").then(r => r.json())
    ]);

    // 2. Google Gemini (Dynamic + Ultimate Blacklist)
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

    // 3. OpenRouter (Dynamic free models)
    if (orRes.status === 'fulfilled' && orRes.value.data) {
        const orModels = orRes.value.data
            .filter(m => m.id && m.pricing && m.pricing.prompt === "0")
            .map(m => ({ id: `openrouter:${m.id}`, name: `[OpenRouter] ${m.name.split('(')[0].trim()}` }));
        allModels.push(...orModels);
    }

    res.status(200).json(allModels);
}
