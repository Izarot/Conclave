export const providerName = "cloudflare";

export async function getModels() {
    // TEMPORARY: Hardcoded test model to bypass the list endpoint
    return [
        { id: "cloudflare:@cf/meta/llama-3.1-8b-instruct", name: "☁️ [Cloudflare] Llama 3.1 8B (Test)" }
    ];
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
