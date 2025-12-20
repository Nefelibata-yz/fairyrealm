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

        // 1. 获取或创建对话 (Get or Create Conversation)
        let conversationId = existingConvId;
        if (!conversationId) {
            // 如果前端没有传 conversationId，说明是新对话。确保 User 存在并创建 Conversation。
            conversationId = await createConversation(c.env.DB, userId, bookId);
        }

        // 2. 保存用户消息 (Save User Message)
        // 将用户的输入存入数据库，作为对话历史的一部分
        await addMessage(c.env.DB, conversationId, 'user', message);

        // 3. RAG 检索: 获取上下文 (Get Context)
        // 根据用户的 message 和 bookId，去数据库查找相关的书籍片段 (Chunks)
        let bookContext = "";
        try {
            const chunks = await getBookChunks(c.env.DB, bookId, message);
            // 将检索到的多个片段合并成一个字符串供 AI 参考
            bookContext = chunks.map(ch => ch.content).join('\n\n');
            console.log('[Chat] Context found:', chunks.length, 'chunks');
        } catch (e) {
            console.error('[Chat] RAG Error:', e);
            bookContext = "Context retrieval failed.";
        }

        // 4. 获取历史记录 (Get History)
        // 从数据库拉取当前对话的上下文，以便 AI 拥有短期记忆
        const historyMessages = await getConversationHistory(c.env.DB, conversationId);
        const historyStrings = historyMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`);

        // 5. 组装 Prompt (Assemble Prompt)
        // 将书籍上下文、对话历史和当前用户消息组合成最终发给 LLM 的 Prompt
        const prompt = assemblePrompt(bookContext || 'No specific book context found.', historyStrings, message);

        // 6. 调用 Workers AI (Call Workers AI)
        // 使用 Cloudflare Workers AI 运行 Llama 3 (8B) 模型
        console.log('[Chat] Calling AI...');
        let aiJson: any;
        try {
            const response = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that outputs JSON.' }, // System Prompt 强制 JSON 输出
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' } // 显式要求 JSON 模式
            });

            console.log('[Chat] AI Response raw:', response);

            // 7. 解析 AI 响应 (Parse AI Response)
            let raw = (response as any).response || response;
            if (typeof raw !== 'string') raw = JSON.stringify(raw);
            // 清理可能存在的 Markdown 代码块标记 (```json ... ```)
            raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            aiJson = JSON.parse(raw);

        } catch (e: any) {
            console.error('[Chat] AI Failed:', e);
            // 降级处理 (Fallback): 如果 AI 调用失败或解析失败，返回通用的错误提示，避免前端崩溃
            aiJson = {
                reply: "I'm having trouble connecting to my brain right now. Please try again.",
                feedback: { grammar: "", vocabulary: "", encouragement: "" },
                requireRewrite: false
            };
        }

        // 8. 保存 AI 回复 (Save Assistant Message)
        // 将 AI 的回复及生成的 JSON 反馈存入数据库
        await addMessage(c.env.DB, conversationId, 'assistant', aiJson.reply, JSON.stringify(aiJson.feedback));

        // 9. 返回结果给前端 (Return Response)
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
