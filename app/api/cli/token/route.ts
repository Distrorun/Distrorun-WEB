import { NextRequest, NextResponse } from "next/server";
import { createDeviceCode } from "@/lib/db-registry";

// POST /api/cli/token — Create a device code for CLI login
export async function POST() {
    try {
        const result = await createDeviceCode();
        return NextResponse.json(result);
    } catch (error) {
        console.error("Failed to create device code:", error);
        return NextResponse.json({ error: "Failed to create device code" }, { status: 500 });
    }
}
