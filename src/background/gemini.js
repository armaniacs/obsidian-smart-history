export class GeminiClient {
    constructor() { }

    async generateSummary(content, apiKey, modelName = 'gemini-1.5-flash') {
        if (!apiKey) {
            console.warn("Gemini API Key not found.");
            return "No API Key provided.";
        }

        // Sanitize model name (remove 'models/' prefix if present to avoid duplication)
        const cleanModelName = modelName.replace(/^models\//, '');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName}:generateContent?key=${apiKey}`;
        console.log("Gemini URL:", url);

        // Truncate content if too long (approx token limit safety)
        const truncatedContent = content.substring(0, 30000);

        const payload = {
            contents: [{
                parts: [{
                    text: `以下のWebページの内容を、日本語で簡潔に要約してください。1文または2文で、重要なポイントをまとめてください。\n\nContent:\n${truncatedContent}`
                }]
            }]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                // If model not found, try to list available models
                if (response.status === 404) {
                    const availableModels = await this.listModels(apiKey);
                    throw new Error(`Gemini API Error: 404 Model not found. Available models: ${availableModels}`);
                }
                throw new Error(`Gemini API Error: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            // Extract text from response
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            } else {
                return "No summary generated.";
            }

        } catch (error) {
            console.error("Gemini Request Failed:", error);
            return `Error generating summary: ${error.message}`;
        }
    }

    async listModels(apiKey) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
             if (!response.ok) return "Unable to fetch models";
            const data = await response.json();
            return data.models ? data.models.map(m => m.name).join(', ') : "No models returned";
        } catch (e) {
            return `List models failed: ${e.message}`;
        }
    }
}
