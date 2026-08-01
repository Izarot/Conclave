export const providerName = "cloudflare";

export async function getModels() {
    const accountId = process.env.CF_ACCOUNT_ID;
    const apiToken = process.env.CF_API_TOKEN;
    
    if (!accountId || !apiToken) return [];

    try {
        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search`, {
            method: "GET",
            headers: { 
                "Authorization": `Bearer ${apiToken}`,
                "Accept": "application/json" 
            }
        });
        
        const data = await res.json();
        
        if (!data.success || !data.result) return [];

        // 1. Filter for text-generation models only
        const candidateModels = data.result.filter(m => {
            let taskName = "";
            if (typeof m.task === 'string') taskName = m.task;
            else if (m.task && m.task.name) taskName = m.task.name;
            
            const isTextGen = taskName.toLowerCase().includes("text");
            const name = m.name.toLowerCase();
            const isJunk = name.includes("embed") || name.includes("image") || name.includes("whisper") || name.includes("speech") || name.includes("pipecat") || name.includes("dumb");
            
            return isTextGen && !isJunk;
        });

        // 2. Test each model with a 1-token request
        const testModel = async (m) => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                
                const testRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`, {
                    method: "POST",
                    headers: { 
                        "Authorization": `Bearer ${apiToken}`, 
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: m.name,
                        messages: [{ role: "user", content: "hi" }],
                        max_tokens: 1
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeout);
                
                const testData = await testRes.json();
                
                // FIXED: Check for OpenAI 'choices' array OR Cloudflare 'success' flag
                if (testRes.ok && (testData.choices || testData.success)) {
                    return { id: `cloudflare:${m.name}`, name: `☁️ [Cloudflare] ${m.name.replace('@cf/', '')}` };
                }
                return null; // Paid or broken model
            } catch (e) {
                return null;
            }
        };

        // Run all tests in parallel
        const testedModels = await Promise.all(candidateModels.map(m => testModel(m)));
        return testedModels.filter(m => m !== null);

    } catch (e) {
        console.error("Cloudflare fetch failed:", e.message);
        return [];
    }
}

export function getChatConfig(modelId, chatHistory) {
    return {
        url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/v1/chat/completions`,
        headers: { 
            "Authorization": `Bearer ${process.env.CF_API_TOKEN}`, 
            "Content-Type": "application/json"
        },
        body: { model: modelId, messages: chatHistory, max_tokens: 500 }
    };
}
