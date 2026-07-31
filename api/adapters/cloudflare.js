export const providerName = "cloudflare";

export async function getModels() {
    // 1. TEMPORARY TEST MODEL
    const testModels = [{ id: "cloudflare:test-model", name: "☁️ [Cloudflare] Test Model" }];

    const accountId = process.env.CF_ACCOUNT_ID;
    const apiToken = process.env.CF_API_TOKEN;
    
    if (!accountId || !apiToken) {
        console.error("Cloudflare Adapter: Missing CF_ACCOUNT_ID or CF_API_TOKEN in Vercel env vars.");
        return testModels; // Return the test model so we can prove the file is loading
    }

    try {
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
            return testModels;
        }

        const data = await res.json();
        console.log("Cloudflare Raw Response:", JSON.stringify(data).substring(0, 500));
        
        if (!data.success) {
            console.error("Cloudflare API Error:", JSON.stringify(data.errors));
            return testModels;
        }
        
        if (data && data.result) {
            const realModels = data.result
                .filter(m => m.task?.type === "text-generation")
                .map(m => ({
                    id: `cloudflare:${m.name}`,
                    name: `☁️ [Cloudflare] ${m.name.replace('@cf/', '')}`
                }));
            return [...testModels, ...realModels];
        }
        return testModels;
    } catch (e) {
        console.error("Cloudflare fetch failed:", e.message);
        return testModels;
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
