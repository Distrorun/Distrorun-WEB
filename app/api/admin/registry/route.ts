import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { adminListPackages } from "@/lib/db-registry";

export async function GET(request: NextRequest) {
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "100");
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");

    try {
        const packages = await adminListPackages(limit, offset);
        return NextResponse.json({ packages });
    } catch (error) {
        console.error("Failed to list packages for admin:", error);
        return NextResponse.json({ error: "Failed to list packages" }, { status: 500 });
    }
}
