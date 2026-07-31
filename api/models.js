export default async function handler(req, res) {
    let allModels = [];

    // Fetch Google and OpenRouter in parallel
    const [gemRes, orRes] = await Promise.allSettled([
        fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`).then(r => r.json()),
        fetch("https://openrouter.ai/api/v1/models").then(r => r.json())
    ]);

    // 1. Google Gemini (Dynamic fetch + Smart Filter)
    if (gemRes.status === 'fulfilled' && gemRes.value.models) {
        const gemModels = gemRes.value.models
            .filter(m => {
                // Must support text generation
                if (!m.supportedGenerationMethods?.includes("generateContent")) return false;
                // Filter out experimental/broken models (TTS, Image, Audio, deprecated)
                const name = m.name.toLowerCase();
                if (name.includes("tts") || name.includes("image") || name.includes("audio") || name.includes("vision")) return false;
                if (name.includes("2.5-flash") && !name.includes("latest")) return false; // Filter deprecated 2.5
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
