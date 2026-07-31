export const providerName = "pollinations";

export async function getModels() {
    try {
        const res = await fetch("https://text.pollinations.ai/models");
        const data = await res.json();
        
        if (Array.isArray(data)) {
            return data.map(m => ({
                id: `pollinations:${m.name}`,
                name: `🌻 [Pollinations] ${m.name}`
            }));
        }
    } catch (e) {
        console.error("Pollinations fetch failed:", e.message);
    }
    return [];
}

export function getChatConfig(modelId, chatHistory) {
    return {
        url: "https://text.pollinations.ai/openai",
        headers: { "Content-Type": "application/json" },
        body: { model: modelId, messages: chatHistory, max_tokens: 500 }
    };
}
