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
export async function createConversation(db: D1Database, userId: string, bookId: string): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    // 确保用户存在 (解决外键约束 FOREIGN KEY constraint)
    // 如果用户已存在则忽略
    await db.prepare(
        'INSERT OR IGNORE INTO users (id, email, created_at) VALUES (?, ?, ?)'
    ).bind(userId, 'demo@example.com', now).run();

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
