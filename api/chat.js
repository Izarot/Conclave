import { setTimeout } from 'timers/promises';

export const maxDuration = 60;

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
                default:
                    throw new Error("Unknown provider");
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            const apiRes = await fetch(url, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(body),
                signal: controller.signal
            });
            clearTimeout(timeout);

            const data = await apiRes.json();
            if (!apiRes.ok) {
                // FIXED: Safely stringify the error object so we never see [object Object] again
                let errorMsg;
                if (data.error) {
                    errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
                } else if (data.detail) {
                    errorMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
                } else {
                    errorMsg = `HTTP ${apiRes.status} Error`;
                }
                throw new Error(errorMsg);
            }
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
                throw new Error("No response generated (likely blocked by safety filter).");
            }

            let text = data.choices[0].message.content.trim();

            const thoughtMarkers = ["We need to", "The user", "I should", "Okay, the user", "Hmm,", "Let's", "I will output"];
            for (const marker of thoughtMarkers) {
                if (text.startsWith(marker)) {
                    const answerStart = text.lastIndexOf('\n');
                    if (answerStart > 0 && answerStart < text.length - 1) {
                        text = text.substring(answerStart).trim();
                    }
                }
            }
            
            const nameRegex = new RegExp(`^\\[?(${displayName})\\]?:\\s*`, 'i');
            text = text.replace(nameRegex, '');

            responses.push({ name: displayName, text });
            combinedResponses.push(`[${displayName}]: ${text}`);
        } catch (e) {
            let errMsg = e.message;
            if (e.name === 'AbortError') errMsg = "Timed out after 15s.";
            responses.push({ name: displayName, text: `Error: ${errMsg}` });
            combinedResponses.push(`[${displayName}]: Error: ${errMsg}`);
        }
    });

    await Promise.all(promises);

    res.status(200).json({
        responses: responses,
        history: [...chatHistory.slice(1), { role: "assistant", content: combinedResponses.join("\n\n") }]
    });
}
