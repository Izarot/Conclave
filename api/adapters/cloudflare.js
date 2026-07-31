export const providerName = "cloudflare";

// 1. Dynamically fetch the models from Cloudflare
export async function getModels() {
    const accountId = process.env.CF_ACCOUNT_ID;
    const apiToken = process.env.CF_API_TOKEN;
    
    if (!accountId || !apiToken) {
        console.error("Cloudflare Adapter: Missing CF_ACCOUNT_ID or CF_API_TOKEN in env vars.");
        return [];
    }

    try {
        // FIXED: Cloudflare uses /ai/models/search to list models
        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search`, {
            method: "GET",
            headers: { 
                "Authorization": `Bearer ${apiToken}`,
                "Accept": "application/json" 
            }
        });
        
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            console.error("Cloudflare returned HTML instead of JSON.");
            return [];
        }

        const data = await res.json();
        
        if (!data.success) {
            console.error("Cloudflare API Error:", JSON.stringify(data.errors));
            return [];
        }
        
        if (data && data.result) {
            return data.result
                .filter(m => m.task?.type === "text-generation")
                .map(m => ({
                    id: `cloudflare:${m.name}`,
                    name: `☁️ [Cloudflare] ${m.name.replace('@cf/', '')}`
                }));
        }
    } catch (e) {
        console.error("Cloudflare fetch failed:", e.message);
    }
    return [];
}

// 2. Tell the Conclave how to chat with Cloudflare
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
