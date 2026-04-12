"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, authClient, signOut } from "@/lib/auth-client";
import { getIcon, ICON_MAP } from "@/lib/icons";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSun,
    faMoon,
    faShieldHalved,
    faTrash,
    faBan,
    faUserPlus,
    faArrowLeft,
    faSearch,
    faChevronDown,
    faGear,
    faRightFromBracket,
    faUsers,
    faChartLine,
    faCubes,
    faEllipsisVertical,
    faCheck,
    faXmark,
    faCircleCheck,
    faTriangleExclamation,
    faClock,
    faArrowUp,
    faArrowDown,
    faUserShield,
    faEye,
    faEyeSlash,
    faCalendarDays,
    faFilter,
    faDownload,
    faRefresh,
    faHeartPulse,
    faServer,
    faDatabase,
    faBook,
    faRobot,
    faHardDrive,
} from "@fortawesome/free-solid-svg-icons";

interface User {
    id: string;
    name: string;
    email: string;
    role: string | null;
    banned: boolean | null;
    image: string | null;
    createdAt: string;
}

interface RegistryPackage {
    id: number;
    name: string;
    description: string;
    user_id: string;
    user_name: string;
    tags: string[];
    downloads: number;
    latest_version: number;
    hidden: boolean;
    official: boolean;
    icon: string | null;
    icon_color: string | null;
    created_at: string;
    updated_at: string;
}

type AdminTab = "overview" | "users" | "registry" | "settings" | "health";
type UserSortKey = "name" | "email" | "createdAt" | "role";
type UserSortDir = "asc" | "desc";

// --- Spinner component ---
const Spinner = ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
);

// --- Stat Card ---
const StatCard = ({ value, label, icon, color = "var(--text-primary)", trend }: { value: string | number; label: string; icon: any; color?: string; trend?: { value: string; up: boolean } }) => (
    <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-2xl p-5 transition-colors hover:border-[var(--border-accent)] group">
        <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-secondary)] flex items-center justify-center group-hover:scale-105 transition-transform">
                <FontAwesomeIcon icon={icon} className="w-4 h-4" style={{ color }} />
            </div>
            {trend && (
                <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${trend.up ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                    <FontAwesomeIcon icon={trend.up ? faArrowUp : faArrowDown} className="w-[8px] h-[8px]" />
                    {trend.value}
                </div>
            )}
        </div>
        <div className="text-[28px] font-bold leading-none" style={{ color }}>{value}</div>
        <div className="text-[12px] text-[var(--text-muted)] mt-1.5">{label}</div>
    </div>
);

export default function AdminPage() {
    const { data: session, isPending } = useSession();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme, systemTheme } = useTheme();
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<AdminTab>("overview");
    const [userSort, setUserSort] = useState<{ key: UserSortKey; dir: UserSortDir }>({ key: "createdAt", dir: "desc" });
    const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user" | "banned">("all");
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [userActionMenu, setUserActionMenu] = useState<string | null>(null);
    const [registries, setRegistries] = useState<RegistryPackage[]>([]);
    const [loadingRegistries, setLoadingRegistries] = useState(true);
    const [registryActionMenu, setRegistryActionMenu] = useState<string | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ userId?: string; registryName?: string; action: string; message: string } | null>(null);
    const [showPublishDialog, setShowPublishDialog] = useState(false);
    const [publishData, setPublishData] = useState({
        name: "",
        description: "",
        baseDistro: "alpine",
        icon: "cube",
        iconColor: "#3b82f6",
        yamlContent: ""
    });
    const [publishTags, setPublishTags] = useState<string[]>([]);
    const [publishTagInput, setPublishTagInput] = useState("");
    const [publishIconPickerOpen, setPublishIconPickerOpen] = useState(false);
    const [publishIconSearch, setPublishIconSearch] = useState("");
    const menuRef = useRef<HTMLDivElement>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const publishIconPickerRef = useRef<HTMLDivElement>(null);

    const [healthStatus, setHealthStatus] = useState<{ rag: string; docs: string; db: string; minio: string } | null>(null);
    const [loadingHealth, setLoadingHealth] = useState(false);

    // Fetch health status
    const fetchHealth = useCallback(async (isPolling = false) => {
        if (!isPolling) setLoadingHealth(true);
        try {
            const res = await fetch("/api/health");
            if (res.ok) {
                const data = await res.json();
                setHealthStatus(data.statuses);
            }
        } catch {
            setHealthStatus(null);
        }
        if (!isPolling) setLoadingHealth(false);
    }, []);

    useEffect(() => {
        if (activeTab === "health") {
            fetchHealth(false);
            const interval = setInterval(() => fetchHealth(true), 5000);
            return () => clearInterval(interval);
        }
    }, [activeTab, fetchHealth]);

    useEffect(() => { setMounted(true); }, []);

    const currentTheme = theme === "system" ? systemTheme : theme;
    const isDark = currentTheme === "dark";
    const toggleTheme = () => setTheme(isDark ? "light" : "dark");

    const isAdmin = session?.user?.role === "admin";

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
            if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) setUserActionMenu(null);
            if (publishIconPickerRef.current && !publishIconPickerRef.current.contains(e.target as Node)) setPublishIconPickerOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await signOut();
        router.push("/auth");
    };

    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true);
        try {
            const res = await authClient.admin.listUsers({ query: { limit: 100 } });
            if (res.data) setUsers(res.data.users as unknown as User[]);
        } catch {
            setError("Failed to load users.");
        }
        setLoadingUsers(false);
    }, []);

    useEffect(() => {
        if (session && isAdmin) fetchUsers();
    }, [session, isAdmin, fetchUsers]);

    // Clear alerts after 4s
    useEffect(() => {
        if (success || error) {
            const t = setTimeout(() => { setSuccess(null); setError(null); }, 4000);
            return () => clearTimeout(t);
        }
    }, [success, error]);

    // --- User Actions ---
    const handleSetRole = async (userId: string, role: "user" | "admin") => {
        setActionLoading(userId);
        setError(null);
        try {
            await authClient.admin.setRole({ userId, role });
            setSuccess(`Role updated to "${role}".`);
            await fetchUsers();
        } catch { setError("Failed to update role."); }
        setActionLoading(null);
        setUserActionMenu(null);
    };

    const handleBan = async (userId: string, ban: boolean) => {
        setActionLoading(userId);
        setError(null);
        try {
            if (ban) { await authClient.admin.banUser({ userId }); setSuccess("User banned."); }
            else { await authClient.admin.unbanUser({ userId }); setSuccess("User unbanned."); }
            await fetchUsers();
        } catch { setError("Failed to update ban status."); }
        setActionLoading(null);
        setUserActionMenu(null);
    };

    const handleRemove = async (userId: string) => {
        setActionLoading(userId);
        setError(null);
        try {
            await authClient.admin.removeUser({ userId });
            setSuccess("User deleted.");
            setSelectedUsers(prev => { const n = new Set(prev); n.delete(userId); return n; });
            await fetchUsers();
        } catch { setError("Failed to delete user."); }
        setActionLoading(null);
        setConfirmDialog(null);
    };

    const handlePublishOS = async () => {
        if (!publishData.name || !publishData.yamlContent) {
            setError("Name and YAML content are required.");
            return;
        }

        setActionLoading("publish");
        try {
            const res = await fetch("/api/admin/registry/publish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...publishData,
                    tags: publishTags,
                    packages: [],
                    services: [],
                    sbomEnabled: true
                }),
            });

            if (res.ok) {
                setSuccess(`Official OS "${publishData.name}" published!`);
                setShowPublishDialog(false);
                setPublishData({ name: "", description: "", baseDistro: "alpine", icon: "cube", iconColor: "#3b82f6", yamlContent: "" });
                setPublishTags([]);
                setPublishTagInput("");
                setPublishIconPickerOpen(false);
                setPublishIconSearch("");
                await fetchRegistries();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to publish OS.");
            }
        } catch { setError("Failed to publish OS."); }
        setActionLoading(null);
    };

    const handlePublishAddTag = () => {
        const tag = publishTagInput.trim();
        if (tag && !publishTags.includes(tag)) {
            setPublishTags([...publishTags, tag]);
            setPublishTagInput("");
        }
    };

    const handlePublishRemoveTag = (tag: string) => {
        setPublishTags(publishTags.filter(t => t !== tag));
    };

    const handlePublishTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") { e.preventDefault(); handlePublishAddTag(); }
    };

    const filteredPublishIcons = publishIconSearch
        ? Object.keys(ICON_MAP).filter(k => k.includes(publishIconSearch.toLowerCase()))
        : Object.keys(ICON_MAP);

    const fetchRegistries = useCallback(async () => {
        setLoadingRegistries(true);
        try {
            const res = await fetch("/api/admin/registry");
            if (res.ok) {
                const data = await res.json();
                setRegistries(data.packages);
            }
        } catch { setError("Failed to load registries."); }
        setLoadingRegistries(false);
    }, []);

    const handleToggleVisibility = async (name: string, hidden: boolean) => {
        setActionLoading(name);
        try {
            const res = await fetch(`/api/admin/registry/${name}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hidden }),
            });
            if (res.ok) {
                setSuccess(`OS "${name}" is now ${hidden ? "hidden" : "visible"}.`);
                await fetchRegistries();
            }
        } catch { setError("Failed to update visibility."); }
        setActionLoading(null);
        setRegistryActionMenu(null);
    };

    const handleDeleteRegistry = async (name: string) => {
        setActionLoading(name);
        try {
            const res = await fetch(`/api/admin/registry/${name}`, { method: "DELETE" });
            if (res.ok) {
                setSuccess(`OS "${name}" deleted.`);
                await fetchRegistries();
            }
        } catch { setError("Failed to delete registry."); }
        setActionLoading(null);
        setConfirmDialog(null);
    };

    useEffect(() => {
        if (session && isAdmin) {
            if (activeTab === "users") fetchUsers();
            if (activeTab === "registry") fetchRegistries();
        }
    }, [session, isAdmin, activeTab, fetchUsers, fetchRegistries]);

    const handleBulkBan = async () => {
        for (const uid of selectedUsers) {
            if (uid !== session?.user?.id) await handleBan(uid, true);
        }
        setSelectedUsers(new Set());
    };

    const handleBulkDelete = async () => {
        for (const uid of selectedUsers) {
            if (uid !== session?.user?.id) await handleRemove(uid);
        }
        setSelectedUsers(new Set());
        setConfirmDialog(null);
    };

    // --- Sorting & Filtering ---
    const sortedFilteredUsers = users
        .filter(u => {
            if (roleFilter === "admin" && u.role !== "admin") return false;
            if (roleFilter === "user" && u.role !== "user") return false;
            if (roleFilter === "banned" && !u.banned) return false;
            if (search && !u.name?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        })
        .sort((a, b) => {
            const dir = userSort.dir === "asc" ? 1 : -1;
            const key = userSort.key;
            const aVal = String(a[key] ?? "");
            const bVal = String(b[key] ?? "");
            return aVal.localeCompare(bVal) * dir;
        });

    const toggleSort = (key: UserSortKey) => {
        setUserSort(prev => prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
    };

    const toggleSelectAll = () => {
        if (selectedUsers.size === sortedFilteredUsers.length) setSelectedUsers(new Set());
        else setSelectedUsers(new Set(sortedFilteredUsers.map(u => u.id)));
    };

    const toggleSelect = (id: string) => {
        setSelectedUsers(prev => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id); else n.add(id);
            return n;
        });
    };

    // --- Computed stats ---
    const totalUsers = users.length;
    const adminCount = users.filter(u => u.role === "admin").length;
    const bannedCount = users.filter(u => u.banned).length;
    const recentUsers = users.filter(u => {
        const created = new Date(u.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return created > weekAgo;
    }).length;

    const formatDate = (d: string) => {
        const date = new Date(d);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const formatRelative = (d: string) => {
        const now = new Date();
        const date = new Date(d);
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return formatDate(d);
    };

    // --- Sidebar tabs ---
    const tabs: { key: AdminTab; label: string; icon: any }[] = [
        { key: "overview", label: "Overview", icon: faChartLine },
        { key: "users", label: "Users", icon: faUsers },
        { key: "registry", label: "Registry", icon: faCubes },
        { key: "health", label: "Health", icon: faHeartPulse },
        { key: "settings", label: "Settings", icon: faGear },
    ];

    // --- Guards ---
    if (isPending) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center font-['Space_Grotesk',sans-serif]">
                <div className="flex items-center gap-3 text-[var(--text-muted)]"><Spinner /> Loading...</div>
            </div>
        );
    }
    if (!session) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-4 font-['Space_Grotesk',sans-serif]">
                <p className="text-[var(--text-muted)] text-[16px]">You must sign in to access admin.</p>
                <Link href="/auth" className="bg-[var(--accent)] text-white font-bold text-[14px] px-6 py-2.5 rounded-full hover:bg-[var(--accent-hover)] transition-colors">Sign In</Link>
            </div>
        );
    }
    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-4 font-['Space_Grotesk',sans-serif]">
                <FontAwesomeIcon icon={faShieldHalved} className="w-12 h-12 text-[var(--text-dimmed)] mb-2" />
                <h1 className="text-[22px] font-bold text-[var(--text-primary)]">Access Denied</h1>
                <p className="text-[var(--text-muted)] text-[14px]">You don't have permission to view this page.</p>
                <Link href="/registry" className="mt-2 bg-[var(--accent)] text-white font-bold text-[14px] px-6 py-2.5 rounded-full hover:bg-[var(--accent-hover)] transition-colors">Back to Registry</Link>
            </div>
        );
    }

    // --- Sort header helper ---
    const SortHeader = ({ label, sortKey, className = "" }: { label: string; sortKey: UserSortKey; className?: string }) => (
        <button onClick={() => toggleSort(sortKey)} className={`flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-dimmed)] uppercase tracking-wider hover:text-[var(--text-muted)] transition-colors ${className}`}>
            {label}
            {userSort.key === sortKey && (
                <FontAwesomeIcon icon={userSort.dir === "asc" ? faArrowUp : faArrowDown} className="w-[8px] h-[8px] text-[var(--accent)]" />
            )}
        </button>
    );

    return (
        <div
            className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-['Space_Grotesk',sans-serif] transition-colors duration-300"
            style={{
                backgroundImage: "linear-gradient(90deg, var(--grid-line) 2.5%, transparent 2.5%), linear-gradient(180deg, var(--grid-line) 2.5%, transparent 2.5%)",
                backgroundSize: "40px 40px",
            }}
        >
            {/* ── HEADER ── */}
            <header className="sticky top-0 z-40 w-full h-[64px] bg-[var(--bg-header)] backdrop-blur-md border-b border-[var(--border-secondary)] flex items-center px-6 transition-colors duration-300">
                <div className="flex items-center gap-4 w-full">
                    <Link href="/registry" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
                    </Link>
                    <div className="flex items-center gap-2.5">
                        <span className="font-bold text-[18px] tracking-tight">Admin</span>
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
                                    <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-[13px] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                        <FontAwesomeIcon icon={faGear} className="w-[14px] h-[14px]" /> Settings
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

            {/* ── ALERTS ── */}
            {(error || success) && (
                <div className="fixed top-[72px] left-1/2 -translate-x-1/2 z-50 animate-[slideDown_0.3s_ease-out]">
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

            {/* ── CONFIRM DIALOG ── */}
            {confirmDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-2xl p-6 max-w-[380px] w-full mx-4 shadow-[var(--shadow-heavy)] backdrop-blur-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 text-red-400" />
                            </div>
                            <h3 className="text-[16px] font-bold text-[var(--text-primary)]">Confirm Action</h3>
                        </div>
                        <p className="text-[13px] text-[var(--text-muted)] mb-6">{confirmDialog.message}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDialog(null)} className="flex-1 h-[38px] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-muted)] text-[13px] font-semibold rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (confirmDialog.action === "delete") handleRemove(confirmDialog.userId!);
                                    else if (confirmDialog.action === "delete-registry") handleDeleteRegistry(confirmDialog.registryName!);
                                    else if (confirmDialog.action === "bulk-delete") handleBulkDelete();
                                    else if (confirmDialog.action === "bulk-ban") { handleBulkBan(); setConfirmDialog(null); }
                                }}
                                className="flex-1 h-[38px] bg-red-500/20 border border-red-500/30 text-red-400 text-[13px] font-bold rounded-lg hover:bg-red-500/30 transition-colors"
                            >
                                {actionLoading ? <Spinner className="h-4 w-4 mx-auto" /> : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex min-h-[calc(100vh-64px)]">
                {/* ── SIDEBAR ── */}
                <aside className="w-[240px] flex-shrink-0 border-r border-[var(--border-secondary)] bg-[var(--bg-header)] backdrop-blur-md p-4 flex flex-col gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all ${activeTab === tab.key
                                ? "bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/20"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-transparent"
                                }`}
                        >
                            <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}

                    <div className="mt-auto pt-4 border-t border-[var(--border-secondary)]">
                        <div className="px-4 py-2">
                            <div className="text-[10px] font-bold text-[var(--text-dimmed)] uppercase tracking-wider mb-1">Distrorun</div>
                        </div>
                    </div>
                </aside>

                {/* ── MAIN CONTENT ── */}
                <main className="flex-1 min-w-0 p-8 overflow-y-auto">

                    {/* ═══ OVERVIEW TAB ═══ */}
                    {activeTab === "overview" && (
                        <div>
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">Overview</h1>
                                    <p className="text-[13px] text-[var(--text-muted)] mt-1">Platform health and key metrics</p>
                                </div>
                                <button onClick={fetchUsers} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-accent)] transition-colors">
                                    <FontAwesomeIcon icon={faRefresh} className="w-3 h-3" /> Refresh
                                </button>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-4 gap-4 mb-8">
                                <StatCard value={totalUsers} label="Total Users" icon={faUsers} color="var(--text-primary)" trend={{ value: `+${recentUsers}`, up: true }} />
                                <StatCard value={adminCount} label="Administrators" icon={faUserShield} color="var(--accent)" />
                                <StatCard value={bannedCount} label="Banned Users" icon={faBan} color="#f87171" />
                                <StatCard value={recentUsers} label="New This Week" icon={faClock} color="#34d399" />
                            </div>

                            {/* Recent Activity + Quick Actions */}
                            <div className="grid grid-cols-3 gap-6">
                                {/* Recent Users */}
                                <div className="col-span-2 bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-2xl overflow-hidden">
                                    <div className="px-5 py-4 border-b border-[var(--border-secondary)] flex items-center justify-between">
                                        <span className="text-[14px] font-bold text-[var(--text-primary)]">Recent Users</span>
                                        <button onClick={() => setActiveTab("users")} className="text-[11px] font-bold text-[var(--accent)] hover:opacity-80 transition-opacity">
                                            VIEW ALL
                                        </button>
                                    </div>
                                    <div className="divide-y divide-[var(--border-secondary)]">
                                        {loadingUsers ? (
                                            <div className="flex items-center justify-center py-12 text-[var(--text-muted)]"><Spinner className="h-4 w-4 mr-2" /> Loading...</div>
                                        ) : users.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5).map(user => (
                                            <div key={user.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--bg-secondary)]/30 transition-colors">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {user.image ? (
                                                        <img src={user.image} alt="" className="w-8 h-8 rounded-full border border-[var(--border-secondary)]" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)] font-bold text-[12px]">
                                                            {user.name?.charAt(0)?.toUpperCase() || "?"}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[13px] font-bold text-[var(--text-primary)] truncate">{user.name}</span>
                                                            {user.role === "admin" && (
                                                                <span className="text-[9px] font-bold bg-[var(--accent)]/15 text-[var(--accent)] px-1.5 py-0.5 rounded-full">ADMIN</span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-[var(--text-dimmed)] truncate">{user.email}</div>
                                                    </div>
                                                </div>
                                                <span className="text-[11px] text-[var(--text-dimmed)] flex-shrink-0">{formatRelative(user.createdAt)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="space-y-4">
                                    <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-2xl p-5">
                                        <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-4">Quick Actions</h3>
                                        <div className="space-y-2">
                                            <button onClick={() => setActiveTab("users")} className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-accent)] transition-all">
                                                <FontAwesomeIcon icon={faUsers} className="w-3.5 h-3.5 text-[var(--accent)]" /> Manage Users
                                            </button>
                                            <button onClick={() => setActiveTab("registry")} className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-accent)] transition-all">
                                                <FontAwesomeIcon icon={faCubes} className="w-3.5 h-3.5 text-[var(--accent)]" /> Manage Registry
                                            </button>
                                            <button onClick={() => setActiveTab("settings")} className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-accent)] transition-all">
                                                <FontAwesomeIcon icon={faGear} className="w-3.5 h-3.5 text-[var(--accent)]" /> Platform Settings
                                            </button>
                                        </div>
                                    </div>

                                    {/* Role Distribution */}
                                    <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-2xl p-5">
                                        <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-4">Role Distribution</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[12px] text-[var(--text-muted)]">Users</span>
                                                    <span className="text-[12px] font-bold text-[var(--text-primary)]">{totalUsers - adminCount}</span>
                                                </div>
                                                <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                                    <div className="h-full bg-[var(--accent)] rounded-full transition-all" style={{ width: totalUsers ? `${((totalUsers - adminCount) / totalUsers) * 100}%` : "0%" }} />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[12px] text-[var(--text-muted)]">Admins</span>
                                                    <span className="text-[12px] font-bold text-[var(--accent)]">{adminCount}</span>
                                                </div>
                                                <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: totalUsers ? `${(adminCount / totalUsers) * 100}%` : "0%" }} />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[12px] text-[var(--text-muted)]">Banned</span>
                                                    <span className="text-[12px] font-bold text-red-400">{bannedCount}</span>
                                                </div>
                                                <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                                    <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: totalUsers ? `${(bannedCount / totalUsers) * 100}%` : "0%" }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ USERS TAB ═══ */}
                    {activeTab === "users" && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">User Management</h1>
                                    <p className="text-[13px] text-[var(--text-muted)] mt-1">{totalUsers} users total</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {selectedUsers.size > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[12px] text-[var(--text-muted)]">{selectedUsers.size} selected</span>
                                            <button
                                                onClick={() => setConfirmDialog({ userId: "", action: "bulk-ban", message: `Ban ${selectedUsers.size} selected user(s)?` })}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[11px] font-bold rounded-lg hover:bg-yellow-500/20 transition-colors"
                                            >
                                                <FontAwesomeIcon icon={faBan} className="w-[10px] h-[10px]" /> Ban
                                            </button>
                                            <button
                                                onClick={() => setConfirmDialog({ userId: "", action: "bulk-delete", message: `Permanently delete ${selectedUsers.size} selected user(s)? This cannot be undone.` })}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold rounded-lg hover:bg-red-500/20 transition-colors"
                                            >
                                                <FontAwesomeIcon icon={faTrash} className="w-[10px] h-[10px]" /> Delete
                                            </button>
                                        </div>
                                    )}
                                    <button onClick={fetchUsers} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                                        <FontAwesomeIcon icon={faRefresh} className="w-[10px] h-[10px]" /> Refresh
                                    </button>
                                </div>
                            </div>

                            {/* Toolbar: Search + Filters */}
                            <div className="flex items-center gap-3 mb-5">
                                <div className="relative flex-1 max-w-[400px]">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dimmed)]">
                                        <FontAwesomeIcon icon={faSearch} className="w-[13px] h-[13px]" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="w-full h-10 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg pl-10 pr-4 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                                    />
                                </div>
                                <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg p-1">
                                    {(["all", "admin", "user", "banned"] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setRoleFilter(f)}
                                            className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors ${roleFilter === f
                                                ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                                                : "text-[var(--text-dimmed)] hover:text-[var(--text-muted)]"
                                                }`}
                                        >
                                            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}{f === "all" ? ` (${totalUsers})` : f === "admin" ? ` (${adminCount})` : f === "banned" ? ` (${bannedCount})` : ` (${totalUsers - adminCount})`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Users Table */}
                            <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-2xl overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-[40px_1fr_1fr_100px_120px_80px] gap-4 items-center px-5 py-3 border-b border-[var(--border-secondary)] bg-[var(--bg-secondary)]/30">
                                    <div className="flex items-center justify-center">
                                        <button onClick={toggleSelectAll} className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${selectedUsers.size === sortedFilteredUsers.length && sortedFilteredUsers.length > 0 ? "bg-[var(--accent)] border-[var(--accent)]" : "border-[var(--border-secondary)] bg-[var(--bg-secondary)] hover:border-[var(--text-dimmed)]"}`}>
                                            {selectedUsers.size === sortedFilteredUsers.length && sortedFilteredUsers.length > 0 && <FontAwesomeIcon icon={faCheck} className="w-[8px] h-[8px] text-white" />}
                                        </button>
                                    </div>
                                    <SortHeader label="User" sortKey="name" />
                                    <SortHeader label="Email" sortKey="email" />
                                    <SortHeader label="Role" sortKey="role" />
                                    <SortHeader label="Joined" sortKey="createdAt" />
                                    <span className="text-[11px] font-bold text-[var(--text-dimmed)] uppercase tracking-wider text-right">Actions</span>
                                </div>

                                {loadingUsers ? (
                                    <div className="flex items-center justify-center py-16 text-[var(--text-muted)]"><Spinner className="h-4 w-4 mr-2" /> Loading users...</div>
                                ) : sortedFilteredUsers.length === 0 ? (
                                    <div className="text-center py-16">
                                        <FontAwesomeIcon icon={faUsers} className="w-8 h-8 text-[var(--text-dimmed)] mb-3" />
                                        <p className="text-[var(--text-muted)] text-[13px]">No users found.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-[var(--border-secondary)]">
                                        {sortedFilteredUsers.map(user => (
                                            <div key={user.id} className={`grid grid-cols-[40px_1fr_1fr_100px_120px_80px] gap-4 items-center px-5 py-3.5 transition-colors ${selectedUsers.has(user.id) ? "bg-[var(--accent)]/5" : "hover:bg-[var(--bg-secondary)]/30"}`}>
                                                {/* Checkbox */}
                                                <div className="flex items-center justify-center">
                                                    <button onClick={() => toggleSelect(user.id)} className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${selectedUsers.has(user.id) ? "bg-[var(--accent)] border-[var(--accent)]" : "border-[var(--border-secondary)] bg-[var(--bg-secondary)] hover:border-[var(--text-dimmed)]"}`}>
                                                        {selectedUsers.has(user.id) && <FontAwesomeIcon icon={faCheck} className="w-[8px] h-[8px] text-white" />}
                                                    </button>
                                                </div>

                                                {/* User */}
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {user.image ? (
                                                        <img src={user.image} alt="" className="w-8 h-8 rounded-full border border-[var(--border-secondary)] flex-shrink-0" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)] font-bold text-[12px] flex-shrink-0">
                                                            {user.name?.charAt(0)?.toUpperCase() || "?"}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <span className="text-[13px] font-bold text-[var(--text-primary)] truncate block">{user.name}</span>
                                                        {user.id === session.user.id && <span className="text-[10px] text-[var(--accent)] font-medium">You</span>}
                                                    </div>
                                                </div>

                                                {/* Email */}
                                                <span className="text-[12px] text-[var(--text-muted)] truncate">{user.email}</span>

                                                {/* Role */}
                                                <div>
                                                    {user.banned ? (
                                                        <span className="text-[10px] font-bold bg-red-500/15 text-red-400 px-2 py-1 rounded-full border border-red-500/30">BANNED</span>
                                                    ) : user.role === "admin" ? (
                                                        <span className="text-[10px] font-bold bg-[var(--accent)]/15 text-[var(--accent)] px-2 py-1 rounded-full border border-[var(--accent)]/30">ADMIN</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold bg-[var(--bg-secondary)] text-[var(--text-dimmed)] px-2 py-1 rounded-full border border-[var(--border-secondary)]">USER</span>
                                                    )}
                                                </div>

                                                {/* Joined */}
                                                <span className="text-[11px] text-[var(--text-dimmed)]">{formatDate(user.createdAt)}</span>

                                                {/* Actions */}
                                                <div className="flex items-center justify-end relative" ref={userActionMenu === user.id ? actionMenuRef : null}>
                                                    {actionLoading === user.id ? (
                                                        <Spinner className="h-4 w-4" />
                                                    ) : user.id === session.user.id ? (
                                                        <span className="text-[10px] text-[var(--text-dimmed)]">--</span>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => setUserActionMenu(userActionMenu === user.id ? null : user.id)}
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-dimmed)] hover:text-[var(--text-primary)] hover:border-[var(--border-accent)] transition-colors"
                                                            >
                                                                <FontAwesomeIcon icon={faEllipsisVertical} className="w-3 h-3" />
                                                            </button>
                                                            {userActionMenu === user.id && (
                                                                <div className="absolute right-0 top-10 w-[180px] bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden z-30 backdrop-blur-xl">
                                                                    <button
                                                                        onClick={() => handleSetRole(user.id, user.role === "admin" ? "user" : "admin")}
                                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                                                    >
                                                                        <FontAwesomeIcon icon={faUserShield} className="w-3 h-3" />
                                                                        {user.role === "admin" ? "Revoke Admin" : "Make Admin"}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleBan(user.id, !user.banned)}
                                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                                                                    >
                                                                        <FontAwesomeIcon icon={faBan} className="w-3 h-3" />
                                                                        {user.banned ? "Unban User" : "Ban User"}
                                                                    </button>
                                                                    <div className="h-[1px] bg-[var(--border-secondary)]" />
                                                                    <button
                                                                        onClick={() => { setUserActionMenu(null); setConfirmDialog({ userId: user.id, action: "delete", message: `Permanently delete "${user.name}"? This cannot be undone.` }); }}
                                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] text-red-400 hover:bg-red-500/10 transition-colors"
                                                                    >
                                                                        <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                                                                        Delete User
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Table Footer */}
                                <div className="px-5 py-3 border-t border-[var(--border-secondary)] flex items-center justify-between">
                                    <span className="text-[11px] text-[var(--text-dimmed)]">Showing {sortedFilteredUsers.length} of {totalUsers} users</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ REGISTRY TAB ═══ */}
                    {activeTab === "registry" && (
                        <div>
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">Registry Management</h1>
                                    <p className="text-[13px] text-[var(--text-muted)] mt-1">Manage published configurations and templates</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setShowPublishDialog(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] border border-[var(--accent)] rounded-lg text-[12px] font-bold text-white hover:opacity-90 transition-opacity">
                                        <FontAwesomeIcon icon={faUserPlus} className="w-3 h-3" /> Publish Official OS
                                    </button>
                                    <button onClick={fetchRegistries} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-accent)] transition-colors">
                                        <FontAwesomeIcon icon={faRefresh} className="w-3 h-3" /> Refresh
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <StatCard value={registries.length} label="Total OS" icon={faCubes} color="var(--accent)" />
                                <StatCard value={registries.filter(r => !r.hidden).length} label="Visible" icon={faCircleCheck} color="#34d399" />
                                <StatCard value={registries.filter(r => r.hidden).length} label="Hidden" icon={faEye} color="#f87171" />
                            </div>

                            <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-2xl overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-[1fr_120px_100px_100px_120px_80px] gap-4 items-center px-5 py-3 border-b border-[var(--border-secondary)] bg-[var(--bg-secondary)]/30">
                                    <span className="text-[11px] font-bold text-[var(--text-dimmed)] uppercase tracking-wider">OS</span>
                                    <span className="text-[11px] font-bold text-[var(--text-dimmed)] uppercase tracking-wider">Author</span>
                                    <span className="text-[11px] font-bold text-[var(--text-dimmed)] uppercase tracking-wider text-center">Downloads</span>
                                    <span className="text-[11px] font-bold text-[var(--text-dimmed)] uppercase tracking-wider text-center">Status</span>
                                    <span className="text-[11px] font-bold text-[var(--text-dimmed)] uppercase tracking-wider text-center">Created</span>
                                    <span className="text-[11px] font-bold text-[var(--text-dimmed)] uppercase tracking-wider text-right">Actions</span>
                                </div>

                                {loadingRegistries ? (
                                    <div className="flex items-center justify-center py-16 text-[var(--text-muted)]"><Spinner className="h-4 w-4 mr-2" /> Loading registries...</div>
                                ) : registries.length === 0 ? (
                                    <div className="text-center py-16">
                                        <FontAwesomeIcon icon={faCubes} className="w-8 h-8 text-[var(--text-dimmed)] mb-3" />
                                        <p className="text-[var(--text-muted)] text-[13px]">No OS found in registry.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-[var(--border-secondary)]">
                                        {registries.map(pkg => (
                                            <div key={pkg.id} className="grid grid-cols-[1fr_120px_100px_100px_120px_80px] gap-4 items-center px-5 py-3.5 hover:bg-[var(--bg-secondary)]/30 transition-colors">
                                                {/* Package Name & Icon */}
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[14px] flex-shrink-0" style={{ backgroundColor: `${pkg.icon_color || 'var(--accent)'}20`, color: pkg.icon_color || 'var(--accent)' }}>
                                                        <FontAwesomeIcon icon={getIcon(pkg.icon)} className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-[13px] font-bold text-[var(--text-primary)] truncate block">{pkg.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-[var(--text-dimmed)]">v{pkg.latest_version}</span>
                                                            {pkg.official && (
                                                                <span className="text-[9px] font-extrabold bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded-full border border-green-500/30 tracking-tighter">OFFICIAL</span>
                                                            )}
                                                            <div className="flex gap-1">
                                                                {pkg.tags.slice(0, 2).map(tag => (
                                                                    <span key={tag} className="text-[8px] px-1.5 py-0.5 bg-[var(--bg-secondary)] text-[var(--text-dimmed)] rounded-full border border-[var(--border-secondary)] uppercase">{tag}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Author */}
                                                <div className="min-w-0">
                                                    {pkg.official ? (
                                                        <div className="flex items-center gap-1.5 text-[12px] text-green-400 font-bold">
                                                            <FontAwesomeIcon icon={faShieldHalved} className="w-2.5 h-2.5" />
                                                            <span className="truncate">Staff</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[12px] text-[var(--text-muted)] truncate">{pkg.user_name}</span>
                                                    )}
                                                </div>

                                                {/* Downloads */}
                                                <div className="text-center">
                                                    <span className="text-[12px] font-medium text-[var(--text-primary)]">{pkg.downloads}</span>
                                                </div>

                                                {/* Status */}
                                                <div className="flex justify-center">
                                                    {pkg.hidden ? (
                                                        <span className="text-[9px] font-bold bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30">HIDDEN</span>
                                                    ) : (
                                                        <span className="text-[9px] font-bold bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">VISIBLE</span>
                                                    )}
                                                </div>

                                                {/* Created At */}
                                                <div className="text-center">
                                                    <span className="text-[11px] text-[var(--text-dimmed)]">{formatDate(pkg.created_at)}</span>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center justify-end relative" ref={registryActionMenu === pkg.name ? actionMenuRef : null}>
                                                    {actionLoading === pkg.name ? (
                                                        <Spinner className="h-4 w-4" />
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => setRegistryActionMenu(registryActionMenu === pkg.name ? null : pkg.name)}
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-dimmed)] hover:text-[var(--text-primary)] hover:border-[var(--border-accent)] transition-colors"
                                                            >
                                                                <FontAwesomeIcon icon={faEllipsisVertical} className="w-3 h-3" />
                                                            </button>
                                                            {registryActionMenu === pkg.name && (
                                                                <div className="absolute right-0 top-10 w-[180px] bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden z-30 backdrop-blur-xl">
                                                                    <button
                                                                        onClick={() => handleToggleVisibility(pkg.name, !pkg.hidden)}
                                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                                                    >
                                                                        <FontAwesomeIcon icon={pkg.hidden ? faEye : faEyeSlash} className="w-3 h-3" />
                                                                        {pkg.hidden ? "Show in Registry" : "Hide from Registry"}
                                                                    </button>
                                                                    <div className="h-[1px] bg-[var(--border-secondary)]" />
                                                                    <button
                                                                        onClick={() => { setRegistryActionMenu(null); setConfirmDialog({ registryName: pkg.name, action: "delete-registry", message: `Permanently delete registry OS "${pkg.name}"? This cannot be undone.` }); }}
                                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] text-red-400 hover:bg-red-500/10 transition-colors"
                                                                    >
                                                                        <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                                                                        Delete OS
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="px-5 py-3 border-t border-[var(--border-secondary)] bg-[var(--bg-secondary)]/10 flex items-center justify-between">
                                    <span className="text-[11px] text-[var(--text-dimmed)]">Showing {registries.length} OS</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ SETTINGS TAB ═══ */}
                    {activeTab === "settings" && (
                        <div>
                            <div className="mb-8">
                                <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">Platform Settings</h1>
                                <p className="text-[13px] text-[var(--text-muted)] mt-1">Configure platform-wide settings and policies</p>
                            </div>

                            <div className="space-y-6">
                                {/* Auth Settings */}
                                <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-2xl overflow-hidden">
                                    <div className="px-6 py-4 border-b border-[var(--border-secondary)]">
                                        <h3 className="text-[14px] font-bold text-[var(--text-primary)]">Authentication</h3>
                                        <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Social login and registration settings</p>
                                    </div>
                                    <div className="divide-y divide-[var(--border-secondary)]">
                                        <div className="flex items-center justify-between px-6 py-4">
                                            <div>
                                                <div className="text-[13px] font-semibold text-[var(--text-primary)]">Email & Password</div>
                                                <div className="text-[11px] text-[var(--text-dimmed)]">Allow users to register with email</div>
                                            </div>
                                            <div className="w-10 h-6 bg-[var(--accent)] rounded-full relative cursor-pointer">
                                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between px-6 py-4">
                                            <div>
                                                <div className="text-[13px] font-semibold text-[var(--text-primary)]">GitHub OAuth</div>
                                                <div className="text-[11px] text-[var(--text-dimmed)]">Sign in with GitHub</div>
                                            </div>
                                            <div className="w-10 h-6 bg-[var(--accent)] rounded-full relative cursor-pointer">
                                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between px-6 py-4">
                                            <div>
                                                <div className="text-[13px] font-semibold text-[var(--text-primary)]">Google OAuth</div>
                                                <div className="text-[11px] text-[var(--text-dimmed)]">Sign in with Google</div>
                                            </div>
                                            <div className="w-10 h-6 bg-[var(--accent)] rounded-full relative cursor-pointer">
                                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Registry Settings */}
                                <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-2xl overflow-hidden">
                                    <div className="px-6 py-4 border-b border-[var(--border-secondary)]">
                                        <h3 className="text-[14px] font-bold text-[var(--text-primary)]">Registry</h3>
                                        <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Control registry publishing and visibility</p>
                                    </div>
                                    <div className="divide-y divide-[var(--border-secondary)]">
                                        <div className="flex items-center justify-between px-6 py-4">
                                            <div>
                                                <div className="text-[13px] font-semibold text-[var(--text-primary)]">Public Submissions</div>
                                                <div className="text-[11px] text-[var(--text-dimmed)]">Allow community members to submit configs</div>
                                            </div>
                                            <div className="w-10 h-6 bg-[var(--accent)] rounded-full relative cursor-pointer">
                                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between px-6 py-4">
                                            <div>
                                                <div className="text-[13px] font-semibold text-[var(--text-primary)]">Require Approval</div>
                                                <div className="text-[11px] text-[var(--text-dimmed)]">Submissions require admin review before publishing</div>
                                            </div>
                                            <div className="w-10 h-6 bg-[var(--accent)] rounded-full relative cursor-pointer">
                                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between px-6 py-4">
                                            <div>
                                                <div className="text-[13px] font-semibold text-[var(--text-primary)]">Download Tracking</div>
                                                <div className="text-[11px] text-[var(--text-dimmed)]">Track download counts for each config</div>
                                            </div>
                                            <div className="w-10 h-6 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-full relative cursor-pointer">
                                                <div className="absolute left-1 top-1 w-4 h-4 bg-[var(--text-dimmed)] rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-red-500/20 rounded-2xl overflow-hidden">
                                    <div className="px-6 py-4 border-b border-red-500/20">
                                        <h3 className="text-[14px] font-bold text-red-400">Danger Zone</h3>
                                        <p className="text-[12px] text-[var(--text-dimmed)] mt-0.5">Irreversible actions</p>
                                    </div>
                                    <div className="divide-y divide-red-500/10">
                                        <div className="flex items-center justify-between px-6 py-4">
                                            <div>
                                                <div className="text-[13px] font-semibold text-[var(--text-primary)]">Reset All User Sessions</div>
                                                <div className="text-[11px] text-[var(--text-dimmed)]">Force all users to sign in again</div>
                                            </div>
                                            <button className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] font-bold rounded-lg hover:bg-red-500/20 transition-colors">
                                                Reset Sessions
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between px-6 py-4">
                                            <div>
                                                <div className="text-[13px] font-semibold text-[var(--text-primary)]">Purge Banned Users</div>
                                                <div className="text-[11px] text-[var(--text-dimmed)]">Permanently delete all banned accounts</div>
                                            </div>
                                            <button className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] font-bold rounded-lg hover:bg-red-500/20 transition-colors">
                                                Purge Users
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ HEALTH TAB ═══ */}
                    {activeTab === "health" && (
                        <div>
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">System Health</h1>
                                    <p className="text-[13px] text-[var(--text-muted)] mt-1">Real-time status of connected services</p>
                                </div>
                                <button onClick={() => fetchHealth(false)} disabled={loadingHealth} className="w-9 h-9 rounded-xl border border-[var(--border-secondary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all">
                                    <FontAwesomeIcon icon={faRefresh} className={`w-[14px] h-[14px] ${loadingHealth ? "animate-spin" : ""}`} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Database Card */}
                                <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                            <FontAwesomeIcon icon={faDatabase} className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${healthStatus?.db === 'up' ? 'bg-green-500/10 text-green-400 border-green-500/20' : healthStatus?.db === 'down' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-secondary)]'}`}>
                                            {loadingHealth ? "Checking" : healthStatus?.db || "Unknown"}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">Database</h3>
                                        <p className="text-[13px] text-[var(--text-dimmed)]">PostgreSQL Core</p>
                                    </div>
                                    <div className={`absolute bottom-0 left-0 h-1 w-full transition-colors ${healthStatus?.db === 'up' ? 'bg-green-400' : healthStatus?.db === 'down' ? 'bg-red-400' : 'bg-[var(--border-secondary)]'}`} />
                                </div>

                                {/* MinIO Card */}
                                <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-2xl p-6 relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                            <FontAwesomeIcon icon={faHardDrive} className="w-5 h-5 text-cyan-400" />
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${healthStatus?.minio === 'up' ? 'bg-green-500/10 text-green-400 border-green-500/20' : healthStatus?.minio === 'down' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-secondary)]'}`}>
                                            {loadingHealth ? "Checking" : healthStatus?.minio || "Unknown"}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">MinIO</h3>
                                        <p className="text-[13px] text-[var(--text-dimmed)]">Object Storage</p>
                                    </div>
                                    <div className={`absolute bottom-0 left-0 h-1 w-full transition-colors ${healthStatus?.minio === 'up' ? 'bg-cyan-400' : healthStatus?.minio === 'down' ? 'bg-red-400' : 'bg-[var(--border-secondary)]'}`} />
                                </div>

                                {/* RAG Server Card */}
                                <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-2xl p-6 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                            <FontAwesomeIcon icon={faRobot} className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${healthStatus?.rag === 'up' ? 'bg-green-500/10 text-green-400 border-green-500/20' : healthStatus?.rag === 'down' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-secondary)]'}`}>
                                            {loadingHealth ? "Checking" : healthStatus?.rag || "Unknown"}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">RAG Service</h3>
                                        <p className="text-[13px] text-[var(--text-dimmed)]">Ollama LLM Engine</p>
                                    </div>
                                    <div className={`absolute bottom-0 left-0 h-1 w-full transition-colors ${healthStatus?.rag === 'up' ? 'bg-green-400' : healthStatus?.rag === 'down' ? 'bg-red-400' : 'bg-[var(--border-secondary)]'}`} />
                                </div>

                                {/* Documentation Server Card */}
                                <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-2xl p-6 relative overflow-hidden group hover:border-orange-500/30 transition-colors">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                                            <FontAwesomeIcon icon={faBook} className="w-5 h-5 text-orange-400" />
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${healthStatus?.docs === 'up' ? 'bg-green-500/10 text-green-400 border-green-500/20' : healthStatus?.docs === 'down' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-secondary)]'}`}>
                                            {loadingHealth ? "Checking" : healthStatus?.docs || "Unknown"}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">Docs Server</h3>
                                        <p className="text-[13px] text-[var(--text-dimmed)]">Documentation Portal</p>
                                    </div>
                                    <div className={`absolute bottom-0 left-0 h-1 w-full transition-colors ${healthStatus?.docs === 'up' ? 'bg-green-400' : healthStatus?.docs === 'down' ? 'bg-red-400' : 'bg-[var(--border-secondary)]'}`} />
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* ═══ PUBLISH OS DIALOG ═══ */}
            {showPublishDialog && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPublishDialog(false)} />
                    <div className="relative w-full max-w-[720px] bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-2xl shadow-[var(--shadow-heavy)] overflow-hidden backdrop-blur-xl">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-[var(--border-secondary)] flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/20 flex items-center justify-center">
                                <FontAwesomeIcon icon={faCubes} className="w-4 h-4 text-[var(--accent)]" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[16px] font-bold text-[var(--text-primary)]">Publish Official OS</h3>
                                <p className="text-[11px] text-[var(--text-dimmed)] mt-0.5">Create a new official OS configuration for the registry</p>
                            </div>
                            <button onClick={() => setShowPublishDialog(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-dimmed)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
                                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                            {/* Live Preview Card */}
                            <div className="bg-[var(--bg-secondary)]/50 border border-[var(--border-secondary)] rounded-xl p-4">
                                <div className="text-[10px] font-bold text-[var(--text-dimmed)] uppercase tracking-wider mb-3">Preview</div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-secondary)] flex items-center justify-center flex-shrink-0">
                                        <FontAwesomeIcon icon={getIcon(publishData.icon)} className="w-5 h-5" style={{ color: publishData.iconColor || 'var(--accent)' }} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[14px] font-bold text-[var(--text-primary)] truncate">{publishData.name || "OS Name"}</span>
                                            <span className="text-[9px] font-bold bg-[var(--accent)]/15 text-[var(--accent)] px-1.5 py-0.5 rounded-full flex-shrink-0">OFFICIAL</span>
                                        </div>
                                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{publishData.description || "OS description will appear here..."}</p>
                                        {publishTags.length > 0 && (
                                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                {publishTags.slice(0, 4).map(tag => (
                                                    <span key={tag} className="text-[9px] font-medium bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-dimmed)] px-1.5 py-0.5 rounded-md">{tag}</span>
                                                ))}
                                                {publishTags.length > 4 && <span className="text-[9px] text-[var(--text-dimmed)]">+{publishTags.length - 4}</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-[var(--text-dimmed)] flex-shrink-0">{publishData.baseDistro}</div>
                                </div>
                            </div>

                            {/* Name & Base Distro */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-[var(--text-dimmed)] uppercase tracking-wider">OS Name *</label>
                                    <input
                                        type="text"
                                        value={publishData.name}
                                        onChange={e => setPublishData({ ...publishData, name: e.target.value })}
                                        className="w-full h-10 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl px-3.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                                        placeholder="e.g. NodeOS"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-[var(--text-dimmed)] uppercase tracking-wider">Base Distro</label>
                                    <select
                                        value={publishData.baseDistro}
                                        onChange={e => setPublishData({ ...publishData, baseDistro: e.target.value })}
                                        className="w-full h-10 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl px-3.5 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                                    >
                                        <option value="alpine">Alpine</option>
                                        <option value="fedora">Fedora</option>
                                    </select>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-[var(--text-dimmed)] uppercase tracking-wider">Description</label>
                                <textarea
                                    value={publishData.description}
                                    onChange={e => setPublishData({ ...publishData, description: e.target.value })}
                                    className="w-full h-20 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl p-3.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] resize-none transition-colors"
                                    placeholder="Describe what this OS is for..."
                                />
                            </div>

                            {/* Icon & Color */}
                            <div className="bg-[var(--bg-secondary)]/30 border border-[var(--border-secondary)] rounded-xl p-4 space-y-4" ref={publishIconPickerRef}>
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-[var(--text-dimmed)] uppercase tracking-wider">Icon & Color</label>
                                    <button
                                        onClick={() => setPublishIconPickerOpen(!publishIconPickerOpen)}
                                        className="text-[11px] font-medium text-[var(--accent)] hover:underline"
                                    >
                                        {publishIconPickerOpen ? "Close picker" : "Browse icons"}
                                    </button>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-secondary)] flex items-center justify-center">
                                        <FontAwesomeIcon icon={getIcon(publishData.icon)} className="w-6 h-6" style={{ color: publishData.iconColor || 'var(--accent)' }} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[12px] font-medium text-[var(--text-primary)]">{publishData.icon}</p>
                                        <p className="text-[10px] text-[var(--text-dimmed)] mt-0.5 font-mono">{publishData.iconColor}</p>
                                    </div>
                                </div>

                                {/* Color Presets */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {[
                                            "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
                                            "#ec4899", "#ef4444", "#f97316", "#f59e0b",
                                            "#eab308", "#22c55e", "#10b981", "#14b8a6",
                                            "#06b6d4", "#0ea5e9", "#64748b", "#ffffff",
                                        ].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setPublishData({ ...publishData, iconColor: color })}
                                                className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${publishData.iconColor === color ? 'ring-2 ring-offset-2 ring-[var(--text-primary)] ring-offset-[var(--bg-card)]' : ''}`}
                                                style={{ backgroundColor: color }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={publishData.iconColor}
                                            onChange={e => setPublishData({ ...publishData, iconColor: e.target.value })}
                                            className="w-8 h-8 rounded-lg border border-[var(--border-secondary)] cursor-pointer bg-transparent"
                                        />
                                        <input
                                            type="text"
                                            value={publishData.iconColor}
                                            onChange={e => setPublishData({ ...publishData, iconColor: e.target.value })}
                                            placeholder="#3b82f6"
                                            className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] transition-colors font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Icon Grid */}
                                {publishIconPickerOpen && (
                                    <div className="space-y-3 pt-2 border-t border-[var(--border-secondary)]">
                                        <input
                                            value={publishIconSearch}
                                            onChange={e => setPublishIconSearch(e.target.value)}
                                            placeholder="Search icons..."
                                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg px-3 py-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                                        />
                                        <div className="grid grid-cols-8 gap-1.5 max-h-[180px] overflow-y-auto">
                                            {filteredPublishIcons.map(name => (
                                                <button
                                                    key={name}
                                                    onClick={() => { setPublishData({ ...publishData, icon: name }); setPublishIconPickerOpen(false); setPublishIconSearch(""); }}
                                                    className={`w-full aspect-square rounded-lg flex items-center justify-center transition-colors ${publishData.icon === name ? 'text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]/80'}`}
                                                    style={publishData.icon === name ? { backgroundColor: publishData.iconColor || 'var(--accent)' } : undefined}
                                                    title={name}
                                                >
                                                    <FontAwesomeIcon icon={ICON_MAP[name]} className="w-4 h-4" />
                                                </button>
                                            ))}
                                            {filteredPublishIcons.length === 0 && (
                                                <p className="col-span-8 text-center text-[11px] text-[var(--text-dimmed)] py-4">No icons found</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tags */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-[var(--text-dimmed)] uppercase tracking-wider">Tags</label>
                                {publishTags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {publishTags.map(tag => (
                                            <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--accent)] text-[11px] font-medium rounded-md">
                                                {tag}
                                                <button onClick={() => handlePublishRemoveTag(tag)} className="text-[var(--text-dimmed)] hover:text-red-400 transition-colors">
                                                    <FontAwesomeIcon icon={faXmark} className="w-2 h-2" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <input
                                        value={publishTagInput}
                                        onChange={e => setPublishTagInput(e.target.value)}
                                        onKeyDown={handlePublishTagKeyDown}
                                        placeholder="Add a tag and press Enter..."
                                        className="flex-1 h-10 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl px-3.5 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                                    />
                                    <button onClick={handlePublishAddTag} className="h-10 px-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-muted)] text-[12px] font-medium hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
                                        Add
                                    </button>
                                </div>
                            </div>

                            {/* YAML Configuration */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-[var(--text-dimmed)] uppercase tracking-wider">YAML Configuration *</label>
                                <textarea
                                    value={publishData.yamlContent}
                                    onChange={e => setPublishData({ ...publishData, yamlContent: e.target.value })}
                                    className="w-full h-48 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl p-3.5 text-[12px] font-mono text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] resize-none transition-colors leading-relaxed"
                                    placeholder={"version: 1\nname: my-os\ndistro:\n  base: alpine\npackages:\n  - nodejs\n  - npm\nusers:\n  - name: admin\n    password: changeme"}
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-[var(--border-secondary)] flex items-center justify-between">
                            <div className="text-[11px] text-[var(--text-dimmed)]">
                                {publishData.name && publishData.yamlContent ? "Ready to publish" : "Fill in required fields (*)"}
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setShowPublishDialog(false)} className="px-4 py-2.5 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded-xl hover:bg-[var(--bg-secondary)]">
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePublishOS}
                                    disabled={actionLoading === "publish" || !publishData.name || !publishData.yamlContent}
                                    className="px-6 py-2.5 bg-[var(--accent)] rounded-xl text-[13px] font-bold text-white hover:bg-[var(--accent-hover)] transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {actionLoading === "publish" ? <Spinner className="h-4 w-4" /> : (
                                        <>
                                            <FontAwesomeIcon icon={faCircleCheck} className="w-3.5 h-3.5" />
                                            Publish Official OS
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
