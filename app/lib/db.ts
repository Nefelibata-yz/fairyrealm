import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface Book {
    id: string;
    title: string;
    author: string | null;
    description: string | null;
}

// Minimal interface for D1Database to avoid type errors if @cloudflare/workers-types isn't global
interface D1Database {
    prepare: (query: string) => D1PreparedStatement;
}

interface D1PreparedStatement {
    bind: (...args: unknown[]) => D1PreparedStatement;
    first: <T = unknown>(colName?: string) => Promise<T | null>;
    all: <T = unknown>() => Promise<D1Result<T>>;
}

interface D1Result<T> {
    results: T[];
}

export async function getDb() {
    const { env } = await getCloudflareContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (env as any).DB as D1Database;
}

export async function getBooks(): Promise<Book[]> {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(db as any)) {
        console.warn("Database binding 'DB' not found. Returning empty list.");
        return [];
    }
    const { results } = await db.prepare("SELECT * FROM books ORDER BY title").all<Book>();
    return results;
}

export async function getBook(id: string): Promise<Book | null> {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(db as any)) return null;
    return await db.prepare("SELECT * FROM books WHERE id = ?").bind(id).first<Book>();
}
