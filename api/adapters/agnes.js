export const providerName = "agnes";

// 1. Dynamically fetch the models from Agnes AI
export async function getModels() {
    try {
        const res = await fetch("https://apihub.agnes-ai.com/v1/models", {
            headers: { 
                "Authorization": `Bearer ${process.env.AGNES_API_KEY}`,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", // Prevents Cloudflare blocking
                "Accept": "application/json" 
            }
        });
        
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            console.error("Agnes AI returned HTML instead of JSON. They are blocking Vercel.");
            return [];
        }

        const data = await res.json();
        
        if (data && data.data) {
            // Filter out image/video models, keep only text/chat models
            return data.data
                .filter(m => !m.id.includes("image") && !m.id.includes("video"))
                .map(m => ({
                    id: `agnes:${m.id}`,
                    name: `🧠 [Agnes] ${m.id}`
                }));
        }
    } catch (e) {
        console.error("Agnes AI fetch failed:", e.message);
    }
    
    return [];
}

// 2. Tell the Conclave how to chat with Agnes AI
export function getChatConfig(modelId, chatHistory) {
    return {
        url: "https://apihub.agnes-ai.com/v1/chat/completions",
        headers: { 
            "Authorization": `Bearer ${process.env.AGNES_API_KEY}`, 
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        body: { model: modelId, messages: chatHistory, max_tokens: 500 }
    };
}
