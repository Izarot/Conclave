export const providerName = "neuroapi";

// 1. Dynamically fetch the models from NeuroAPI
export async function getModels() {
    try {
        const res = await fetch("https://neuroapi.host/v1/models", {
            headers: { "Authorization": `Bearer ${process.env.NEUROAPI_KEY}` }
        });
        const data = await res.json();
        
        if (data && data.data) {
            // Return all models dynamically found on their API
            return data.data.map(m => ({
                id: `neuroapi:${m.id}`,
                name: `🧠 [NeuroAPI] ${m.id}`
            }));
        }
    } catch (e) {
        console.error("NeuroAPI fetch failed:", e.message);
    }
    
    return []; // Return empty if it fails or no key is set
}

// 2. Tell the Conclave how to chat with NeuroAPI
export function getChatConfig(modelId, chatHistory) {
    return {
        url: "https://neuroapi.host/v1/chat/completions",
        headers: { 
            "Authorization": `Bearer ${process.env.NEUROAPI_KEY}`, 
            "Content-Type": "application/json" 
        },
        body: { model: modelId, messages: chatHistory, max_tokens: 500 }
    };
}
