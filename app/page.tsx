'use client';

import { useState } from "react";
import { BookSelector } from "@/components/book-selector";
import { ChatInterface } from "@/components/chat-interface";
import { submitMessage } from "@/app/actions";

export default function Home() {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  const handleSendMessage = async (message: string, history: { role: 'user' | 'assistant'; content: string }[]) => {
    if (!selectedBookId) return "Please select a book first.";
    // Simple mapping to match server action type expectations if needed, though here structure matches
    return await submitMessage(selectedBookId, message, history);
  };

  return (
    <div className="grid grid-rows-[auto_1fr] min-h-screen p-8 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)] max-w-4xl mx-auto">
      <header className="flex flex-col gap-4 items-center sm:items-start text-center sm:text-left">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
          FairyRealm AI
        </h1>
        <p className="text-muted-foreground max-w-lg">
          Select a book and start a conversation with our AI literary assistant.
        </p>
      </header>

      <main className="flex flex-col gap-8 items-center sm:items-start w-full">
        <BookSelector
          selectedBookId={selectedBookId}
          onSelect={setSelectedBookId}
        />

        {selectedBookId ? (
          <div className="w-full fade-in animate-in slide-in-from-bottom-4 duration-500">
            <ChatInterface
              bookId={selectedBookId}
              onSendMessage={handleSendMessage}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-64 border-2 border-dashed rounded-lg border-black/[.08] dark:border-white/[.145]">
            <p className="text-muted-foreground">Select a book above to begin</p>
          </div>
        )}
      </main>

      <footer className="row-start-3 text-center text-sm text-gray-500 py-4">
        Powered by Cloudflare Workers AI
      </footer>
    </div>
  );
}
