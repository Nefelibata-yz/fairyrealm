'use client';

import { useState, useEffect } from 'react';
import { ChatResponse, Feedback } from '@fairyrealm/shared';

const getWorkerUrl = () => {
    let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
    }
    return url;
};

const WORKER_URL = getWorkerUrl();

// 默认书籍信息 (Fallback/Default Book)
const DEFAULT_BOOK = {
    id: 'charlottes-web',
    title: "Charlotte's Web",
    cover: '/charlottes-web.png'
};

export default function Home() {
    const [books, setBooks] = useState<any[]>([DEFAULT_BOOK]);
    const [selectedBook, setSelectedBook] = useState(DEFAULT_BOOK.id);
    const [messages, setMessages] = useState<any[]>([
        {
            role: 'assistant',
            content: "Welcome to our literature class! Today, we're diving into 'Charlotte's Web' by E.B. White. We'll explore the themes of friendship, sacrifice, and the cycle of life through the eyes of a very special pig and a wise spider. Are you ready to begin our close reading of the first chapter?",
            feedback: null
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | undefined>(undefined);
    const [userId, setUserId] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isGuest, setIsGuest] = useState(true);
    const [guestId, setGuestId] = useState<string | null>(null);
    const [remainingMessages, setRemainingMessages] = useState<number | null>(5);
    const [maxMessages, setMaxMessages] = useState<number>(5);
    const [showAuth, setShowAuth] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const [showBookModal, setShowBookModal] = useState(false);

    // TTS Function
    const speak = (text: string) => {
        if (!isVoiceEnabled) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    // STT Function
    const startRecording = () => {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (!SpeechRecognition) {
            alert('您的浏览器不支持语音识别。');
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => setIsRecording(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
        };
        recognition.start();
    };

    useEffect(() => {
        let gId = localStorage.getItem('fairyrealm_guest_id');
        if (!gId) {
            gId = 'guest-' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('fairyrealm_guest_id', gId);
        }
        setGuestId(gId);

        const savedToken = localStorage.getItem('fairyrealm_token');
        const savedUserId = localStorage.getItem('fairyrealm_user_id');
        if (savedToken && savedUserId) {
            setToken(savedToken);
            setUserId(savedUserId);
            setIsGuest(false);
        }

        fetch(`${WORKER_URL}/api/books`)
            .then(res => res.json())
            .then((data: any) => {
                if (Array.isArray(data) && data.length > 0) {
                    // 合并默认书籍和 API 返回的书籍，确保不重复
                    const merged = [DEFAULT_BOOK, ...data.filter(b => b.id !== DEFAULT_BOOK.id)];
                    setBooks(merged);
                }
            })
            .catch(err => console.error('获取书籍失败:', err));

        if (gId) {
            fetch(`${WORKER_URL}/api/usage?guestId=${gId}`)
                .then(res => res.json())
                .then((data: any) => {
                    if (data.remainingMessages !== undefined) {
                        setRemainingMessages(data.remainingMessages);
                        setMaxMessages(data.maxMessages || 5);
                    }
                })
                .catch(err => console.error('获取用量失败:', err));
        }
    }, []);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

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
                    setRemainingMessages(0);
                    setLoading(false);
                    return;
                }
            }

            if (!res.ok) throw new Error('网络连接错误');

            const data: ChatResponse = await res.json();
            setConversationId(data.conversationId);
            if (data.remainingMessages !== undefined) setRemainingMessages(data.remainingMessages);

            const aiMsg = {
                role: 'assistant',
                content: data.reply,
                feedback: data.feedback,
                requireRewrite: data.requireRewrite
            };
            setMessages(prev => [...prev, aiMsg]);
            speak(data.reply);

        } catch (err: any) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'system', content: `连接失败: ${err.message}` }]);
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
                    setMessages([]);
                    setConversationId(undefined);
                } else {
                    alert('注册成功！请登录。');
                    setAuthMode('login');
                }
            } else {
                alert(data.error || '认证失败');
            }
        } catch (e) {
            alert('网络连接失败');
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

    const selectedBookTitle = books.find(b => b.id === selectedBook)?.title || DEFAULT_BOOK.title;

    return (
        <main className="container">
            <header>
                <div className="header-left">
                    <h1>FairyRealm 🧚</h1>
                </div>
                <div className="header-right">
                    <button className="btn-select-book" onClick={() => setShowBookModal(true)}>
                        📖 {selectedBookTitle}
                    </button>
                </div>
            </header>

            {/* 书籍选择弹窗 (Book Selection Modal) */}
            {showBookModal && (
                <div className="modal-overlay" onClick={() => setShowBookModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>选择文学作品</h2>
                        <div className="book-grid">
                            {books.map(book => (
                                <div
                                    key={book.id}
                                    className={`book-card ${selectedBook === book.id ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedBook(book.id);
                                        setShowBookModal(false);
                                        setMessages([]); // 换书重置
                                        setConversationId(undefined);
                                    }}
                                >
                                    <img src={book.cover || '/charlottes-web.png'} alt={book.title} className="book-cover" />
                                    <div className="book-title">{book.title}</div>
                                </div>
                            ))}
                        </div>
                        <button className="btn-close" onClick={() => setShowBookModal(false)}>关闭</button>
                    </div>
                </div>
            )}

            <div className={`auth-widget ${showAuth ? 'active' : ''}`}>
                <div className="auth-trigger" onClick={() => setShowAuth(!showAuth)}>
                    {isGuest ? (
                        <div className="guest-info">
                            <span className="icon">👤</span>
                            <span className="text">游客模式 (剩余 {remainingMessages} 次)</span>
                            <div className="guest-hint-bubble">
                                注册账号以保存学习进度并获得无限次 AI 教学！🧚✨
                            </div>
                        </div>
                    ) : (
                        <div className="user-info">
                            <span className="icon">✨</span>
                            <span className="text">已登录: {email.split('@')[0]}</span>
                        </div>
                    )}
                </div>

                {showAuth && (
                    <div className="auth-panel glass">
                        {isGuest ? (
                            <>
                                <h3>{authMode === 'login' ? '登录' : '注册'}</h3>
                                <div className="input-group">
                                    <input type="email" placeholder="邮箱" value={email} onChange={e => setEmail(e.target.value)} />
                                    <input type="password" placeholder="密码" value={password} onChange={e => setPassword(e.target.value)} />
                                </div>
                                <div className="auth-actions">
                                    <button className="btn-glow" onClick={handleAuth}>{authMode === 'login' ? '进入' : '开启旅程'}</button>
                                    <p className="auth-switch" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                                        {authMode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="logged-in-state">
                                <p>欢迎回来！</p>
                                <button className="btn-outline" onClick={logout}>退出登录</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="chat-window">
                {messages.map((m, i) => (
                    <div key={i} className={`message ${m.role}`}>
                        <div className="bubble-container" style={{ position: 'relative' }}>
                            <div className="bubble">
                                {m.content}
                            </div>
                            {m.role === 'assistant' && (
                                <button
                                    className="btn-icon tts-btn"
                                    onClick={() => {
                                        const originalState = isVoiceEnabled;
                                        setIsVoiceEnabled(true);
                                        speak(m.content);
                                        setIsVoiceEnabled(originalState);
                                    }}
                                    title="播放语音"
                                    style={{ position: 'absolute', right: '-45px', top: '0' }}
                                >
                                    🔊
                                </button>
                            )}
                        </div>
                        {m.feedback && (
                            <div className="feedback-card">
                                <h4>老师的反馈:</h4>
                                {m.feedback.grammar && <p><strong>语法:</strong> {m.feedback.grammar}</p>}
                                {m.feedback.vocabulary && <p><strong>词汇:</strong> {m.feedback.vocabulary}</p>}
                                <p><em>{m.feedback.encouragement}</em></p>
                                {m.requireRewrite && <div className="badge-retry">请尝试重写这一句！✍️</div>}
                            </div>
                        )}
                    </div>
                ))}
                {loading && <div className="message assistant"><div className="bubble">老师正在思考中...</div></div>}
            </div>

            <div className="input-area">
                <div className="voice-controls">
                    <button
                        className={`btn-icon ${isVoiceEnabled ? 'active-primary' : ''}`}
                        onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                        title={isVoiceEnabled ? "静音" : "开启声音"}
                        style={{ background: isVoiceEnabled ? 'var(--primary)' : 'none', color: isVoiceEnabled ? 'white' : 'var(--text-ai)' }}
                    >
                        {isVoiceEnabled ? '🔈' : '🔇'}
                    </button>
                    <button
                        className={`btn-icon ${isRecording ? 'active' : ''}`}
                        onClick={startRecording}
                        disabled={loading || (isGuest && remainingMessages === 0)}
                        title="语音输入"
                    >
                        {isRecording ? '🔴' : '🎤'}
                    </button>
                </div>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder={isGuest && remainingMessages === 0 ? "用量已达上限" : "用英文回答老师..."}
                    disabled={isGuest && remainingMessages === 0}
                />
                <button onClick={sendMessage} disabled={loading || (isGuest && remainingMessages === 0)}>发送</button>
            </div>
        </main>
    );
}
