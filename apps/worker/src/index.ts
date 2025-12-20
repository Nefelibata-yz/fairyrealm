import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ChatRequest, ChatResponse, Feedback } from '@fairyrealm/shared';
import { assemblePrompt, TEACHER_PERSONA_VERSION } from '@fairyrealm/prompts';
import { getBookChunks, createConversation, addMessage, getConversationHistory, getUserByEmail, createUser, getGuestMessageCount } from './db';
import { hashPassword, verifyPassword, signJWT, verifyJWT } from './auth';

type Bindings = {
    DB: D1Database;
    AI: any;
    JWT_SECRET: string;
};

const MAX_GUEST_MESSAGES = 5;

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

app.get('/', (c) => {
    return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>FairyRealm API 🧚</title>
            <style>
                body { font-family: -apple-system, sans-serif; background: #f8fafc; color: #1e293b; padding: 2rem; }
                .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 800px; margin: 0 auto; }
                h1 { color: #6366f1; border-bottom: 2px solid #eef2ff; padding-bottom: 1rem; }
                .endpoint { margin: 1.5rem 0; padding: 1rem; border-left: 4px solid #6366f1; background: #f5f3ff; }
                code { background: #e0e7ff; padding: 0.2rem 0.4rem; border-radius: 4px; }
                .method { font-weight: bold; color: #4338ca; display: inline-block; width: 60px; }
                p { line-height: 1.6; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>FairyRealm API Documentation 🧚</h1>
                <p>欢迎来到魔法王国后端接口页面。下面是当前可用的接口说明：</p>
                
                <div class="endpoint">
                    <span class="method">GET</span> <code>/api/books</code>
                    <p><strong>功能：</strong> 获取所有可用的魔法书籍列表。</p>
                </div>

                <div class="endpoint">
                    <span class="method">POST</span> <code>/api/chat</code>
                    <p><strong>功能：</strong> 与 AI 老师对话。支持 RAG 检索和游客频率限制（5条）。</p>
                </div>

                <div class="endpoint">
                    <span class="method">POST</span> <code>/api/auth/register</code>
                    <p><strong>功能：</strong> 注册新学徒账号。</p>
                </div>

                <div class="endpoint">
                    <span class="method">POST</span> <code>/api/auth/login</code>
                    <p><strong>功能：</strong> 登录并获取身份令牌 (JWT)。</p>
                </div>

                <p style="margin-top:2rem; font-size: 0.9rem; color: #64748b;">
                    Powered by Cloudflare Workers & AI ✨
                </p>
            </div>
        </body>
        </html>
    `);
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

// 注册接口 (User Registration)
app.post('/api/auth/register', async (c) => {
    try {
        const { email, password } = await c.req.json();
        if (!email || !password) return c.json({ error: '请填写邮箱和密码' }, 400);

        const existing = await getUserByEmail(c.env.DB, email);
        if (existing) return c.json({ error: '该邮箱已被注册' }, 400);

        const passwordHash = await hashPassword(password);
        const userId = await createUser(c.env.DB, email, passwordHash);

        return c.json({ success: true, userId });
    } catch (e: any) {
        console.error('[Register] Error:', e);
        return c.json({ error: e.message }, 500);
    }
});

// 登录接口 (User Login)
app.post('/api/auth/login', async (c) => {
    try {
        const { email, password } = await c.req.json();
        const user = await getUserByEmail(c.env.DB, email);

        if (!user || !(await verifyPassword(password, user.password_hash))) {
            return c.json({ error: '邮箱或密码错误' }, 401);
        }

        const token = await signJWT({ userId: user.id }, c.env.JWT_SECRET);
        return c.json({ token, userId: user.id });
    } catch (e: any) {
        console.error('[Login] Error:', e);
        return c.json({ error: e.message }, 500);
    }
});

app.post('/api/chat', async (c) => {
    try {
        const authHeader = c.req.header('Authorization');
        let userId: string | null = null;
        let isGuest = true;

        // 1. 身份验证 (Authentication Check)
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = await verifyJWT(token, c.env.JWT_SECRET);
            if (payload) {
                userId = payload.userId;
                isGuest = false;
            }
        }

        const body = await c.req.json<ChatRequest & { guestId?: string }>();
        const { bookId, message, conversationId: existingConvId, guestId } = body;

        // 如果是游客，使用前端传来的 guestId 作为临时 ID
        if (isGuest) {
            if (!guestId) return c.json({ error: '游客模式需要提供 Guest ID' }, 400);
            userId = guestId;

            // 2. 游客频率限制 (Guest Message Limit)
            const count = await getGuestMessageCount(c.env.DB, guestId);
            if (count >= MAX_GUEST_MESSAGES) {
                return c.json({
                    error: '已达到试用上限',
                    reply: `您已达到游客对话限制（${MAX_GUEST_MESSAGES}条）。请登录以继续无限对话并保存历史记录！ 🧚`,
                    limitReached: true,
                    remainingMessages: 0,
                    maxMessages: MAX_GUEST_MESSAGES
                }, 403);
            }
        }

        console.log('[Chat] Request:', { userId, isGuest, bookId, message, existingConvId });

        if (!userId || !bookId || !message) {
            return c.json({ error: '缺少必要参数' }, 400);
        }

        // 3. 获取或创建对话 (Get or Create Conversation)
        let conversationId = existingConvId;
        if (!conversationId) {
            // 如果前端没有传 conversationId，说明是新对话。确保 User 存在并创建 Conversation。
            conversationId = await createConversation(c.env.DB, userId, bookId, isGuest);
        }

        // 4. 保存用户消息 (Save User Message)
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
            conversationId,
            remainingMessages: isGuest ? MAX_GUEST_MESSAGES - (await getGuestMessageCount(c.env.DB, guestId!)) : undefined,
            maxMessages: isGuest ? MAX_GUEST_MESSAGES : undefined
        }

        return c.json(result);

    } catch (err: any) {
        console.error('[Chat] Critical Error:', err);
        return c.json({ error: err.message }, 500);
    }
});

app.get('/api/usage', async (c) => {
    try {
        const guestId = c.req.query('guestId');
        if (!guestId) return c.json({ error: 'Guest ID required' }, 400);

        const count = await getGuestMessageCount(c.env.DB, guestId);
        return c.json({
            remainingMessages: Math.max(0, MAX_GUEST_MESSAGES - count),
            maxMessages: MAX_GUEST_MESSAGES
        });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default app;
