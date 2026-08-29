export const providerName = "requesty";

export async function getModels() {
    try {
        const res = await fetch("https://api.requesty.ai/v1/models", {
            headers: { 
                "Authorization": `Bearer ${process.env.REQUESTY_API_KEY}`,
                // Fake a real browser so Cloudflare doesn't block us
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json" 
            }
        });
        
        // If they send us HTML again, stop before trying to parse it as JSON
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            console.error("Requesty returned HTML instead of JSON. They are blocking Vercel.");
            return [];
        }

        const data = await res.json();
        
        if (data && data.data) {
            return data.data.map(m => ({
                id: `requesty:${m.id}`,
                name: `🔥 [Requesty] ${m.id}`
            }));
        }
    } catch (e) {
        console.error("Requesty fetch failed:", e.message);
    }
    
    return [];
}

export function getChatConfig(modelId, chatHistory) {
    return {
        url: "https://api.requesty.ai/v1/chat/completions",
        headers: { 
            "Authorization": `Bearer ${process.env.REQUESTY_API_KEY}`, 
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        body: { model: modelId, messages: chatHistory, max_tokens: 500 }
    };
}
