export const providerName = "sambanova";

// 1. Dynamically fetch the models from SambaNova
export async function getModels() {
    try {
        const res = await fetch("https://api.sambanova.ai/v1/models", {
            headers: { 
                "Authorization": `Bearer ${process.env.SAMBANOVA_API_KEY}`,
                "Accept": "application/json" 
            }
        });
        
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            console.error("SambaNova returned HTML instead of JSON. They are blocking Vercel.");
            return [];
        }

        const data = await res.json();
        
        if (data && data.data) {
            return data.data
                .filter(m => {
                    const id = m.id.toLowerCase();
                    // Filter out paid/trap models so they don't show up in the dropdown
                    return !id.includes("minimax");
                })
                .map(m => ({
                    id: `sambanova:${m.id}`,
                    name: `⚡ [SambaNova] ${m.id.split('/').pop()}`
                }));
        }
    } catch (e) {
        console.error("SambaNova fetch failed:", e.message);
    }
    
    return [];
}

// 2. Tell the Conclave how to chat with SambaNova
export function getChatConfig(modelId, chatHistory) {
    return {
        url: "https://api.sambanova.ai/v1/chat/completions",
        headers: { 
            "Authorization": `Bearer ${process.env.SAMBANOVA_API_KEY}`, 
            "Content-Type": "application/json"
        },
        body: { model: modelId, messages: chatHistory, max_tokens: 500 }
    };
}
