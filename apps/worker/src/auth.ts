// Basic JWT utilities for Cloudflare Workers
// Note: In production, use a library like 'jose' for robust JWT handling.
// Here we use a slim version for the MVP.

const encoder = new TextEncoder();

export async function signJWT(payload: any, secret: string): Promise<string> {
    const header = { alg: "HS256", typ: "JWT" };
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "");
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, "");

    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(`${encodedHeader}.${encodedPayload}`)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export async function verifyJWT(token: string, secret: string): Promise<any | null> {
    try {
        const [header, payload, signature] = token.split(".");
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"]
        );

        const data = encoder.encode(`${header}.${payload}`);
        const sigData = new Uint8Array(
            atob(signature.replace(/-/g, "+").replace(/_/g, "/"))
                .split("")
                .map((c) => c.charCodeAt(0))
        );

        const isValid = await crypto.subtle.verify("HMAC", key, sigData, data);
        if (!isValid) return null;

        return JSON.parse(atob(payload));
    } catch (e) {
        return null;
    }
}

// Simple password hashing (since bcrypt is heavy for worker, we use PBKDF2 for MVP)
export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        key,
        256
    );
    return `${btoa(String.fromCharCode(...salt))}:${btoa(String.fromCharCode(...new Uint8Array(derivedBits)))}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [saltB64, hashB64] = storedHash.split(":");
    const salt = new Uint8Array(atob(saltB64).split("").map(c => c.charCodeAt(0)));
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        key,
        256
    );
    const currentHashB64 = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
    return currentHashB64 === hashB64;
}
