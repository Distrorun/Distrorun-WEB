"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faDownload,
    faCheckCircle,
    faHistory,
    faCopy,
    faSun,
    faMoon,
    faChevronDown,
    faGear,
    faRightFromBracket,
    faShieldAlt,
    faArrowLeft,
    faFileCode,
    faBoxOpen,
    faPen,
    faXmark,
    faSave,
    faPlus,
    faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { ICON_MAP, getIcon } from "@/lib/icons";

interface PackageData {
    name: string;
    description: string;
    userId: string;
    userName?: string;
    tags: string[];
    downloads: number;
    latestVersion: number;
    createdAt: string;
    updatedAt: string;
    icon?: string | null;
    iconColor?: string | null;
    official?: boolean;
    version: {
        number: number;
        yamlContent: string;
        sbomContent: string | null;
        baseDistro: string;
        packages: string[];
        services: string[];
        userCount: number;
        sbomEnabled: boolean;
        createdAt: string;
    } | null;
    history: { version: number; created_at: string; sbom_enabled: boolean }[];
}

export default function PullPage({ packageName }: { packageName: string }) {
    const { data: session, isPending } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [mounted, setMounted] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [pkg, setPkg] = useState<PackageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const { theme, setTheme, systemTheme } = useTheme();

    // Edit state
    const [editing, setEditing] = useState(false);
    const [editDescription, setEditDescription] = useState("");
    const [editTags, setEditTags] = useState<string[]>([]);
    const [editTagInput, setEditTagInput] = useState("");
    const [editYaml, setEditYaml] = useState("");
    const [editIcon, setEditIcon] = useState<string | null>(null);
    const [editIconColor, setEditIconColor] = useState<string | null>(null);
    const [iconPickerOpen, setIconPickerOpen] = useState(false);
    const [iconSearch, setIconSearch] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteInput, setDeleteInput] = useState("");
    const [deleting, setDeleting] = useState(false);
    const iconPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
            if (iconPickerRef.current && !iconPickerRef.current.contains(e.target as Node)) setIconPickerOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        async function fetchPackage() {
            try {
                const versionParam = searchParams.get("version");
                let url = `/api/registry/${encodeURIComponent(packageName)}`;
                if (versionParam) url += `?version=${versionParam}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error("OS not found");
                const data = await res.json();
                setPkg(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchPackage();
    }, [packageName, searchParams]);

    const currentTheme = theme === "system" ? systemTheme : theme;
    const isDark = currentTheme === "dark";
    const toggleTheme = () => setTheme(isDark ? "light" : "dark");

    const handleLogout = async () => {
        await signOut();
        router.push("/auth");
    };

    const handleCopyCommand = () => {
        navigator.clipboard.writeText(`distrorun pull ${packageName}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadYaml = () => {
        if (!pkg?.version?.yamlContent) return;
        const blob = new Blob([pkg.version.yamlContent], { type: "text/yaml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${pkg.name}.distrorun.yaml`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadSbom = () => {
        if (!pkg?.version?.sbomContent) return;
        const blob = new Blob([pkg.version.sbomContent], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${pkg.name}-sbom.spdx.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const isOwner = session?.user?.id === pkg?.userId;

    const startEditing = () => {
        if (!pkg) return;
        setEditDescription(pkg.description || "");
        setEditTags([...pkg.tags]);
        setEditYaml(pkg.version?.yamlContent || "");
        setEditIcon(pkg.icon || null);
        setEditIconColor(pkg.iconColor || null);
        setIconPickerOpen(false);
        setIconSearch("");
        setSaveError(null);
        setEditing(true);
    };

    const cancelEditing = () => {
        setEditing(false);
        setIconPickerOpen(false);
        setSaveError(null);
    };

    const handleAddTag = () => {
        const tag = editTagInput.trim();
        if (tag && !editTags.includes(tag)) {
            setEditTags(prev => [...prev, tag]);
        }
        setEditTagInput("");
    };

    const handleRemoveTag = (tag: string) => {
        setEditTags(prev => prev.filter(t => t !== tag));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleSave = async () => {
        if (!pkg) return;
        setSaving(true);
        setSaveError(null);

        try {
            const body: any = {
                description: editDescription,
                tags: editTags,
                icon: editIcon,
                iconColor: editIconColor,
            };
            if (editYaml !== (pkg.version?.yamlContent || "")) {
                body.yamlContent = editYaml;
            }

            const res = await fetch(`/api/registry/${encodeURIComponent(pkg.name)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save");
            }

            const refetch = await fetch(`/api/registry/${encodeURIComponent(packageName)}`);
            if (refetch.ok) {
                setPkg(await refetch.json());
            }
            setEditing(false);
        } catch (err: any) {
            setSaveError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!pkg || deleteInput !== pkg.name) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/registry/${encodeURIComponent(pkg.name)}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete");
            }
            router.push("/registry");
        } catch (err: any) {
            setSaveError(err.message);
            setDeleting(false);
        }
    };

    // Filtered icons for picker
    const filteredIcons = iconSearch
        ? Object.keys(ICON_MAP).filter(k => k.includes(iconSearch.toLowerCase()))
        : Object.keys(ICON_MAP);

    if (!mounted) return null;

    const renderYaml = (content: string) => {
        return content.split("\n").map((line, i) => {
            const keyMatch = line.match(/^(\s*)([\w_-]+)(:)(.*)/);
            if (keyMatch) {
                const [, indent, key, colon, rest] = keyMatch;
                return (
                    <div key={i} className="leading-[1.7]">
                        <span>{indent}</span>
                        <span className="text-[var(--accent)]">{key}</span>
                        <span className="text-[var(--text-dimmed)]">{colon}</span>
                        {rest.trim().startsWith("\"") || rest.trim().startsWith("'") ? (
                            <span className="text-emerald-400">{rest}</span>
                        ) : (
                            <span className="text-[var(--text-primary)]">{rest}</span>
                        )}
                    </div>
                );
            }
            const listMatch = line.match(/^(\s*)(- )(.*)/);
            if (listMatch) {
                const [, indent, dash, value] = listMatch;
                return (
                    <div key={i} className="leading-[1.7]">
                        <span>{indent}</span>
                        <span className="text-[var(--text-dimmed)]">{dash}</span>
                        <span className="text-[var(--text-primary)]">{value}</span>
                    </div>
                );
            }
            if (line.trim().startsWith("#")) {
                return (
                    <div key={i} className="leading-[1.7] text-[var(--text-dimmed)]">{line}</div>
                );
            }
            return <div key={i} className="leading-[1.7]">{line}</div>;
        });
    };

    const formatBytes = (str: string) => {
        const bytes = new TextEncoder().encode(str).length;
        if (bytes < 1024) return `${bytes} B`;
        return `${(bytes / 1024).toFixed(1)} KB`;
    };

    const timeAgo = (date: string) => {
        const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div
            className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-['Inter',sans-serif] selection:bg-[var(--accent)] selection:text-white transition-colors duration-300"
            style={{
                backgroundImage:
                    "linear-gradient(90deg, var(--grid-line) 2.5%, transparent 2.5%), linear-gradient(180deg, var(--grid-line) 2.5%, transparent 2.5%)",
                backgroundSize: "40px 40px",
            }}
        >
            {/* ── HEADER ── */}
            <header className="sticky top-0 z-50 w-full h-[72px] bg-[var(--bg-header)] backdrop-blur-md border-b border-[var(--border-secondary)] flex items-center px-6 lg:px-12 transition-colors duration-300">
                <div className="flex items-center gap-12 w-full max-w-[1440px] mx-auto">
                    <Link href="/" className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-bold text-[20px] tracking-tight">Distrorun</span>
                    </Link>

                    <div className="ml-auto flex items-center gap-6">
                        <nav className="hidden md:flex items-center gap-6 text-[14px] font-medium text-[var(--text-muted)]">
                            <Link href="/registry" className="hover:text-[var(--text-primary)] transition-colors">Explore</Link>
                            <Link href="http://localhost:8000" className="hover:text-[var(--text-primary)] transition-colors">Docs</Link>
                        </nav>

                        <button onClick={toggleTheme} className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                            <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="w-[14px] h-[14px]" />
                        </button>

                        {isPending ? (
                            <div className="w-[84px] h-[36px] bg-[var(--bg-secondary)] animate-pulse rounded-lg" />
                        ) : session ? (
                            <div className="relative" ref={menuRef}>
                                <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 text-[14px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--accent)]">
                                        {session.user.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="hidden sm:inline">{session.user.name}</span>
                                    <FontAwesomeIcon icon={faChevronDown} className={`w-[10px] h-[10px] transition-transform hidden sm:block ${menuOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {menuOpen && (
                                    <div className="absolute right-0 mt-2 w-[200px] bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden z-50 backdrop-blur-xl">
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
                        ) : (
                            <Link href="/auth" className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[14px] font-semibold px-6 py-2 rounded-lg transition-colors">Sign In</Link>
                        )}
                    </div>
                </div>
            </header>

            {/* ── MAIN CONTENT ── */}
            <main className="max-w-[1200px] mx-auto px-6 lg:px-12 py-10">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <h2 className="text-[24px] font-bold text-[var(--text-primary)] mb-2">OS Not Found</h2>
                        <p className="text-[14px] text-[var(--text-muted)] mb-6">{error}</p>
                        <Link href="/registry" className="text-[var(--accent)] hover:underline text-[14px] font-medium flex items-center gap-2 justify-center">
                            <FontAwesomeIcon icon={faArrowLeft} className="w-3 h-3" /> Back to Registry
                        </Link>
                    </div>
                ) : pkg ? (
                    <>
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)] mb-6">
                            <Link href="/registry" className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5">
                                <FontAwesomeIcon icon={faBoxOpen} className="w-3 h-3" /> Registry
                            </Link>
                            <span className="text-[var(--text-dimmed)]">&gt;</span>
                            <span className="text-[var(--text-primary)] font-medium">{pkg.name}</span>
                        </div>

                        {/* Title Section */}
                        <div className="flex flex-col lg:flex-row gap-8 mb-8">
                            <div className="flex-1">
                                <div className="flex items-center gap-4 mb-2">
                                    {/* OS icon */}
                                    <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                                        <FontAwesomeIcon icon={getIcon(editing ? editIcon : pkg.icon)} className="w-6 h-6" style={{ color: (editing ? editIconColor : pkg.iconColor) || 'var(--accent)' }} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h1 className="text-[28px] lg:text-[32px] font-bold text-[var(--text-primary)] tracking-tight">
                                                {pkg.name}
                                            </h1>
                                            <span className="px-2.5 py-1 bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] text-[11px] font-bold rounded-full">
                                                v{pkg.latestVersion}
                                            </span>
                                            {pkg.official && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[10px] font-bold tracking-widest rounded-full">
                                                    <FontAwesomeIcon icon={faCheckCircle} className="w-[10px] h-[10px]" />
                                                    OFFICIAL
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {editing ? (
                                    <textarea
                                        value={editDescription}
                                        onChange={e => setEditDescription(e.target.value)}
                                        className="w-full max-w-[600px] mt-3 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                                        rows={3}
                                        placeholder="OS description..."
                                    />
                                ) : (
                                    <p className="text-[14px] text-[var(--text-muted)] max-w-[600px] mt-1 ml-16">
                                        {pkg.description || "A custom Linux distribution configuration."}
                                    </p>
                                )}
                            </div>

                            {/* Edit / Save / Cancel */}
                            {isOwner && !editing && (
                                <button
                                    onClick={startEditing}
                                    className="self-start flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-secondary)] hover:border-[var(--accent)]/50 rounded-xl text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    <FontAwesomeIcon icon={faPen} className="w-3 h-3" />                                 </button>

                            )}
                            {editing && (
                                <div className="self-start flex items-center gap-2">
                                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-50">
                                        {saving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FontAwesomeIcon icon={faSave} className="w-3 h-3" />}
                                        Save
                                    </button>
                                    <button onClick={cancelEditing} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-xl text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                                        <FontAwesomeIcon icon={faXmark} className="w-3 h-3" /> Cancel
                                    </button>
                                </div>
                            )}
                        </div>

                        {saveError && (
                            <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-[13px] text-red-400">{saveError}</div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
                            {/* Left Column */}
                            <div>
                                {/* Pull command */}
                                <div className="mb-6">
                                    <button onClick={handleCopyCommand} className="w-full flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-xl px-5 py-3.5 hover:border-[var(--accent)]/50 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[var(--accent)] font-semibold text-[13px]">$</span>
                                            <code className="text-[13px] text-[var(--text-primary)] font-mono">distrorun pull {pkg.name}</code>
                                        </div>
                                        <FontAwesomeIcon icon={faCopy} className={`w-3.5 h-3.5 transition-colors ${copied ? 'text-emerald-500' : 'text-[var(--text-dimmed)] group-hover:text-[var(--text-primary)]'}`} />
                                    </button>
                                </div>

                                {/* YAML Content */}
                                <div className="bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-xl overflow-hidden">
                                    <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-secondary)]">
                                        <div className="flex items-center gap-2">
                                            <FontAwesomeIcon icon={faFileCode} className="w-3.5 h-3.5 text-[var(--accent)]" />
                                            <span className="text-[13px] font-semibold text-[var(--text-primary)]">{pkg.name}.distrorun.yaml</span>
                                        </div>
                                        <span className="text-[11px] text-[var(--text-dimmed)]">
                                            {editing ? formatBytes(editYaml) : pkg.version?.yamlContent ? formatBytes(pkg.version.yamlContent) : "—"}
                                        </span>
                                    </div>
                                    {editing ? (
                                        <textarea
                                            value={editYaml}
                                            onChange={e => setEditYaml(e.target.value)}
                                            className="w-full min-h-[400px] bg-transparent p-5 font-mono text-[12px] text-[var(--text-primary)] focus:outline-none resize-y leading-[1.7]"
                                            spellCheck={false}
                                        />
                                    ) : (
                                        <div className="p-5 font-mono text-[12px] overflow-x-auto">
                                            {pkg.version?.yamlContent ? renderYaml(pkg.version.yamlContent) : (
                                                <span className="text-[var(--text-dimmed)]">No YAML content available</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">
                                {/* Icon picker (edit mode) */}
                                {editing && (
                                    <div className="bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-xl p-5 space-y-4" ref={iconPickerRef}>
                                        <h3 className="text-[13px] font-bold text-[var(--text-primary)]">OS Icon</h3>
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                                                <FontAwesomeIcon icon={getIcon(editIcon)} className="w-6 h-6" style={{ color: editIconColor || 'var(--accent)' }} />
                                            </div>
                                            <div>
                                                <button
                                                    onClick={() => setIconPickerOpen(!iconPickerOpen)}
                                                    className="text-[12px] font-medium text-[var(--accent)] hover:underline"
                                                >
                                                    {iconPickerOpen ? "Close picker" : "Change icon"}
                                                </button>
                                                <p className="text-[10px] text-[var(--text-dimmed)] mt-1">{editIcon || "terminal"}</p>
                                            </div>
                                        </div>

                                        {/* Color picker */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-[var(--text-muted)] tracking-wider uppercase">Color</label>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {[
                                                    "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
                                                    "#ec4899", "#ef4444", "#f97316", "#f59e0b",
                                                    "#eab308", "#22c55e", "#10b981", "#14b8a6",
                                                    "#06b6d4", "#0ea5e9", "#64748b", "#ffffff",
                                                ].map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => setEditIconColor(color)}
                                                        className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${editIconColor === color ? 'ring-2 ring-offset-2 ring-[var(--text-primary)] ring-offset-[var(--bg-card)]' : ''}`}
                                                        style={{ backgroundColor: color }}
                                                        title={color}
                                                    />
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <input
                                                    type="color"
                                                    value={editIconColor || "#3b82f6"}
                                                    onChange={e => setEditIconColor(e.target.value)}
                                                    className="w-8 h-8 rounded-lg border border-[var(--border-secondary)] cursor-pointer bg-transparent"
                                                />
                                                <input
                                                    type="text"
                                                    value={editIconColor || ""}
                                                    onChange={e => setEditIconColor(e.target.value)}
                                                    placeholder="#3b82f6"
                                                    className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] transition-colors font-mono"
                                                />
                                            </div>
                                        </div>

                                        {iconPickerOpen && (
                                            <div className="space-y-3">
                                                <input
                                                    value={iconSearch}
                                                    onChange={e => setIconSearch(e.target.value)}
                                                    placeholder="Search icons..."
                                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg px-3 py-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                                                />
                                                <div className="grid grid-cols-6 gap-1.5 max-h-[200px] overflow-y-auto">
                                                    {filteredIcons.map(name => (
                                                        <button
                                                            key={name}
                                                            onClick={() => { setEditIcon(name); setIconPickerOpen(false); setIconSearch(""); }}
                                                            className={`w-full aspect-square rounded-lg flex items-center justify-center transition-colors ${editIcon === name ? 'text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]/80'}`}
                                                            style={editIcon === name ? { backgroundColor: editIconColor || 'var(--accent)' } : undefined}
                                                            title={name}
                                                        >
                                                            <FontAwesomeIcon icon={ICON_MAP[name]} className="w-4 h-4" />
                                                        </button>
                                                    ))}
                                                    {filteredIcons.length === 0 && (
                                                        <p className="col-span-6 text-center text-[11px] text-[var(--text-dimmed)] py-4">No icons found</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tags editor (edit mode) */}
                                {editing && (
                                    <div className="bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-xl p-5 space-y-4">
                                        <h3 className="text-[13px] font-bold text-[var(--text-primary)]">Tags</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {editTags.map(tag => (
                                                <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--accent)] text-[11px] font-medium rounded-md">
                                                    {tag}
                                                    <button onClick={() => handleRemoveTag(tag)} className="text-[var(--text-dimmed)] hover:text-red-400 transition-colors">
                                                        <FontAwesomeIcon icon={faXmark} className="w-2 h-2" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                value={editTagInput}
                                                onChange={e => setEditTagInput(e.target.value)}
                                                onKeyDown={handleTagKeyDown}
                                                placeholder="Add a tag..."
                                                className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg px-3 py-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                                            />
                                            <button onClick={handleAddTag} className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center hover:bg-[var(--accent-hover)] transition-colors">
                                                <FontAwesomeIcon icon={faPlus} className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Build Information Card */}
                                <div className="bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-xl p-5 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[15px] font-bold text-[var(--text-primary)]">Build Information</h3>
                                        <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <p className="text-[12px] text-[var(--text-muted)]">Verified secure build pipeline.</p>

                                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg px-4 py-3 flex items-center justify-between">
                                        <span className="text-[13px] text-[var(--text-muted)]">SBOM Status</span>
                                        {pkg.version?.sbomEnabled ? (
                                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-500">
                                                <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3" /> Verified
                                            </span>
                                        ) : (
                                            <span className="text-[11px] font-bold text-[var(--text-dimmed)]">Not Available</span>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {[
                                            ["Version", String(pkg.latestVersion)],
                                            ["Last Updated", timeAgo(pkg.updatedAt)],
                                            ["Downloads", pkg.downloads.toLocaleString()],
                                            ["Base", pkg.version?.baseDistro || "alpine"],
                                            ["License", "MIT"],
                                        ].map(([label, value]) => (
                                            <div key={label} className="flex items-center justify-between text-[13px]">
                                                <span className="text-[var(--text-muted)]">{label}</span>
                                                <span className="font-semibold text-[var(--text-primary)] capitalize">{value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-secondary)]">
                                        <span className="text-[13px] text-[var(--text-muted)]">Maintainer</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[12px] font-bold ${pkg.official ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}>
                                                {pkg.official ? "Distrorun Staff" : (pkg.userName || "DistroRun User")}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Download Buttons */}
                                <div className="space-y-3">
                                    <button onClick={handleDownloadYaml} className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[14px] font-semibold py-3 rounded-xl transition-colors shadow-[0px_4px_20px_rgba(59,130,246,0.3)]">
                                        <FontAwesomeIcon icon={faDownload} className="w-4 h-4" /> Download YAML
                                    </button>
                                    {pkg.version?.sbomContent && (
                                        <button onClick={handleDownloadSbom} className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-[var(--accent)]/10 border border-[var(--border-secondary)] hover:border-[var(--accent)]/50 text-[var(--accent)] text-[14px] font-semibold py-3 rounded-xl transition-colors">
                                            <FontAwesomeIcon icon={faShieldAlt} className="w-4 h-4" /> Download SBOM
                                        </button>
                                    )}
                                </div>

                                {/* Version History */}
                                <button onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[13px] font-semibold py-3 rounded-xl transition-colors">
                                    <FontAwesomeIcon icon={faHistory} className="w-3.5 h-3.5" /> View History
                                </button>

                                {showHistory && pkg.history.length > 0 && (
                                    <div className="bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-xl overflow-hidden">
                                        <div className="px-4 py-3 border-b border-[var(--border-secondary)]">
                                            <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">Version History</h4>
                                        </div>
                                        <div className="divide-y divide-[var(--border-secondary)]">
                                            {pkg.history.map((v) => (
                                                <div key={v.version} className={`px-4 py-3 flex items-center justify-between ${pkg.version?.number === v.version ? 'bg-[var(--bg-secondary)]' : 'hover:bg-[var(--bg-secondary)]/50 transition-colors'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <Link href={`/registry/${packageName}?version=${v.version}`} className={`text-[12px] font-bold hover:underline ${pkg.version?.number === v.version ? 'text-[var(--text-primary)]' : 'text-[var(--accent)]'}`}>v{v.version}</Link>
                                                        <span className="text-[11px] text-[var(--text-dimmed)]">{timeAgo(v.created_at)}</span>
                                                    </div>
                                                    {v.sbom_enabled && (
                                                        <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                                                            <FontAwesomeIcon icon={faShieldAlt} className="w-2.5 h-2.5" /> SBOM
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Dependencies/Tags (view mode) */}
                                {!editing && pkg.tags.length > 0 && (
                                    <div className="bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-xl p-5 space-y-3">
                                        <h3 className="text-[11px] font-bold text-[var(--text-dimmed)] tracking-wider uppercase">Dependencies</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {pkg.tags.map(tag => (
                                                <span key={tag} className="px-2.5 py-1 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--accent)] text-[11px] font-medium rounded-md">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Delete button (owner only) */}
                                {isOwner && !editing && (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-red-500/10 border border-red-500/30 text-red-400 hover:text-red-300 text-[13px] font-semibold py-3 rounded-xl transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" /> Delete OS
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                ) : null}
            </main>

            {/* Delete confirmation modal */}
            {showDeleteConfirm && pkg && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="w-full max-w-[420px] bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-2xl p-6 shadow-2xl">
                        <h3 className="text-[18px] font-bold text-[var(--text-primary)] mb-2">Delete OS</h3>
                        <p className="text-[13px] text-[var(--text-muted)] mb-4">
                            This will permanently delete <span className="font-bold text-[var(--text-primary)]">{pkg.name}</span> and all its versions. This action cannot be undone.
                        </p>
                        <label className="text-[12px] font-medium text-[var(--text-muted)] mb-2 block">
                            Type <span className="font-bold text-[var(--text-primary)]">{pkg.name}</span> to confirm
                        </label>
                        <input
                            value={deleteInput}
                            onChange={e => setDeleteInput(e.target.value)}
                            placeholder={pkg.name}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-red-500 transition-colors mb-4 font-mono"
                        />
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleDelete}
                                disabled={deleteInput !== pkg.name || deleting}
                                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {deleting ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />}
                                Delete
                            </button>
                            <button
                                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                                className="flex-1 flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[13px] font-semibold py-2.5 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── FOOTER ── */}
            <footer className="border-t border-[var(--border-secondary)] mt-20">
                <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-6 flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[var(--text-primary)]">Distrorun</span>
                    <span className="text-[10px] text-[var(--text-dimmed)]">&copy; 2026 Distrorun, Under the Apache2.0 licence</span>
                </div>
            </footer>
        </div>
    );
}
