import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { approveDeviceCode, getDeviceCode } from "@/lib/db-registry";

// POST /api/cli/approve — User approves a device code (web-side, session auth)
export async function POST(request: NextRequest) {
    try {
        // Get session from better-auth
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const body = await request.json();
        const { code } = body;

        if (!code) {
            return NextResponse.json({ error: "Missing device code" }, { status: 400 });
        }

        // Check the device code exists and is pending
        const deviceCode = await getDeviceCode(code);
        if (!deviceCode) {
            return NextResponse.json({ error: "Invalid or expired device code" }, { status: 404 });
        }

        if (deviceCode.status !== "pending") {
            return NextResponse.json({ error: "Device code already used" }, { status: 400 });
        }

        // Approve and generate token
        const result = await approveDeviceCode(
            code,
            session.user.id,
            session.user.email,
            session.user.name
        );

        return NextResponse.json({ message: "Authorized", expiresAt: result.expiresAt });
    } catch (error) {
        console.error("Failed to approve device code:", error);
        return NextResponse.json({ error: "Failed to approve device code" }, { status: 500 });
    }
}
