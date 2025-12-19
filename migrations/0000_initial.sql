-- Migration number: 0000 	 2023-12-01T00:00:00.000Z

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- Books table
CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Full content just in case
    created_at INTEGER NOT NULL
);

-- Book chunks for RAG
CREATE TABLE IF NOT EXISTS book_chunks (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    content TEXT NOT NULL,
    page_number INTEGER,
    FOREIGN KEY(book_id) REFERENCES books(id)
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(book_id) REFERENCES books(id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT CHECK(role IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    feedback_json TEXT, -- JSON string for feedback
    created_at INTEGER NOT NULL,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id)
);
