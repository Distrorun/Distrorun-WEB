import { NextRequest, NextResponse } from "next/server";
import { listPackages, publishPackage, validateApiToken } from "@/lib/db-registry";

// GET /api/registry — List all published packages (public)
export async function GET(request: NextRequest) {
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");

    try {
        const packages = await listPackages(limit, offset);
        return NextResponse.json({ packages });
    } catch (error) {
        console.error("Failed to list packages:", error);
        return NextResponse.json({ error: "Failed to list packages" }, { status: 500 });
    }
}

// POST /api/registry — Publish a package (auth required)
export async function POST(request: NextRequest) {
    // Validate token
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const user = await validateApiToken(token);
    if (!user) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { yamlContent, sbomContent, name, description, tags, baseDistro, packages, services, userCount, sbomEnabled } = body;

        if (!yamlContent || !name) {
            return NextResponse.json({ error: "Missing required fields: name, yamlContent" }, { status: 400 });
        }

        const result = await publishPackage({
            name,
            description: description || "",
            yamlContent,
            sbomContent: sbomContent || undefined,
            userId: user.user_id,
            tags: tags || [],
            baseDistro: baseDistro || "alpine",
            packages: packages || [],
            services: services || [],
            userCount: userCount || 0,
            sbomEnabled: sbomEnabled || false,
        });

        return NextResponse.json({
            message: `Published ${name} v${result.version} by ${user.user_name}`,
            version: result.version,
            packageId: result.packageId,
            author: user.user_name,
        });
    } catch (error) {
        console.error("Failed to publish package:", error);
        return NextResponse.json({ error: "Failed to publish package" }, { status: 500 });
    }
}
