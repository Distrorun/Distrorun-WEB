"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { useTheme } from "next-themes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTerminal, faCheckCircle, faTimesCircle, faSun, faMoon } from "@fortawesome/free-solid-svg-icons";

export default function CliAuthPage() {
    const searchParams = useSearchParams();
    const code = searchParams.get("code");
    const { data: session, isPending } = useSession();
    const [status, setStatus] = useState<"idle" | "approving" | "approved" | "error">("idle");
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme, systemTheme } = useTheme();

    useEffect(() => { setMounted(true); }, []);

    const currentTheme = theme === "system" ? systemTheme : theme;
    const isDark = currentTheme === "dark";

    const handleApprove = async () => {
        if (!code || !session) return;

        setStatus("approving");
        setError(null);

        try {
            const res = await fetch("/api/cli/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to approve");
            }

            setStatus("approved");
        } catch (err: any) {
            setError(err.message);
            setStatus("error");
        }
    };

    if (!mounted) return null;

    return (
        <div
            className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-['Inter',sans-serif] flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300"
            style={{
                backgroundImage:
                    "linear-gradient(90deg, var(--grid-line) 2.5%, transparent 2.5%), linear-gradient(180deg, var(--grid-line) 2.5%, transparent 2.5%)",
                backgroundSize: "40px 40px",
            }}
        >
            {/* Glow effects */}
            <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] bg-[var(--glow-radial)] blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[20%] right-[10%] w-[50%] h-[50%] bg-[var(--glow-blur)] blur-[150px] rounded-full pointer-events-none" />

            {/* Header */}
            <header className="absolute top-0 w-full flex items-center justify-between px-8 py-6 z-20">
                <Link href="/" className="font-bold text-[18px] tracking-tight text-[var(--text-primary)]">
                    Distrorun
                </Link>
                <button
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                    className="w-6 h-6 opacity-80 hover:opacity-100 transition-opacity text-[var(--text-muted)]"
                >
                    <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="w-5 h-5" />
                </button>
            </header>

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-[450px] bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-3xl p-8 shadow-[var(--shadow-heavy)]">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-secondary)] flex items-center justify-center">
                        <FontAwesomeIcon icon={faTerminal} className="w-7 h-7 text-[var(--accent)]" />
                    </div>
                </div>

                <h1 className="text-[22px] font-bold text-center mb-2">CLI Authorization</h1>
                <p className="text-[13px] text-[var(--text-muted)] text-center mb-8">
                    The DistroRun CLI is requesting access to your account.
                </p>

                {!code ? (
                    <div className="text-center text-[13px] text-red-400">
                        Invalid authorization link. Please run <code className="bg-[var(--bg-secondary)] px-2 py-1 rounded text-[var(--accent)]">distrorun login</code> again.
                    </div>
                ) : isPending ? (
                    <div className="flex justify-center">
                        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !session ? (
                    <div className="text-center space-y-4">
                        <p className="text-[13px] text-[var(--text-muted)]">
                            You need to sign in first to authorize the CLI.
                        </p>
                        <Link
                            href={`/auth?redirect=/cli-auth?code=${code}`}
                            className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[14px] font-semibold px-8 py-3 rounded-full transition-colors"
                        >
                            Sign In
                        </Link>
                    </div>
                ) : status === "approved" ? (
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <FontAwesomeIcon icon={faCheckCircle} className="w-12 h-12 text-emerald-500" />
                        </div>
                        <h2 className="text-[18px] font-bold text-emerald-500">Authorized</h2>
                        <p className="text-[13px] text-[var(--text-muted)]">
                            You can close this window and return to your terminal.
                        </p>
                    </div>
                ) : status === "error" ? (
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <FontAwesomeIcon icon={faTimesCircle} className="w-12 h-12 text-red-500" />
                        </div>
                        <h2 className="text-[18px] font-bold text-red-400">Authorization Failed</h2>
                        <p className="text-[13px] text-red-400/80">{error}</p>
                        <button
                            onClick={handleApprove}
                            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[14px] font-semibold px-8 py-3 rounded-full transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Device code display */}
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl p-4 text-center">
                            <p className="text-[11px] font-bold text-[var(--text-dimmed)] tracking-wider uppercase mb-2">Device Code</p>
                            <p className="text-[28px] font-mono font-bold text-[var(--accent)] tracking-[0.3em]">{code}</p>
                        </div>

                        {/* User info */}
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] font-bold">
                                {session.user.name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div>
                                <p className="text-[14px] font-semibold text-[var(--text-primary)]">{session.user.name}</p>
                                <p className="text-[12px] text-[var(--text-muted)]">{session.user.email}</p>
                            </div>
                        </div>

                        {/* Permissions */}
                        <div className="space-y-2">
                            <p className="text-[11px] font-bold text-[var(--text-dimmed)] tracking-wider uppercase">Permissions</p>
                            <div className="space-y-1.5 text-[13px] text-[var(--text-muted)]">
                                <div className="flex items-center gap-2">
                                    <span className="text-[var(--accent)]">*</span>
                                    Push and pull packages from the registry
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[var(--accent)]">*</span>
                                    Manage your published packages
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleApprove}
                            disabled={status === "approving"}
                            className="w-full h-[46px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-[14px] rounded-full shadow-[0px_4px_20px_rgba(59,130,246,0.3)] transition-all duration-200 disabled:opacity-50"
                        >
                            {status === "approving" ? "Authorizing..." : "Authorize CLI Access"}
                        </button>

                        <p className="text-[10px] text-[var(--text-dimmed)] text-center">
                            Token will expire in 30 days. You can revoke it in Settings.
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="absolute bottom-6 text-[10px] text-[var(--text-muted)] z-20">
                &copy; 2026 Distrorun, Under the Apache2.0 licence
            </footer>
        </div>
    );
}
