"use server";
import pool from "@/lib/db";

export async function forceRevokeOtherSessions(userId: string, currentToken: string) {
    if (!userId || !currentToken) return { success: false, error: "Missing identity" };
    try {
        // Hard-delete all sessions belonging to the user EXCEPT the current session token
        await pool.query('DELETE FROM session WHERE "userId" = $1 AND token != $2', [userId, currentToken]);
        return { success: true };
    } catch (error: any) {
        console.error("forceRevokeOtherSessions DB error:", error);
        return { success: false, error: error.message || "Failed to run DB query" };
    }
}

export async function forceRevokeAllSessions(userId: string) {
    if (!userId) return { success: false, error: "Missing identity" };
    try {
        await pool.query('DELETE FROM session WHERE "userId" = $1', [userId]);
        return { success: true };
    } catch (error: any) {
        console.error("forceRevokeAllSessions DB error:", error);
        return { success: false, error: error.message || "Failed to run DB query" };
    }
}
