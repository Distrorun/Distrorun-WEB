import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import pool from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Verify ownership
    const conv = await pool.query(
        `SELECT id FROM conversations WHERE id = $1 AND user_id = $2`,
        [id, session.user.id]
    );
    if (conv.rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { rows } = await pool.query(
        `SELECT id, role, content, yaml, valid, errors, created_at FROM messages
         WHERE conversation_id = $1 ORDER BY created_at ASC`,
        [id]
    );

    return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Verify ownership
    const conv = await pool.query(
        `SELECT id FROM conversations WHERE id = $1 AND user_id = $2`,
        [id, session.user.id]
    );
    if (conv.rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { role, content, yaml, valid, errors } = await req.json();

    const { rows } = await pool.query(
        `INSERT INTO messages (conversation_id, role, content, yaml, valid, errors)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, role, content, yaml, valid, errors, created_at`,
        [id, role, content || "", yaml || null, valid ?? null, errors ? JSON.stringify(errors) : null]
    );

    // Update conversation timestamp and title if first user message
    const msgCount = await pool.query(
        `SELECT COUNT(*) FROM messages WHERE conversation_id = $1`,
        [id]
    );
    if (parseInt(msgCount.rows[0].count) <= 1 && role === "user") {
        const title = content.length > 60 ? content.substring(0, 60) + "..." : content;
        await pool.query(
            `UPDATE conversations SET title = $1, updated_at = now() WHERE id = $2`,
            [title, id]
        );
    } else {
        await pool.query(`UPDATE conversations SET updated_at = now() WHERE id = $1`, [id]);
    }

    return NextResponse.json(rows[0]);
}
