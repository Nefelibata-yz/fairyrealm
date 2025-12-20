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
    const [userId, setUserId] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isGuest, setIsGuest] = useState(true);
    const [guestId, setGuestId] = useState<string | null>(null);
    const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
    const [showAuth, setShowAuth] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        // 初始化游客 ID (Initialize Guest ID)
        let gId = localStorage.getItem('fairyrealm_guest_id');
        if (!gId) {
            gId = 'guest-' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('fairyrealm_guest_id', gId);
        }
        setGuestId(gId);

        // 恢复 Token (Restore Token)
        const savedToken = localStorage.getItem('fairyrealm_token');
        const savedUserId = localStorage.getItem('fairyrealm_user_id');
        if (savedToken && savedUserId) {
            setToken(savedToken);
            setUserId(savedUserId);
            setIsGuest(false);
        }

        // 获取书籍列表
        fetch(`${WORKER_URL}/api/books`)
            .then(res => res.json())
            .then((data: any) => {
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
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`${WORKER_URL}/api/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    bookId: selectedBook,
                    message: userMsg.content,
                    conversationId,
                    guestId: isGuest ? guestId : undefined
                })
            });

            if (res.status === 403) {
                const data = await res.json();
                if (data.limitReached) {
                    setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
                    setLoading(false);
                    return;
                }
            }

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

    const handleAuth = async () => {
        const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
        try {
            const res = await fetch(`${WORKER_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok) {
                if (authMode === 'login') {
                    setToken(data.token);
                    setUserId(data.userId);
                    setIsGuest(false);
                    localStorage.setItem('fairyrealm_token', data.token);
                    localStorage.setItem('fairyrealm_user_id', data.userId);
                    setShowAuth(false);
                    // 刷新页面或重置对话
                    setMessages([]);
                    setConversationId(undefined);
                } else {
                    alert('注册成功！请登录。');
                    setAuthMode('login');
                }
            } else {
                alert(data.error);
            }
        } catch (e) {
            alert('Auth failed');
        }
    };

    const logout = () => {
        setToken(null);
        setUserId(null);
        setIsGuest(true);
        localStorage.removeItem('fairyrealm_token');
        localStorage.removeItem('fairyrealm_user_id');
        setMessages([]);
        setConversationId(undefined);
    };

    return (
        <main className="container">
            <header>
                <div className="header-left">
                    <h1>FairyRealm 🧚</h1>
                    {isGuest ? (
                        <span className="badge-guest">游客模式 (剩余限制: 5次)</span>
                    ) : (
                        <span className="badge-user">已登录</span>
                    )}
                </div>

                <div className="header-right">
                    <div className="book-selector">
                        <select value={selectedBook} onChange={(e) => setSelectedBook(e.target.value)}>
                            {books.length > 0 ? (
                                books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)
                            ) : (
                                <option>Loading books...</option>
                            )}
                        </select>
                    </div>
                    {isGuest ? (
                        <button className="btn-small" onClick={() => setShowAuth(true)}>登录/注册</button>
                    ) : (
                        <button className="btn-small btn-secondary" onClick={logout}>退出</button>
                    )}
                </div>
            </header>

            {showAuth && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{authMode === 'login' ? '登录' : '注册'} FairyRealm</h3>
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                        <div className="modal-actions">
                            <button onClick={handleAuth}>{authMode === 'login' ? '确认登录' : '提交注册'}</button>
                            <button className="btn-secondary" onClick={() => setShowAuth(false)}>取消</button>
                        </div>
                        <p className="auth-switch" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                            {authMode === 'login' ? '还没有账号？去注册' : '已有账号？去登录'}
                        </p>
                    </div>
                </div>
            )}

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
