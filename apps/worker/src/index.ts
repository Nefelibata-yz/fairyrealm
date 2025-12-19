import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ChatRequest, ChatResponse, Feedback } from '@fairyrealm/shared';
import { assemblePrompt, TEACHER_PERSONA_VERSION } from '@fairyrealm/prompts';
import { getBookChunks, createConversation, addMessage, getConversationHistory } from './db';

type Bindings = {
    DB: D1Database;
    AI: any;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

app.get('/', (c) => {
    return c.text('FairyRealm Worker is running!');
});

app.get('/api/books', async (c) => {
    try {
        const { results } = await c.env.DB.prepare('SELECT id, title FROM books').all();
        return c.json(results || []);
    } catch (e: any) {
        console.error('Failed to get books:', e);
        return c.json({ error: e.message }, 500);
    }
});

app.post('/api/chat', async (c) => {
    try {
        const body = await c.req.json<ChatRequest>();
        const { userId, bookId, message, conversationId: existingConvId } = body;

        console.log('[Chat] Request:', { userId, bookId, message, existingConvId });

        if (!userId || !bookId || !message) {
            return c.json({ error: 'Missing required fields' }, 400);
        }

        // 1. Get or Create Conversation
        let conversationId = existingConvId;
        if (!conversationId) {
            // This helper now ensures the USER exists before creating the conversation
            conversationId = await createConversation(c.env.DB, userId, bookId);
        }

        // 2. Save User Message
        await addMessage(c.env.DB, conversationId, 'user', message);

        // 3. RAG: Get Context
        let bookContext = "";
        try {
            const chunks = await getBookChunks(c.env.DB, bookId, message);
            bookContext = chunks.map(ch => ch.content).join('\n\n');
            console.log('[Chat] Context found:', chunks.length, 'chunks');
        } catch (e) {
            console.error('[Chat] RAG Error:', e);
            bookContext = "Context retrieval failed.";
        }

        // 4. Get History
        const historyMessages = await getConversationHistory(c.env.DB, conversationId);
        const historyStrings = historyMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`);

        // 5. Assemble Prompt
        const prompt = assemblePrompt(bookContext || 'No specific book context found.', historyStrings, message);

        // 6. Call Workers AI
        console.log('[Chat] Calling AI...');
        let aiJson: any;
        try {
            const response = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that outputs JSON.' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' }
            });

            console.log('[Chat] AI Response raw:', response);

            // 7. Parse AI Response
            let raw = (response as any).response || response;
            if (typeof raw !== 'string') raw = JSON.stringify(raw);
            // Clean markdown
            raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            aiJson = JSON.parse(raw);

        } catch (e: any) {
            console.error('[Chat] AI Failed:', e);
            // Fallback response so the UI doesn't break completely
            aiJson = {
                reply: "I'm having trouble connecting to my brain right now. Please try again.",
                feedback: { grammar: "", vocabulary: "", encouragement: "" },
                requireRewrite: false
            };
        }

        // 8. Save Assistant Message
        await addMessage(c.env.DB, conversationId, 'assistant', aiJson.reply, JSON.stringify(aiJson.feedback));

        // 9. Return Response
        const result: ChatResponse = {
            reply: aiJson.reply,
            feedback: aiJson.feedback,
            requireRewrite: aiJson.requireRewrite,
            conversationId
        }

        return c.json(result);

    } catch (err: any) {
        console.error('[Chat] Critical Error:', err);
        return c.json({ error: err.message }, 500);
    }
});

export default app;
