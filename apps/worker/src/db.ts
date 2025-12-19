import { BookChunk, Conversation, Message } from '@fairyrealm/shared';

export async function getBookChunks(db: D1Database, bookId: string, query: string): Promise<BookChunk[]> {
    // Simple V1 RAG: text match
    // In a real app, use Vector Search (pgvector / vectorize)
    const stmt = db.prepare('SELECT * FROM book_chunks WHERE book_id = ? AND content LIKE ? LIMIT 3');
    // Simple keyword matching: just take the first word from query to test or just return random chunks if query is too complex for LIKE
    // For this MVP, we will try to find chunks that contain some part of the user message.
    // Actually, to make it work 'somewhat' for MVP without Vectorize, let's just fetch random chunks for the book
    // OR match if the query contains specific keywords.

    // Let's do a simple LIKE query with the whole message usually won't match anything.
    // Fallback: Get chunks that match ANY word... too complex for SQL LIKE.

    // Revised V1 for MVP validation: Just return the first 3 chunks of the book to simulate context.
    // In production this MUST be vector search.
    const { results } = await db.prepare('SELECT * FROM book_chunks WHERE book_id = ? LIMIT 3')
        .bind(bookId)
        .all<BookChunk>();

    return results || [];
}

export async function createConversation(db: D1Database, userId: string, bookId: string): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();
    await db.prepare('INSERT INTO conversations (id, user_id, book_id, created_at) VALUES (?, ?, ?, ?)')
        .bind(id, userId, bookId, now)
        .run();
    return id;
}

export async function addMessage(db: D1Database, conversationId: string, role: 'user' | 'assistant', content: string, feedbackJson?: string) {
    const id = crypto.randomUUID();
    const now = Date.now();
    await db.prepare('INSERT INTO messages (id, conversation_id, role, content, feedback_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(id, conversationId, role, content, feedbackJson || null, now)
        .run();
}

export async function getConversationHistory(db: D1Database, conversationId: string): Promise<Message[]> {
    const { results } = await db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
        .bind(conversationId)
        .all<Message>();
    return results || [];
}
