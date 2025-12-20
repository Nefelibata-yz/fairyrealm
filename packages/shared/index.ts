export interface User {
  id: string;
  email: string;
  created_at: number;
}

export interface Book {
  id: string;
  title: string;
  content: string; // Full text content
  created_at: number;
}

export interface BookChunk {
  id: string;
  book_id: string;
  content: string;
  page_number: number;
}

export interface Conversation {
  id: string;
  user_id: string;
  book_id: string;
  created_at: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  feedback?: Feedback; // JSON string stored in DB, parsed here
  created_at: number;
}

export interface Feedback {
  grammar: string;
  vocabulary: string;
  encouragement: string;
}

export interface ChatRequest {
  userId: string; // Temporarily passed from client for MVP
  bookId: string;
  message: string;
  conversationId?: string; // Optional, if new conversation
}

export interface ChatResponse {
  reply: string;
  feedback: Feedback;
  requireRewrite: boolean;
  conversationId: string;
  remainingMessages?: number;
  maxMessages?: number;
}
