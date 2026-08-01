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
        
        if (!data.success) {
            console.error("Cloudflare API Error:", JSON.stringify(data.errors));
            return [];
        }
        
        if (data && data.result) {
            return data.result
                .filter(m => {
                    // FIXED: Cloudflare uses task.name, not task.type!
                    let taskName = "";
                    if (typeof m.task === 'string') taskName = m.task;
                    else if (m.task && m.task.name) taskName = m.task.name;
                    
                    // Only keep Text Generation models
                    const isTextGen = taskName.toLowerCase().includes("text");
                    
                    // Filter out audio/image/embedding junk just to be safe
                    const name = m.name.toLowerCase();
                    const isJunk = name.includes("embed") || name.includes("image") || name.includes("whisper") || name.includes("speech") || name.includes("pipecat") || name.includes("dumb");
                    
                    return isTextGen && !isJunk;
                })
                .map(m => ({
                    id: `cloudflare:${m.name}`,
                    name: `☁️ [Cloudflare] ${m.name.replace('@cf/', '')}`
                }));
        }
        return [];
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
