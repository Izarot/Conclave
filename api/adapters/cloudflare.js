export const providerName = "cloudflare";

export async function getModels() {
    // Hardcoded active models (Cloudflare's list endpoint is notoriously flaky)
    return [
        { id: "cloudflare:@cf/meta/llama-3-8b-instruct", name: "☁️ [Cloudflare] Llama 3 8B" },
        { id: "cloudflare:@cf/qwen/qwen1.5-14b-chat-awq", name: "☁️ [Cloudflare] Qwen 1.5 14B" }
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