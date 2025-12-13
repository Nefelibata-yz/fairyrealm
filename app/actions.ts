'use server';

import { getCloudflareContext } from "@opennextjs/cloudflare";


interface AiBinding {
    run: (model: string, options: { messages: unknown[] }) => Promise<unknown>;
}

export async function submitMessage(bookId: string, message: string, history: { role: string; content: string }[] = []) {
    try {
        const { env } = await getCloudflareContext();
        const ai = (env as unknown as { AI: AiBinding }).AI;

        if (!ai) {
            throw new Error('Cloudflare AI binding not found');
        }

        const systemPrompt = `You are a helpful literary assistant. You are discussing the book with ID "${bookId}". 
    Reference the book's content, themes, and characters in your response. 
    Keep your responses concise and engaging.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.map(h => ({ role: h.role, content: h.content })), // Pass limited history if needed, for now just the current turn or simplified
            { role: 'user', content: message }
        ];

        // Using Llama 3 8B as it is commonly available and fast
        const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
            messages,
        });

        // unexpected return type handling, usually it returns { response: string } or stream
        // assuming non-stream for simplicity first
        if (response && typeof response === 'object' && 'response' in response) {
            return (response as { response: string }).response;
        }

        return "No response from AI.";

    } catch (error) {
        console.error('AI Error:', error);
        return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
}
