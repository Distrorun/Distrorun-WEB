"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut, authClient } from "@/lib/auth-client";
import { forceRevokeOtherSessions } from "./actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSun,
    faMoon,
    faArrowLeft,
    faUser,
    faPalette,
    faTrash,
    faCamera,
    faChevronDown,
    faGear,
    faRightFromBracket,
    faCheck,
    faXmark,
    faTriangleExclamation,
    faEnvelope,
    faPen,
} from "@fortawesome/free-solid-svg-icons";

type SettingsTab = "profile" | "appearance" | "danger";

const Spinner = ({ className = "h-4 w-4" }: { className?: string }) => (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
);

export default function SettingsPage() {
    const { data: session, isPending } = useSession();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme, systemTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Profile state
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Delete account
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleteText, setDeleteText] = useState("");

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (session?.user?.name) setName(session.user.name);
    }, [session]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Clear alerts
    useEffect(() => {
        if (success || error) {
            const t = setTimeout(() => { setSuccess(null); setError(null); }, 4000);
            return () => clearTimeout(t);
        }
    }, [success, error]);

    const currentTheme = theme === "system" ? systemTheme : theme;
    const isDark = currentTheme === "dark";
    const toggleTheme = () => setTheme(isDark ? "light" : "dark");

    const handleLogout = async () => {
        await signOut();
        router.push("/auth");
    };

    const handleLogoutAll = async () => {
        try {
            if (!session?.user?.id || !session?.session?.token) {
                setError("Unable to identify current session.");
                return;
            }

            // Execute raw server action DB wipe directly on Postgres
            const result = await forceRevokeOtherSessions(session.user.id, session.session.token);
            if (!result.success) {
                console.error("Custom Wipe Error:", result.error);
                setError(result.error || "Failed to sign out everywhere.");
                // We still want to let them sign out locally if it failed
                await signOut().catch(() => {});
                router.push("/auth");
                return;
            }
            
            // Critical fail-safe so user isn't stuck logged in if an unexpected code error happens
            await signOut().catch(() => {});
            router.push("/auth");
        } catch (err: any) {
            console.error("Exception in handleLogoutAll:", err);
            setError(err?.message || "Failed to sign out everywhere.");
            
            await signOut().catch(() => {});
            router.push("/auth");
        }
    };

    const handleUpdateName = async () => {
        if (!name.trim() || name === session?.user?.name) return;
        setSaving(true);
        setError(null);
        try {
            await authClient.updateUser({ name: name.trim() });
            setSuccess("Name updated successfully.");
        } catch {
            setError("Failed to update name.");
        }
        setSaving(false);
    };

    const handleDeleteAccount = async () => {
        if (deleteText !== "DELETE") return;
        try {
            await authClient.deleteUser();
            router.push("/auth");
        } catch {
            setError("Failed to delete account.");
        }
    };

    const tabs: { key: SettingsTab; label: string; icon: any }[] = [
        { key: "profile", label: "Profile", icon: faUser },
        { key: "appearance", label: "Appearance", icon: faPalette },
        { key: "danger", label: "Danger Zone", icon: faTrash },
    ];

    // Guards
    if (isPending) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center font-['Space_Grotesk',sans-serif]">
                <div className="flex items-center gap-3 text-[var(--text-muted)]"><Spinner className="h-5 w-5" /> Loading...</div>
            </div>
        );
    }
    if (!session) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-4 font-['Space_Grotesk',sans-serif]">
                <p className="text-[var(--text-muted)] text-[16px]">You must sign in to access settings.</p>
                <Link href="/auth" className="bg-[var(--accent)] text-white font-bold text-[14px] px-6 py-2.5 rounded-full hover:bg-[var(--accent-hover)] transition-colors">Sign In</Link>
            </div>
        );
    }

    if (!mounted) return null;

    return (
        <div
            className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-['Space_Grotesk',sans-serif] transition-colors duration-300"
            style={{
                backgroundImage: "linear-gradient(90deg, var(--grid-line) 2.5%, transparent 2.5%), linear-gradient(180deg, var(--grid-line) 2.5%, transparent 2.5%)",
                backgroundSize: "40px 40px",
            }}
        >
            {/* Header */}
            <header className="sticky top-0 z-40 w-full h-[64px] bg-[var(--bg-header)] backdrop-blur-md border-b border-[var(--border-secondary)] flex items-center px-6 transition-colors duration-300">
                <div className="flex items-center gap-4 w-full">
                    <Link href="/registry" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
                    </Link>
                    <div className="flex items-center gap-2.5">
                        <FontAwesomeIcon icon={faGear} className="w-5 h-5 text-[var(--accent)]" />
                        <span className="font-bold text-[18px] tracking-tight">Settings</span>
                    </div>

                    <div className="ml-auto flex items-center gap-4">
                        <button onClick={toggleTheme} className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label="Toggle theme">
                            <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="w-[14px] h-[14px]" />
                        </button>
                        <div className="relative" ref={menuRef}>
                            <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                                {session.user.image ? (
                                    <img src={session.user.image} alt="" className="w-8 h-8 rounded-full border border-[var(--border-secondary)]" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--accent)] font-bold text-[14px]">
                                        {session.user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <FontAwesomeIcon icon={faChevronDown} className={`w-[10px] h-[10px] transition-transform ${menuOpen ? "rotate-180" : ""}`} />
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-[200px] bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden z-50 backdrop-blur-xl">
                                    <div className="px-4 py-3 border-b border-[var(--border-secondary)]">
                                        <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">{session.user.name}</div>
                                        <div className="text-[11px] text-[var(--text-dimmed)] truncate">{session.user.email}</div>
                                    </div>
                                    <Link href="/registry" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-[13px] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                        <FontAwesomeIcon icon={faArrowLeft} className="w-[14px] h-[14px]" /> Back to Registry
                                    </Link>
                                    <div className="h-[1px] bg-[var(--border-secondary)]" />
                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors">
                                        <FontAwesomeIcon icon={faRightFromBracket} className="w-[14px] h-[14px]" /> Log Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Alerts */}
            {(error || success) && (
                <div className="fixed top-[72px] left-1/2 -translate-x-1/2 z-50">
                    {error && (
                        <div className="flex items-center gap-2 px-5 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-[12px] text-red-400 font-medium backdrop-blur-xl shadow-lg">
                            <FontAwesomeIcon icon={faXmark} className="w-3 h-3" /> {error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 px-5 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-[12px] text-green-400 font-medium backdrop-blur-xl shadow-lg">
                            <FontAwesomeIcon icon={faCheck} className="w-3 h-3" /> {success}
                        </div>
                    )}
                </div>
            )}

            <div className="flex min-h-[calc(100vh-64px)]">
                {/* Sidebar */}
                <aside className="w-[240px] flex-shrink-0 border-r border-[var(--border-secondary)] bg-[var(--bg-header)] backdrop-blur-md p-4 flex flex-col gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all ${activeTab === tab.key
                                ? "bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/20"
                                : tab.key === "danger"
                                    ? "text-red-400/70 hover:text-red-400 hover:bg-red-500/5 border border-transparent"
                                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-transparent"
                            }`}
                        >
                            <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0 p-8 overflow-y-auto max-w-[800px]">

                    {/* ═══ PROFILE ═══ */}
                    {activeTab === "profile" && (
                        <div>
                            <div className="mb-8">
                                <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">Profile</h1>
                                <p className="text-[13px] text-[var(--text-muted)] mt-1">Manage your account information</p>
                            </div>

                            {/* Avatar Section */}
                            <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-2xl p-6 mb-6">
                                <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-4">Avatar</h3>
                                <div className="flex items-center gap-5">
                                    <div className="relative group">
                                        {session.user.image ? (
                                            <img src={session.user.image} alt="" className="w-20 h-20 rounded-full border-2 border-[var(--border-secondary)]" />
                                        ) : (
                                            <div className="w-20 h-20 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)] font-bold text-[28px]">
                                                {session.user.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                            <FontAwesomeIcon icon={faCamera} className="w-5 h-5 text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[13px] text-[var(--text-muted)]">
                                            {session.user.image ? "Your avatar is synced from your social login provider." : "Upload a profile picture or sign in with a social provider to use your avatar."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Name */}
                            <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-2xl p-6 mb-6">
                                <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-4">Display Name</h3>
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dimmed)]">
                                            <FontAwesomeIcon icon={faPen} className="w-[12px] h-[12px]" />
                                        </div>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full h-[42px] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg pl-10 pr-4 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                                            placeholder="Your display name"
                                        />
                                    </div>
                                    <button
                                        onClick={handleUpdateName}
                                        disabled={saving || !name.trim() || name === session.user.name}
                                        className="h-[42px] px-5 bg-[var(--accent)] text-white text-[13px] font-bold rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {saving ? <Spinner /> : "Save"}
                                    </button>
                                </div>
                            </div>

                            {/* Email (read-only) */}
                            <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-2xl p-6">
                                <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-4">Email Address</h3>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dimmed)]">
                                        <FontAwesomeIcon icon={faEnvelope} className="w-[12px] h-[12px]" />
                                    </div>
                                    <input
                                        type="email"
                                        value={session.user.email}
                                        readOnly
                                        className="w-full h-[42px] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg pl-10 pr-4 text-[13px] text-[var(--text-dimmed)] cursor-not-allowed"
                                    />
                                </div>
                                <p className="text-[11px] text-[var(--text-dimmed)] mt-2">Email cannot be changed. It is linked to your authentication provider.</p>
                            </div>
                        </div>
                    )}

                    {/* ═══ APPEARANCE ═══ */}
                    {activeTab === "appearance" && (
                        <div>
                            <div className="mb-8">
                                <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">Appearance</h1>
                                <p className="text-[13px] text-[var(--text-muted)] mt-1">Customize how Distrorun looks</p>
                            </div>

                            {/* Theme Selection */}
                            <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-2xl p-6">
                                <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-2">Theme</h3>
                                <p className="text-[12px] text-[var(--text-muted)] mb-5">Choose your preferred color scheme</p>

                                <div className="grid grid-cols-3 gap-4">
                                    {/* Dark */}
                                    <button
                                        onClick={() => setTheme("dark")}
                                        className={`relative p-4 rounded-xl border-2 transition-all ${theme === "dark" ? "border-[var(--accent)] shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "border-[var(--border-secondary)] hover:border-[var(--text-dimmed)]"}`}
                                    >
                                        <div className="w-full h-[80px] bg-[#020617] rounded-lg mb-3 border border-[#1e3a8a]/40 overflow-hidden p-2">
                                            <div className="w-full h-2 bg-[#0f172a] rounded mb-1.5" />
                                            <div className="w-3/4 h-2 bg-[#0f172a] rounded mb-1.5" />
                                            <div className="w-1/2 h-2 bg-[#3b82f6]/30 rounded" />
                                        </div>
                                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">Dark</span>
                                        {theme === "dark" && (
                                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center">
                                                <FontAwesomeIcon icon={faCheck} className="w-[10px] h-[10px] text-white" />
                                            </div>
                                        )}
                                    </button>

                                    {/* Light */}
                                    <button
                                        onClick={() => setTheme("light")}
                                        className={`relative p-4 rounded-xl border-2 transition-all ${theme === "light" ? "border-[var(--accent)] shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "border-[var(--border-secondary)] hover:border-[var(--text-dimmed)]"}`}
                                    >
                                        <div className="w-full h-[80px] bg-[#f8fafc] rounded-lg mb-3 border border-[#cbd5e1]/60 overflow-hidden p-2">
                                            <div className="w-full h-2 bg-[#e2e8f0] rounded mb-1.5" />
                                            <div className="w-3/4 h-2 bg-[#e2e8f0] rounded mb-1.5" />
                                            <div className="w-1/2 h-2 bg-[#3b82f6]/20 rounded" />
                                        </div>
                                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">Light</span>
                                        {theme === "light" && (
                                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center">
                                                <FontAwesomeIcon icon={faCheck} className="w-[10px] h-[10px] text-white" />
                                            </div>
                                        )}
                                    </button>

                                    {/* System */}
                                    <button
                                        onClick={() => setTheme("system")}
                                        className={`relative p-4 rounded-xl border-2 transition-all ${theme === "system" ? "border-[var(--accent)] shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "border-[var(--border-secondary)] hover:border-[var(--text-dimmed)]"}`}
                                    >
                                        <div className="w-full h-[80px] rounded-lg mb-3 border border-[var(--border-secondary)] overflow-hidden flex">
                                            <div className="w-1/2 bg-[#020617] p-1.5">
                                                <div className="w-full h-1.5 bg-[#0f172a] rounded mb-1" />
                                                <div className="w-3/4 h-1.5 bg-[#0f172a] rounded" />
                                            </div>
                                            <div className="w-1/2 bg-[#f8fafc] p-1.5">
                                                <div className="w-full h-1.5 bg-[#e2e8f0] rounded mb-1" />
                                                <div className="w-3/4 h-1.5 bg-[#e2e8f0] rounded" />
                                            </div>
                                        </div>
                                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">System</span>
                                        {theme === "system" && (
                                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center">
                                                <FontAwesomeIcon icon={faCheck} className="w-[10px] h-[10px] text-white" />
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ DANGER ZONE ═══ */}
                    {activeTab === "danger" && (
                        <div>
                            <div className="mb-8">
                                <h1 className="text-[24px] font-bold text-red-400 tracking-tight">Danger Zone</h1>
                                <p className="text-[13px] text-[var(--text-muted)] mt-1">Irreversible actions on your account</p>
                            </div>

                            {/* Sign out everywhere */}
                            <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-2xl p-6 mb-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-1">Sign Out Everywhere</h3>
                                        <p className="text-[12px] text-[var(--text-muted)]">Sign out of all sessions across all devices. You will need to sign in again.</p>
                                    </div>
                                    <button
                                        onClick={handleLogoutAll}
                                        className="flex-shrink-0 ml-4 px-5 py-2.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[12px] font-bold rounded-lg hover:bg-yellow-500/20 transition-colors"
                                    >
                                        Sign Out All
                                    </button>
                                </div>
                            </div>

                            {/* Delete Account */}
                            <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-red-500/20 rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                        <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-[14px] font-bold text-red-400">Delete Account</h3>
                                        <p className="text-[12px] text-[var(--text-muted)]">Permanently delete your account and all associated data. This cannot be undone.</p>
                                    </div>
                                </div>

                                {!deleteConfirm ? (
                                    <button
                                        onClick={() => setDeleteConfirm(true)}
                                        className="px-5 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] font-bold rounded-lg hover:bg-red-500/20 transition-colors"
                                    >
                                        I want to delete my account
                                    </button>
                                ) : (
                                    <div className="mt-4 p-4 bg-red-500/5 border border-red-500/15 rounded-xl">
                                        <p className="text-[12px] text-red-400/80 mb-3">
                                            Type <span className="font-bold text-red-400">DELETE</span> to confirm permanent account deletion.
                                        </p>
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                value={deleteText}
                                                onChange={e => setDeleteText(e.target.value)}
                                                className="flex-1 h-[42px] bg-[var(--bg-secondary)] border border-red-500/20 rounded-lg px-4 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-red-500/50 transition-colors"
                                                placeholder='Type "DELETE"'
                                            />
                                            <button
                                                onClick={handleDeleteAccount}
                                                disabled={deleteText !== "DELETE"}
                                                className="h-[42px] px-5 bg-red-500/20 border border-red-500/30 text-red-400 text-[13px] font-bold rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                Delete Forever
                                            </button>
                                            <button
                                                onClick={() => { setDeleteConfirm(false); setDeleteText(""); }}
                                                className="h-[42px] px-4 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-muted)] text-[13px] font-medium rounded-lg hover:text-[var(--text-primary)] transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
