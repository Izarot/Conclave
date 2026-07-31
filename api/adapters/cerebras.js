export const providerName = "cerebras";

// 1. Dynamically fetch the models from Cerebras
export async function getModels() {
    try {
        const res = await fetch("https://api.cerebras.ai/v1/models", {
            headers: { 
                "Authorization": `Bearer ${process.env.CEREBRAS_API_KEY}`,
                "Accept": "application/json" 
            }
        });
        
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return [];

        const data = await res.json();
        
        if (data && data.data) {
            return data.data.map(m => ({
                id: `cerebras:${m.id}`,
                name: `⚡ [Cerebras] ${m.id}`
            }));
        }
    } catch (e) {
        console.error("Cerebras fetch failed:", e.message);
    }
    return [];
}

// 2. Tell the Conclave how to chat with Cerebras
export function getChatConfig(modelId, chatHistory) {
    return {
        url: "https://api.cerebras.ai/v1/chat/completions",
        headers: { 
            "Authorization": `Bearer ${process.env.CEREBRAS_API_KEY}`, 
            "Content-Type": "application/json"
        },
        body: { model: modelId, messages: chatHistory, max_tokens: 500 }
    };
}
