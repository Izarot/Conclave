export const providerName = "requesty";

// 1. Dynamically fetch the models from Requesty
export async function getModels() {
    try {
        const res = await fetch("https://api.requesty.ai/v1/models", {
            headers: { "Authorization": `Bearer ${process.env.REQUESTY_API_KEY}` }
        });
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

// 2. Tell the Conclave how to chat with Requesty
export function getChatConfig(modelId, chatHistory) {
    return {
        url: "https://api.requesty.ai/v1/chat/completions",
        headers: { 
            "Authorization": `Bearer ${process.env.REQUESTY_API_KEY}`, 
            "Content-Type": "application/json" 
        },
        body: { model: modelId, messages: chatHistory, max_tokens: 500 }
    };
}
