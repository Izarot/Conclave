export default async function handler(req, res) {
    let allModels = [];

    // 1. Google Gemini (Direct API - 1500 requests/day free)
    allModels.push(
        { id: "gemini:gemini-1.5-flash-latest", name: "[Google] Gemini 1.5 Flash" },
        { id: "gemini:gemini-1.5-pro-latest", name: "[Google] Gemini 1.5 Pro" }
    );

    // 2. OpenRouter (Fetch dynamic free models - 50 requests/day free)
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
