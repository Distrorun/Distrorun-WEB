import { NextRequest, NextResponse } from "next/server";

const RAG_URL = process.env.RAG_API_URL || "http://localhost:8080";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt } = body;

        if (!prompt || typeof prompt !== "string") {
            return NextResponse.json(
                { error: "prompt is required" },
                { status: 400 }
            );
        }

        const res = await fetch(`${RAG_URL}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
        });

        if (!res.ok) {
            const text = await res.text();
            return NextResponse.json(
                { error: `RAG server error: ${text}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json(
            { error: `Failed to connect to RAG server: ${e.message}` },
            { status: 502 }
        );
    }
}
