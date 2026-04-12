import { NextRequest, NextResponse } from "next/server";
import { pollDeviceCode } from "@/lib/db-registry";

// GET /api/cli/poll?code=ABC-1234 — CLI polls for auth completion
export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");

    if (!code) {
        return NextResponse.json({ error: "Missing device code" }, { status: 400 });
    }

    try {
        const result = await pollDeviceCode(code);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Failed to poll device code:", error);
        return NextResponse.json({ error: "Failed to poll device code" }, { status: 500 });
    }
}
