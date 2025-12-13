'use client';

import { useState, useEffect, useRef } from 'react';

type Message = {
    role: 'user' | 'assistant';
    content: string;
};

export function ChatInterface({
    bookId,
    onSendMessage,
}: {
    bookId: string;
    onSendMessage: (message: string, history: Message[]) => Promise<string>;
}) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Reset/Intro message when book changes
        setMessages([
            { role: 'assistant', content: `Hello! I'm ready to discuss "${bookId}". What would you like to talk about?` } // Simplified title lookup for now
        ]);
    }, [bookId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            const newHistory = [...messages, { role: 'user', content: userMessage }];
            const response = await onSendMessage(userMessage, newHistory as Message[]);
            setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[500px] w-full max-w-2xl border border-black/[.08] dark:border-white/[.145] rounded-lg overflow-hidden bg-white dark:bg-black">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'user'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-800'
                                }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2 animate-pulse">
                            Running...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="p-4 border-t border-black/[.08] dark:border-white/[.145] bg-gray-50 dark:bg-gray-900 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 rounded-full px-4 py-2 border border-black/[.08] dark:border-white/[.145] bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-foreground text-background rounded-full px-6 py-2 font-medium hover:opacity-90 disabled:opacity-50"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
