import { NextRequest, NextResponse } from "next/server";
import { getPackage, getPackageHistory, incrementDownloads, deletePackage, updatePackage, updatePackageYaml, validateApiToken } from "@/lib/db-registry";
import { auth } from "@/auth";
import { headers } from "next/headers";

// GET /api/registry/[name] — Get package details + YAML + SBOM
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ name: string }> }
) {
    const { name } = await params;
    const version = request.nextUrl.searchParams.get("version");
    const download = request.nextUrl.searchParams.get("download");

    try {
        const pkg = await getPackage(name, version ? parseInt(version) : undefined);
        if (!pkg) {
            return NextResponse.json({ error: "Package not found" }, { status: 404 });
        }

        // Track downloads when the CLI pulls
        if (download === "true") {
            await incrementDownloads(name);
        }

        const history = await getPackageHistory(name);

        return NextResponse.json({
            name: pkg.name,
            description: pkg.description,
            userId: pkg.user_id,
            userName: pkg.user_name,
            tags: pkg.tags,
            downloads: pkg.downloads,
            latestVersion: pkg.latest_version,
            createdAt: pkg.created_at,
            updatedAt: pkg.updated_at,
            icon: pkg.icon || null,
            iconColor: pkg.icon_color || null,
            version: pkg.versionData ? {
                number: pkg.versionData.version,
                yamlContent: pkg.versionData.yaml_content,
                sbomContent: pkg.versionData.sbom_content,
                baseDistro: pkg.versionData.base_distro,
                packages: pkg.versionData.packages,
                services: pkg.versionData.services,
                userCount: pkg.versionData.user_count,
                sbomEnabled: pkg.versionData.sbom_enabled,
                createdAt: pkg.versionData.created_at,
            } : null,
            history,
        });
    } catch (error) {
        console.error("Failed to get package:", error);
        return NextResponse.json({ error: "Failed to get package" }, { status: 500 });
    }
}

// PATCH /api/registry/[name] — Update package metadata (session auth, owner only)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ name: string }> }
) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name } = await params;

    try {
        const body = await request.json();
        const { description, tags, icon, iconColor, yamlContent } = body;

        const updates: { description?: string; tags?: string[]; icon?: string | null; iconColor?: string | null } = {};
        if (description !== undefined) updates.description = description;
        if (tags !== undefined) updates.tags = tags;
        if (icon !== undefined) updates.icon = icon;
        if (iconColor !== undefined) updates.iconColor = iconColor;

        if (Object.keys(updates).length > 0) {
            const result = await updatePackage(name, session.user.id, updates);
            if (!result) return NextResponse.json({ error: "Not found or not owned by you" }, { status: 404 });
        }

        if (yamlContent) {
            const yamlResult = await updatePackageYaml(name, session.user.id, yamlContent);
            if (!yamlResult) return NextResponse.json({ error: "Failed to update YAML" }, { status: 404 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Failed to update package:", error);
        return NextResponse.json({ error: "Failed to update package" }, { status: 500 });
    }
}

// DELETE /api/registry/[name] — Delete your own package (session or Bearer token)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ name: string }> }
) {
    const { name } = await params;

    let userId: string | null = null;

    // Try session auth first (web UI)
    const session = await auth.api.getSession({ headers: await headers() });
    if (session) {
        userId = session.user.id;
    } else {
        // Fall back to Bearer token (CLI)
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.slice(7);
        const user = await validateApiToken(token);
        if (!user) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }
        userId = user.user_id;
    }

    try {
        const deleted = await deletePackage(name, userId!);
        if (!deleted) {
            return NextResponse.json({ error: "Package not found or not owned by you" }, { status: 404 });
        }

        return NextResponse.json({ message: `Deleted ${name}` });
    } catch (error) {
        console.error("Failed to delete package:", error);
        return NextResponse.json({ error: "Failed to delete package" }, { status: 500 });
    }
}
