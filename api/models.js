export const maxDuration = 60; 

export default async function handler(req, res) {
    let allModels = [];

    const [ghRes, nvRes, orRes, gemRes] = await Promise.allSettled([
        fetch("https://models.inference.ai.azure.com/models?api-version=2024-05-01-preview", {
            headers: { "Authorization": `Bearer ${process.env.GITHUB_TOKEN}` }
        }).then(r => r.json()),
        
        fetch("https://integrate.api.nvidia.com/v1/models", {
            headers: { "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}` }
        }).then(r => r.json()),
        
        fetch("https://openrouter.ai/api/v1/models").then(r => r.json()),
        
        fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`).then(r => r.json())
    ]);

    // 1. Process GitHub Models
    if (ghRes.status === 'fulfilled') {
        const ghData = ghRes.value;
        // Check for Azure format (value) or OpenAI format (data)
        const ghModelsArray = ghData.value || ghData.data;
        
        if (ghModelsArray && Array.isArray(ghModelsArray)) {
            const ghModels = ghModelsArray
                .filter(m => m.id || m.name)
                .map(m => ({ id: `github:${m.id || m.name}`, name: `⭐ [GitHub] ${m.name || m.id}` }));
            allModels.push(...ghModels);
        } else {
            // This will print the exact error to the Vercel logs if GitHub rejects us!
            console.error("GitHub Fetch Failed:", JSON.stringify(ghData));
        }
    }

    // 2. Process NVIDIA NIM (Dynamic + Test ALL)
    if (nvRes.status === 'fulfilled' && nvRes.value.data) {
        const nvCandidateIds = nvRes.value.data.map(m => m.id);

        const testNvidiaModel = async (modelId) => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 4000);
                const testRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
                    signal: controller.signal
                });
                clearTimeout(timeout);
                const testData = await testRes.json();
                if (testRes.ok && testData.choices) {
                    return { id: `nvidia:${modelId}`, name: `[NVIDIA] ${modelId.split('/').pop()}` };
                }
                return null;
            } catch (e) {
                return null;
            }
        };

        const nvidiaResults = await Promise.all(nvCandidateIds.map(id => testNvidiaModel(id)));
        const activeNvidiaModels = nvidiaResults.filter(m => m !== null);
        allModels.push(...activeNvidiaModels);
    }

    // 3. Process OpenRouter
    if (orRes.status === 'fulfilled' && orRes.value.data) {
        const orModels = orRes.value.data
            .filter(m => m.id && m.pricing && m.pricing.prompt === "0")
            .map(m => ({ id: `openrouter:${m.id}`, name: `[OpenRouter] ${m.name.split('(')[0].trim()}` }));
        allModels.push(...orModels);
    }

    // 4. Process Google Gemini
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
