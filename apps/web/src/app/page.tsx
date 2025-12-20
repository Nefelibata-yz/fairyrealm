'use client';

import { useState, useEffect } from 'react';
import { ChatResponse, Feedback } from '@fairyrealm/shared';

// Hardcoded fallback for MVP if API fails initially (removed in favor of state)
// const BOOKS = ...

// 动态获取 API 地址 (Dynamic API URL)
// 在生产环境 (Cloudflare Pages) 中应该通过环境变量 NEXT_PUBLIC_API_URL 配置
// 如果未配置，则默认为 localhost (仅用于本地开发)
const WORKER_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function Home() {
    const [books, setBooks] = useState<any[]>([]);
    const [selectedBook, setSelectedBook] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | undefined>(undefined);
    const [userId] = useState('user-demo-' + Math.random().toString(36).substring(7)); // Demo user

    useEffect(() => {
        fetch(`${WORKER_URL}/api/books`)
            .then(res => res.json())
            .then((data: any) => {
                console.log('Fetched books:', data);
                if (Array.isArray(data)) {
                    setBooks(data);
                    if (data.length > 0) setSelectedBook(data[0].id);
                }
            })
            .catch(err => console.error('Failed to fetch books:', err));
    }, []);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch(`${WORKER_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    bookId: selectedBook,
                    message: userMsg.content,
                    conversationId
                })
            });

            if (!res.ok) throw new Error('API Error');

            const data: ChatResponse = await res.json();
            setConversationId(data.conversationId);

            const aiMsg = {
                role: 'assistant',
                content: data.reply,
                feedback: data.feedback,
                requireRewrite: data.requireRewrite
            };
            setMessages(prev => [...prev, aiMsg]);

        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'system', content: 'Error connecting to teacher.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="container">
            <header>
                <h1>FairyRealm 🧚</h1>
                <div className="book-selector">
                    <label>Choose a Book: </label>
                    <select value={selectedBook} onChange={(e) => setSelectedBook(e.target.value)}>
                        {books.length > 0 ? (
                            books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)
                        ) : (
                            <option>Loading books...</option>
                        )}
                    </select>
                </div>
            </header>

            <div className="chat-window">
                {messages.map((m, i) => (
                    <div key={i} className={`message ${m.role}`}>
                        <div className="bubble">
                            {m.content}
                        </div>
                        {m.feedback && (
                            <div className="feedback-card">
                                <h4>Teacher's Feedback:</h4>
                                {m.feedback.grammar && <p><strong>Grammar:</strong> {m.feedback.grammar}</p>}
                                {m.feedback.vocabulary && <p><strong>Vocabulary:</strong> {m.feedback.vocabulary}</p>}
                                <p><em>{m.feedback.encouragement}</em></p>
                                {m.requireRewrite && <div className="badge-retry">Please rewrite this! ✍️</div>}
                            </div>
                        )}
                    </div>
                ))}
                {loading && <div className="message assistant"><div className="bubble">Thinking...</div></div>}
            </div>

            <div className="input-area">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your answer in English..."
                />
                <button onClick={sendMessage} disabled={loading}>Send</button>
            </div>
        </main>
    );
}
