import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import pool from "@/lib/db";
import { initChatTables } from "@/lib/init-db";

let initialized = false;

async function ensureTables() {
    if (!initialized) {
        await initChatTables();
        initialized = true;
    }
}

export async function GET() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureTables();

    const { rows } = await pool.query(
        `SELECT id, title, created_at, updated_at FROM conversations
         WHERE user_id = $1 ORDER BY updated_at DESC`,
        [session.user.id]
    );

    return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureTables();

    const { title } = await req.json();

    const { rows } = await pool.query(
        `INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at, updated_at`,
        [session.user.id, title || "New Chat"]
    );

    return NextResponse.json(rows[0]);
}
