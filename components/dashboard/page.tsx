"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
    const { data: session, isPending } = useSession();
    const router = useRouter();

    const handleLogout = async () => {
        await signOut();
        router.push("/auth");
    };

    if (isPending) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center font-['Space_Grotesk',sans-serif]">
                <div className="flex items-center gap-3 text-[var(--text-muted)]">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-4 font-['Space_Grotesk',sans-serif]">
                <p className="text-[var(--text-muted)] text-[16px]">You are not signed in.</p>
                <Link
                    href="/auth"
                    className="bg-[var(--accent)] text-white font-bold text-[14px] px-6 py-2.5 rounded-full hover:bg-[var(--accent-hover)] transition-colors"
                >
                    Sign In
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-6 font-['Space_Grotesk',sans-serif] transition-colors duration-300">
            <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-3xl p-10 shadow-[var(--shadow-heavy)] flex flex-col items-center gap-5 max-w-[400px] w-full mx-4">
                {session.user.image && (
                    <img
                        src={session.user.image}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full border-2 border-[var(--accent)]"
                    />
                )}
                <h1 className="text-[24px] font-bold text-[var(--text-primary)]">
                    Welcome, {session.user.name}!
                </h1>
                <p className="text-[14px] text-[var(--text-muted)]">
                    {session.user.email}
                </p>
                {session.user.role === "admin" && (
                    <Link
                        href="/admin"
                        className="w-full h-[42px] flex items-center justify-center bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] font-bold text-[13px] rounded-full hover:bg-[var(--accent)]/20 transition-all duration-200"
                    >
                        Admin Dashboard
                    </Link>
                )}
                <button
                    onClick={handleLogout}
                    className="mt-2 w-full h-[42px] bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-[13px] rounded-full hover:bg-red-500/20 transition-all duration-200"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
}
