export const providerName = "gateway";

// 1. Dynamically fetch the models from the Proxy Gateway
export async function getModels() {
    // We get the URL and Key from environment variables so you can use ANY gateway!
    const baseUrl = process.env.GATEWAY_BASE_URL;
    const apiKey = process.env.GATEWAY_API_KEY;

    if (!baseUrl || !apiKey) return [];

    try {
        const res = await fetch(`${baseUrl}/models`, {
            headers: { 
                "Authorization": `Bearer ${apiKey}`,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", // Bypass Cloudflare
                "Accept": "application/json" 
            }
        });
        
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            console.error("Gateway returned HTML. They are blocking the request.");
            return [];
        }

        const data = await res.json();
        
        if (data && data.data) {
            return data.data.map(m => ({
                id: `gateway:${m.id}`,
                name: `🌐 [Gateway] ${m.id}`
            }));
        }
    } catch (e) {
        console.error("Gateway fetch failed:", e.message);
    }
    
    return [];
}

// 2. Tell the Conclave how to chat with the Gateway
export function getChatConfig(modelId, chatHistory) {
    return {
        url: `${process.env.GATEWAY_BASE_URL}/chat/completions`,
        headers: { 
            "Authorization": `Bearer ${process.env.GATEWAY_API_KEY}`, 
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        body: { model: modelId, messages: chatHistory, max_tokens: 500 }
    };
}
