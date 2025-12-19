import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "FairyRealm - English Learning Assistant",
    description: "Learn English with AI teacher",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
