import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import pool from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const { rowCount } = await pool.query(
        `DELETE FROM conversations WHERE id = $1 AND user_id = $2`,
        [id, session.user.id]
    );

    if (rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;
        const { title } = await req.json();

        if (!title || typeof title !== 'string') {
            return NextResponse.json({ error: "Invalid title" }, { status: 400 });
        }

        const { rowCount } = await pool.query(
            `UPDATE conversations SET title = $1, updated_at = now() WHERE id = $2 AND user_id = $3`,
            [title, id, session.user.id]
        );

        if (rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
