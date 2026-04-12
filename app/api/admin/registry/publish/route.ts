import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { adminPublishPackage } from "@/lib/db-registry";

export async function POST(request: NextRequest) {
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, description, yamlContent, tags, baseDistro, packages, services, userCount, sbomEnabled, icon, iconColor } = body;

        if (!name || !yamlContent || !baseDistro) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const result = await adminPublishPackage({
            name,
            description,
            yamlContent,
            userId: session.user.id,
            tags: tags || [],
            baseDistro,
            packages: packages || [],
            services: services || [],
            userCount: userCount || 0,
            sbomEnabled: sbomEnabled || false,
            icon: icon || "cube",
            iconColor: iconColor || "var(--accent)",
        });

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error("Failed to publish official package:", error);
        return NextResponse.json({ error: "Failed to publish package" }, { status: 500 });
    }
}
