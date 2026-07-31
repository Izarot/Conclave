export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { message, history, models } = req.body;
    if (!models || models.length === 0) return res.status(400).json({ error: "No models selected" });

    const systemPrompt = { 
        role: "system", 
        content: "You are an AI assistant in a group chat. Answer the user directly. CRITICAL RULE: Do NOT output your internal reasoning, thought process, or planning. Output ONLY your final response." 
    };

    const chatHistory = [systemPrompt, ...history, { role: "user", content: message }];
    const responses = [];
    const combinedResponses = [];

    const promises = models.map(async (modelObj) => {
        const displayName = modelObj.nickname || modelObj.id;
        try {
            const [provider, ...rest] = modelObj.id.split(':');
            const actualModelId = rest.join(':');
            
            let url, headers, body;

            switch (provider) {
                case 'deepinfra':
                    url = "https://api.deepinfra.com/v1/openai/chat/completions";
                    headers = { "Authorization": `Bearer ${process.env.DEEPINFRA_API_KEY}`, "Content-Type": "application/json" };
                    body = { model: actualModelId, messages: chatHistory, max_tokens: 300 };
                    break;
                case 'hf':
                    url = "https://api-inference.huggingface.co/v1/chat/completions";
                    headers = { "Authorization": `Bearer ${process.env.HF_TOKEN}`, "Content-Type": "application/json" };
                    body = { model: actualModelId, messages: chatHistory, max_tokens: 300 };
                    break;
                case 'openrouter':
                    url = "https://openrouter.ai/api/v1/chat/completions";
                    headers = { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": "https://vercel.app", "X-Title": "Conclave" };
                    body = { model: actualModelId, messages: chatHistory, max_tokens: 300 };
                    break;
                case 'pollinations':
                    url = "https://text.pollinations.ai/openai";
                    headers = { "Content-Type": "application/json" };
                    body = { model: actualModelId, messages: chatHistory, max_tokens: 300 };
                    break;
                default:
                    throw new Error("Unknown provider");
            }

            const apiRes = await fetch(url, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(body)
            });

            const data = await apiRes.json();
            if (!apiRes.ok) {
                // Extract the exact error message from the provider
                const errorMsg = data.error?.message || data.detail || data.message || `HTTP ${apiRes.status} Error`;
                console.error(`🔴 [${provider}] REJECTED:`, errorMsg);
                throw new Error(errorMsg);
            }

            let text = data.choices[0].message.content.trim();

            // Aggressive Thought Slicer
            const thoughtMarkers = ["We need to", "The user", "I should", "Okay, the user", "Hmm,", "Let's", "I will output"];
            for (const marker of thoughtMarkers) {
                if (text.startsWith(marker)) {
                    const answerStart = text.lastIndexOf('\n');
                    if (answerStart > 0 && answerStart < text.length - 1) {
                        text = text.substring(answerStart).trim();
                    }
                }
            }
            
            // Clean up if the model accidentally includes its name
            const nameRegex = new RegExp(`^\\[?(${displayName})\\]?:\\s*`, 'i');
            text = text.replace(nameRegex, '');

            responses.push({ name: displayName, text });
            combinedResponses.push(`[${displayName}]: ${text}`);
        } catch (e) {
            console.error(`🔴 [${provider}] ERROR:`, e.message);
            responses.push({ name: displayName, text: `Error: ${e.message}` });
            combinedResponses.push(`[${displayName}]: Error: ${e.message}`);
        }
    });

    await Promise.all(promises);

    res.status(200).json({
        responses: responses,
        history: [...chatHistory.slice(1), { role: "assistant", content: combinedResponses.join("\n\n") }]
    });
}
