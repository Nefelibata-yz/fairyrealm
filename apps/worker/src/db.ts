import { Book, BookChunk, Message, Conversation } from '@fairyrealm/shared';

export async function getBookChunks(db: D1Database, bookId: string, query: string): Promise<BookChunk[]> {
    // Simple V1: just get all chunks for the book (for small MVP) or rudimentary match
    // In reality, we'd use Vectorize here.
    const { results } = await db.prepare(
        'SELECT * FROM book_chunks WHERE book_id = ? LIMIT 5'
    ).bind(bookId).all<BookChunk>();
    return results;
}

export async function createConversation(db: D1Database, userId: string, bookId: string): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();

    // Ensure user exists (Fix for FOREIGN KEY constraint)
    await db.prepare(
        'INSERT OR IGNORE INTO users (id, email, created_at) VALUES (?, ?, ?)'
    ).bind(userId, 'demo@example.com', now).run();

    await db.prepare(
        'INSERT INTO conversations (id, user_id, book_id, created_at) VALUES (?, ?, ?, ?)'
    ).bind(id, userId, bookId, now).run();

    return id;
}

export async function addMessage(db: D1Database, conversationId: string, role: 'user' | 'assistant', content: string, feedbackJson?: string) {
    const id = crypto.randomUUID();
    const now = Date.now();
    await db.prepare(
        'INSERT INTO messages (id, conversation_id, role, content, feedback, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, conversationId, role, content, feedbackJson || null, now).run();
}

export async function getConversationHistory(db: D1Database, conversationId: string): Promise<Message[]> {
    const { results } = await db.prepare(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).bind(conversationId).all<Message>();

    // Parse feedback JSON if needed, though interface handles it
    return results.map(m => ({
        ...m,
        feedback: m.feedback ? JSON.parse(m.feedback as unknown as string) : undefined
    }));
}
