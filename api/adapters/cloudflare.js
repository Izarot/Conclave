export const providerName = "cloudflare";

export async function getModels() {
    const accountId = process.env.CF_ACCOUNT_ID;
    const apiToken = process.env.CF_API_TOKEN;
    
    if (!accountId || !apiToken) {
        console.error("CLOUDFLARE DEBUG: Missing CF_ACCOUNT_ID or CF_API_TOKEN. Account ID exists:", !!accountId, "Token exists:", !!apiToken);
        return [];
    }

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
            console.error("CLOUDFLARE DEBUG: API Rejected Request:", JSON.stringify(data.errors));
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
        return [];
    } catch (e) {
        console.error("CLOUDFLARE DEBUG: Fetch failed:", e.message);
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
