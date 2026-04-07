import { NextRequest } from "next/server";

const RAG_URL = process.env.RAG_API_URL || "http://localhost:8080";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, history } = body;

        if (!prompt || typeof prompt !== "string") {
            return new Response(JSON.stringify({ error: "prompt is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const res = await fetch(`${RAG_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, history: history || [] }),
        });

        if (!res.ok) {
            const text = await res.text();
            return new Response(JSON.stringify({ error: `RAG server error: ${text}` }), {
                status: res.status,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Stream the SSE response through
        return new Response(res.body, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (e: any) {
        return new Response(
            JSON.stringify({ error: `Failed to connect to RAG server: ${e.message}` }),
            { status: 502, headers: { "Content-Type": "application/json" } }
        );
    }
}
