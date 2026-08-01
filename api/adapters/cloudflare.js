export const providerName = "cloudflare";

export async function getModels() {
    // TEMPORARY: Hardcoded test model to bypass the list endpoint
    return [
        { id: "cloudflare:@cf/meta/llama-3.1-8b-instruct", name: "☁️ [Cloudflare] Llama 3.1 8B (Test)" }
    ];
}

export function getChatConfig(modelId, chatHistory) {
    const accountId = process.env.CF_ACCOUNT_ID;
    const apiToken = process.env.CF_API_TOKEN;
    
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
    
    // DEBUG: Print the URL to the Vercel logs to see if Account ID is missing
    console.log("CLOUDFLARE URL:", url);
    
    return {
        url: url,
        headers: { 
            "Authorization": `Bearer ${apiToken}`, 
            "Content-Type": "application/json"
        },
        body: { model: modelId, messages: chatHistory, max_tokens: 500 }
    };
}
