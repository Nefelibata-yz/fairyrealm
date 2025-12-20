import { Book, BookChunk, Message, Conversation } from '@fairyrealm/shared';

// 获取原本的书籍分块 (RAG 检索)
// 这是一个简单的 V1 实现，实际生产中应该使用 Vector Database (Vectorize)
export async function getBookChunks(db: D1Database, bookId: string, query: string): Promise<BookChunk[]> {
    // 简单的检索：目前只返回该书的前 5 个分块
    // 未来改进：使用向量检索 (Vector Search) 找到与 query 最相关的分块
    const { results } = await db.prepare(
        'SELECT * FROM book_chunks WHERE book_id = ? LIMIT 5'
    ).bind(bookId).all<BookChunk>();
    return results;
}

// 创建新的对话会话

// 根据 Email 获取用户 (用于登录检查)
export async function getUserByEmail(db: D1Database, email: string) {
    return await db.prepare(
        'SELECT * FROM users WHERE email = ? AND is_guest = 0'
    ).bind(email).first<{ id: string, password_hash: string }>();
}

// 创建注册用户
export async function createUser(db: D1Database, email: string, passwordHash: string): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();
    await db.prepare(
        'INSERT INTO users (id, email, password_hash, is_guest, created_at) VALUES (?, ?, ?, 0, ?)'
    ).bind(id, email, passwordHash, now).run();
    return id;
}

// 获取游客的当前消息数
export async function getGuestMessageCount(db: D1Database, guestId: string): Promise<number> {
    const result = await db.prepare(
        'SELECT COUNT(*) as count FROM messages m JOIN conversations c ON m.conversation_id = c.id JOIN users u ON c.user_id = u.id WHERE u.guest_id = ? AND u.is_guest = 1'
    ).bind(guestId).first<{ count: number }>();
    return result?.count || 0;
}

// 修改原有的 createConversation，增加对 Guest 的支持
export async function createConversation(db: D1Database, userId: string, bookId: string, isGuest: boolean = false): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    // 如果用户不存在，则创建一个基本记录 (兼容老逻辑，但以后主要靠注册)
    if (isGuest) {
        // 确保游客记录存在
        await db.prepare(
            'INSERT OR IGNORE INTO users (id, email, is_guest, guest_id, created_at) VALUES (?, ?, 1, ?, ?)'
        ).bind(userId, `guest_${userId}@temp.com`, userId, now).run();
    }

    // 插入新的对话记录
    await db.prepare(
        'INSERT INTO conversations (id, user_id, book_id, created_at) VALUES (?, ?, ?, ?)'
    ).bind(id, userId, bookId, now).run();

    return id;
}

// 添加一条消息到数据库
export async function addMessage(db: D1Database, conversationId: string, role: 'user' | 'assistant', content: string, feedbackJson?: string) {
    const id = crypto.randomUUID();
    const now = Date.now();
    // 修改说明：Schema 中列名为 `feedback_json`，代码原先使用了 `feedback` 导致 D1_ERROR
    await db.prepare(
        'INSERT INTO messages (id, conversation_id, role, content, feedback_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, conversationId, role, content, feedbackJson || null, now).run();
}

// 获取对话历史记录
export async function getConversationHistory(db: D1Database, conversationId: string): Promise<Message[]> {
    // 获取当前会话的所有消息，按时间正序排列
    const { results } = await db.prepare(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).bind(conversationId).all<Message & { feedback_json?: string }>();

    // 解析 feedback JSON (如果存在)
    // 数据库中存储的是 feedback_json (string)，需要解析为对象赋值给 feedback
    return results.map(m => ({
        ...m,
        // 这里需要注意：m 对象直接来自 SELECT *，包含 feedback_json 字段
        // 我们将其解析并赋值给 feedback 属性以符合 Message 接口
        feedback: m.feedback_json ? JSON.parse(m.feedback_json) : undefined
    }));
}
