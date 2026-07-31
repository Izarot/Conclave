export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { message, history, models } = req.body;
    if (!models || models.length === 0) return res.status(400).json({ error: "No models selected" });

    const chatHistory = [...history, { role: "user", content: message }];
    const responses = [];
    const combinedResponses = [];

    const promises = models.map(async (modelObj) => {
        const displayName = modelObj.nickname || modelObj.id;
        try {
            const [provider, ...rest] = modelObj.id.split(':');
            const actualModelId = rest.join(':');
            
            let url, headers, body;

            switch (provider) {
                case 'github':
                    url = "https://models.inference.ai.azure.com/chat/completions";
                    headers = { "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`, "Content-Type": "application/json" };
                    body = { model: actualModelId, messages: chatHistory, max_tokens: 200 };
                    break;
                case 'openrouter':
                    url = "https://openrouter.ai/api/v1/chat/completions";
                    headers = { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": "https://vercel.app", "X-Title": "Conclave" };
                    body = { model: actualModelId, messages: chatHistory, max_tokens: 200 };
                    break;
                case 'pollinations':
                    url = "https://text.pollinations.ai/openai";
                    headers = { "Content-Type": "application/json" };
                    body = { model: actualModelId, messages: chatHistory, max_tokens: 200 };
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
            if (!apiRes.ok) throw new Error(data.error?.message || "API Error");
            
            const text = data.choices[0].message.content.trim();
            responses.push({ name: displayName, text });
            combinedResponses.push(`[${displayName}]: ${text}`);
        } catch (e) {
            responses.push({ name: displayName, text: `Error: ${e.message}` });
            combinedResponses.push(`[${displayName}]: Error: ${e.message}`);
        }
    });

    await Promise.all(promises);

    res.status(200).json({
        responses: responses,
        history: [...chatHistory, { role: "assistant", content: combinedResponses.join("\n\n") }]
    });
}