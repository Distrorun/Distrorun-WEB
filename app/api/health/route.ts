import { NextResponse } from "next/server";
import pool from "@/lib/db";
import minioClient from "@/lib/minio";

const RAG_URL = process.env.RAG_API_URL || "http://localhost:8080";
const DOCS_URL = process.env.DOCS_URL || "http://localhost:8000";

export async function GET() {
    const statuses = {
        rag: "down",
        docs: "down",
        db: "down",
        minio: "down",
    };

    // 1. Check RAG Service
    try {
        const ragRes = await fetch(`${RAG_URL}`, { method: "HEAD", signal: AbortSignal.timeout(3000) });
        if (ragRes.ok || ragRes.status === 404 || ragRes.status === 405) {
            statuses.rag = "up";
        }
    } catch {
        statuses.rag = "down";
    }

    // 2. Check DOCS Service
    try {
        const docsRes = await fetch(`${DOCS_URL}`, { method: "HEAD", signal: AbortSignal.timeout(3000) });
        if (docsRes.ok || docsRes.status < 500) {
            statuses.docs = "up";
        }
    } catch {
        statuses.docs = "down";
    }

    // 3. Check DB
    try {
        const result = await pool.query("SELECT 1");
        if (result.rowCount === 1) {
            statuses.db = "up";
        }
    } catch {
        statuses.db = "down";
    }

    // 4. Check MinIO
    try {
        await minioClient.listBuckets();
        statuses.minio = "up";
    } catch {
        statuses.minio = "down";
    }

    return NextResponse.json({ statuses });
}
