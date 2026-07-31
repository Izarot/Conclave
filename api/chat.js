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
                case 'github':
                    url = "https://models.inference.ai.azure.com/chat/completions?api-version=2024-05-01-preview";
                    headers = { "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`, "Content-Type": "application/json" };
                    body = { model: actualModelId, messages: chatHistory, max_tokens: 500 };
                    break;
                case 'gemini':
                    url = `https://generativelanguage.googleapis.com/v1beta/models/${actualModelId}:generateContent?key=${process.env.GEMINI_API_KEY}`;
                    headers = { "Content-Type": "application/json" };
                    body = {
                        contents: chatHistory.map(msg => ({
                            role: msg.role === "assistant" ? "model" : "user",
                            parts: [{ text: msg.content }]
                        })),
                        generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
                    };
                    break;
                case 'openrouter':
                    url = "https://openrouter.ai/api/v1/chat/completions";
                    headers = { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": "https://vercel.app", "X-Title": "Conclave" };
                    body = { model: actualModelId, messages: chatHistory, max_tokens: 500 };
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
                let errorMsg = data.error?.message || data.detail || `HTTP ${apiRes.status} Error`;
                throw new Error(errorMsg);
            }
            
            let text;
            if (provider === 'gemini') {
                if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                    throw new Error("No response generated (likely blocked by safety filter).");
                }
                text = data.candidates[0].content.parts[0].text.trim();
            } else {
                if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
                    throw new Error("No response generated (likely blocked by safety filter).");
                }
                text = data.choices[0].message.content.trim();
            }

            // UPGRADED THOUGHT SLICER (Catches *, -, #, and numbers)
            const lines = text.split('\n');
            const cleanLines = lines.filter(line => {
                const trimmed = line.trim();
                return !trimmed.startsWith('*') && 
                       !trimmed.startsWith('-') && 
                       !trimmed.startsWith('#') && 
                       !trimmed.match(/^\d+\.\s/) && // Catches "1. "
                       !trimmed.startsWith('"');
            });
            
            // If we filtered out more than half the text, it was probably a thought leak, so take the last paragraph.
            if (cleanLines.length < lines.length / 2) {
                text = cleanLines.join('\n').trim() || lines[lines.length - 1].trim();
            } else {
                text = cleanLines.join('\n').trim();
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
