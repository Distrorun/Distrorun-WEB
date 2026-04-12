import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { adminDeletePackage, adminTogglePackageVisibility } from "@/lib/db-registry";

export async function PATCH(
    request: NextRequest,
    { params }: { params: { name: string } }
) {
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await params;
    try {
        const { hidden } = await request.json();
        const success = await adminTogglePackageVisibility(name, hidden);
        
        if (success) {
            return NextResponse.json({ message: `Package ${name} visibility updated.` });
        } else {
            return NextResponse.json({ error: "Package not found" }, { status: 404 });
        }
    } catch (error) {
        console.error("Failed to toggle package visibility:", error);
        return NextResponse.json({ error: "Failed to update package" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { name: string } }
) {
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await params;
    try {
        const success = await adminDeletePackage(name);
        
        if (success) {
            return NextResponse.json({ message: `Package ${name} deleted.` });
        } else {
            return NextResponse.json({ error: "Package not found" }, { status: 404 });
        }
    } catch (error) {
        console.error("Failed to delete package:", error);
        return NextResponse.json({ error: "Failed to delete package" }, { status: 500 });
    }
}
