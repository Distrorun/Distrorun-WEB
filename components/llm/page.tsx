"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSun,
    faMoon,
    faArrowLeft,
    faPaperPlane,
    faUser,
    faCopy,
    faCheck,
    faDownload,
    faChevronDown,
    faGear,
    faRightFromBracket,
    faCircleExclamation,
    faTrash,
    faPlus,
    faTerminal,
    faBars,
    faXmark,
    faComment,
} from "@fortawesome/free-solid-svg-icons";

// --- Types ---
interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    yaml?: string;
    valid?: boolean;
    errors?: string[];
    loading?: boolean;
    timestamp: number;
}

interface Conversation {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

// --- Spinner ---
const Spinner = ({ className = "h-4 w-4" }: { className?: string }) => (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
);

// --- YAML syntax highlighter (simple) ---
function highlightYaml(yaml: string): string {
    return yaml
        .split("\n")
        .map((line) => {
            if (line.trim().startsWith("#")) {
                return `<span class="text-[var(--text-dimmed)]">${escapeHtml(line)}</span>`;
            }
            const match = line.match(/^(\s*)([\w-]+)(\s*:\s*)(.*)/);
            if (match) {
                const [, indent, key, colon, value] = match;
                let valueHtml = escapeHtml(value);
                if (/^(true|false)$/i.test(value.trim())) {
                    valueHtml = `<span class="text-pink-400">${escapeHtml(value)}</span>`;
                } else if (/^["'].*["']$/.test(value.trim())) {
                    valueHtml = `<span class="text-green-400">${escapeHtml(value)}</span>`;
                } else if (/^\d+(\.\d+)?$/.test(value.trim())) {
                    valueHtml = `<span class="text-orange-400">${escapeHtml(value)}</span>`;
                }
                return `${escapeHtml(indent)}<span class="text-blue-400">${escapeHtml(key)}</span><span class="text-[var(--text-dimmed)]">${escapeHtml(colon)}</span>${valueHtml}`;
            }
            const listMatch = line.match(/^(\s*)(- )(.*)/);
            if (listMatch) {
                const [, indent, dash, value] = listMatch;
                return `${escapeHtml(indent)}<span class="text-[var(--accent)]">${escapeHtml(dash)}</span><span class="text-green-400">${escapeHtml(value)}</span>`;
            }
            return escapeHtml(line);
        })
        .join("\n");
}

function escapeHtml(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- Suggestions ---
const SUGGESTIONS = [
    "Alpine server with nginx, curl, and two users",
    "Fedora workstation with GNOME and Firefox",
    "Minimal Alpine with just SSH and a root user",
    "Fedora server with PostgreSQL and Redis",
];

export default function LLMPage() {
    const { data: session, isPending } = useSession();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme, systemTheme } = useTheme();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Chat state
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Conversation state
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
    const [loadingConvs, setLoadingConvs] = useState(true);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const currentTheme = theme === "system" ? systemTheme : theme;
    const isDark = currentTheme === "dark";
    const toggleTheme = () => setTheme(isDark ? "light" : "dark");

    const handleLogout = async () => {
        await signOut();
        router.push("/auth");
    };

    // Load conversations on mount
    useEffect(() => {
        if (!session) return;
        fetchConversations();
    }, [session]);

    const fetchConversations = async () => {
        try {
            const res = await fetch("/api/conversations");
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch { /* ignore */ }
        setLoadingConvs(false);
    };

    // Load messages when switching conversations
    const loadConversation = async (convId: string) => {
        setActiveConvId(convId);
        setMessages([]);
        setSidebarOpen(false);

        try {
            const res = await fetch(`/api/conversations/${convId}/messages`);
            if (res.ok) {
                const data = await res.json();
                const msgs: Message[] = data.map((m: any) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    yaml: m.yaml || undefined,
                    valid: m.valid ?? undefined,
                    errors: m.errors || undefined,
                    timestamp: new Date(m.created_at).getTime(),
                }));
                setMessages(msgs);
            }
        } catch { /* ignore */ }
    };

    // Save a message to the DB
    const saveMessage = async (convId: string, msg: { role: string; content: string; yaml?: string; valid?: boolean; errors?: string[] }) => {
        try {
            await fetch(`/api/conversations/${convId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(msg),
            });
        } catch { /* ignore */ }
    };

    // Create a new conversation
    const createConversation = async (title?: string): Promise<string | null> => {
        try {
            const res = await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: title || "New Chat" }),
            });
            if (res.ok) {
                const conv = await res.json();
                setConversations(prev => [conv, ...prev]);
                setActiveConvId(conv.id);
                return conv.id;
            }
        } catch { /* ignore */ }
        return null;
    };

    // Delete a conversation
    const deleteConversation = async (convId: string) => {
        try {
            await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
            setConversations(prev => prev.filter(c => c.id !== convId));
            if (activeConvId === convId) {
                setActiveConvId(null);
                setMessages([]);
            }
        } catch { /* ignore */ }
    };

    // Start a new chat
    const handleNewChat = () => {
        setActiveConvId(null);
        setMessages([]);
        setSidebarOpen(false);
    };

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
    };

    const handleSend = useCallback(async (promptOverride?: string) => {
        const prompt = promptOverride || input.trim();
        if (!prompt || sending) return;

        setInput("");
        if (inputRef.current) inputRef.current.style.height = "auto";

        // Create conversation if none active
        let convId = activeConvId;
        if (!convId) {
            convId = await createConversation(prompt.length > 60 ? prompt.substring(0, 60) + "..." : prompt);
            if (!convId) return;
        }

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: prompt,
            timestamp: Date.now(),
        };

        const assistantMsg: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "",
            loading: true,
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMsg, assistantMsg]);
        setSending(true);

        // Save user message to DB
        await saveMessage(convId, { role: "user", content: prompt });

        try {
            const history = messages.map(m => ({
                role: m.role,
                content: m.role === "assistant" && m.yaml ? m.yaml : m.content,
            }));

            const res = await fetch("/api/rag/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, history }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ error: "Unknown error" }));
                const errorContent = errData.error || "Failed to generate.";
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantMsg.id
                            ? { ...m, content: errorContent, loading: false }
                            : m
                    )
                );
                await saveMessage(convId, { role: "assistant", content: errorContent });
                setSending(false);
                return;
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = "";
            let buffer = "";
            let finalResult: { yaml?: string; valid?: boolean; errors?: string[]; content?: string } | null = null;

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";

                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const data = line.slice(6);
                            if (data === "[DONE]") continue;

                            try {
                                const parsed = JSON.parse(data);

                                if (parsed.type === "token") {
                                    fullContent += parsed.content;
                                } else if (parsed.type === "result") {
                                    finalResult = {
                                        content: parsed.yaml ? "Here's the generated configuration:" : fullContent,
                                        yaml: parsed.yaml || undefined,
                                        valid: parsed.valid,
                                        errors: parsed.errors,
                                    };
                                    setMessages(prev =>
                                        prev.map(m =>
                                            m.id === assistantMsg.id
                                                ? { ...m, ...finalResult, loading: false }
                                                : m
                                        )
                                    );
                                } else if (parsed.type === "error") {
                                    finalResult = { content: parsed.content || "An error occurred." };
                                    setMessages(prev =>
                                        prev.map(m =>
                                            m.id === assistantMsg.id
                                                ? { ...m, content: finalResult!.content!, loading: false }
                                                : m
                                        )
                                    );
                                }
                            } catch { /* ignore */ }
                        }
                    }
                }
            }

            // Finalize if stream ended without result
            if (!finalResult) {
                finalResult = { content: fullContent || "No response received." };
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantMsg.id && m.loading
                            ? { ...m, loading: false, content: finalResult!.content! }
                            : m
                    )
                );
            }

            // Save assistant message to DB
            await saveMessage(convId, {
                role: "assistant",
                content: finalResult.content || "",
                yaml: finalResult.yaml,
                valid: finalResult.valid,
                errors: finalResult.errors,
            });

            // Refresh conversations list to update titles/timestamps
            fetchConversations();

        } catch (e: any) {
            const errorContent = `Connection error: ${e.message}. Make sure the RAG server is running.`;
            setMessages(prev =>
                prev.map(m =>
                    m.id === assistantMsg.id
                        ? { ...m, content: errorContent, loading: false }
                        : m
                )
            );
            await saveMessage(convId, { role: "assistant", content: errorContent });
        }
        setSending(false);
    }, [input, sending, messages, activeConvId]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleCopy = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDownload = (yaml: string) => {
        const blob = new Blob([yaml + "\n"], { type: "text/yaml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "distrorun-config.yaml";
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!mounted) return null;

    return (
        <div
            className="h-screen flex bg-[var(--bg-primary)] text-[var(--text-primary)] font-['Space_Grotesk',sans-serif] transition-colors duration-300"
            style={{
                backgroundImage: "linear-gradient(90deg, var(--grid-line) 2.5%, transparent 2.5%), linear-gradient(180deg, var(--grid-line) 2.5%, transparent 2.5%)",
                backgroundSize: "40px 40px",
            }}
        >
            {/* Sidebar backdrop (mobile) */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Conversations Sidebar */}
            <aside className={`fixed lg:relative z-50 lg:z-auto h-full bg-[var(--bg-card)] border-r border-[var(--border-secondary)] flex flex-col transition-all duration-300 overflow-hidden ${
                sidebarOpen ? "translate-x-0 w-[280px]" : "-translate-x-full w-[280px] lg:translate-x-0"
            } ${
                desktopSidebarOpen ? "lg:w-[280px] lg:min-w-[280px]" : "lg:w-0 lg:min-w-0 lg:border-r-0"
            }`}>
                <div className="w-[280px] flex-shrink-0 flex flex-col h-full">
                    <div className="flex items-center justify-between px-4 h-[56px] border-b border-[var(--border-secondary)] flex-shrink-0">
                        <span className="font-bold text-[14px] text-[var(--text-primary)]">Conversations</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleNewChat}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                            title="New Chat"
                        >
                            <FontAwesomeIcon icon={faPlus} className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => {
                                setSidebarOpen(false);
                                setDesktopSidebarOpen(false);
                            }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                            title="Hide Sidebar"
                        >
                            <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    {loadingConvs ? (
                        <div className="flex items-center justify-center py-8">
                            <Spinner className="h-4 w-4 text-[var(--text-dimmed)]" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <p className="text-[12px] text-[var(--text-dimmed)]">No conversations yet</p>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <div
                                key={conv.id}
                                className={`group flex items-center gap-2 mx-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${activeConvId === conv.id ? "bg-[var(--accent)]/10 text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"}`}
                                onClick={() => loadConversation(conv.id)}
                            >
                                <FontAwesomeIcon icon={faComment} className="w-3 h-3 flex-shrink-0 opacity-50" />
                                <span className="flex-1 text-[13px] truncate">{conv.title || "New Chat"}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                                    className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-[var(--text-dimmed)] hover:text-red-400 transition-all"
                                    title="Delete"
                                >
                                    <FontAwesomeIcon icon={faTrash} className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="flex-shrink-0 sticky top-0 z-30 w-full h-[56px] bg-[var(--bg-header)] backdrop-blur-md border-b border-[var(--border-secondary)] flex items-center px-4 md:px-6 transition-colors duration-300">
                    <div className="flex items-center gap-4 w-full">
                        <button
                            onClick={() => {
                                setSidebarOpen(true);
                                setDesktopSidebarOpen(true);
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors ${desktopSidebarOpen ? 'lg:hidden' : ''}`}
                            title="Show Sidebar"
                        >
                            <FontAwesomeIcon icon={faBars} className="w-4 h-4" />
                        </button>
                        <Link href="/registry" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                            <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
                        </Link>
                        <div className="flex items-center gap-2.5">
                            <span className="font-bold text-[16px] tracking-tight">DistroRun LLM</span>
                            <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2 py-0.5 rounded-full hidden sm:inline-block">BETA</span>
                        </div>

                        <div className="ml-auto flex items-center gap-3">
                            {messages.length > 0 && (
                                <button
                                    onClick={handleNewChat}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-accent)] transition-colors"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="w-[10px] h-[10px]" />
                                    <span className="hidden sm:inline">New Chat</span>
                                </button>
                            )}
                            <button onClick={toggleTheme} className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label="Toggle theme">
                                <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="w-[13px] h-[13px]" />
                            </button>

                            {session && (
                                <div className="relative" ref={menuRef}>
                                    <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                                        {session.user.image ? (
                                            <img src={session.user.image} alt="" className="w-7 h-7 rounded-full border border-[var(--border-secondary)]" />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--accent)] font-bold text-[12px]">
                                                {session.user.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
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
                            )}
                        </div>
                    </div>
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-[800px] mx-auto px-4 md:px-6 py-6">

                        {/* Empty state */}
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                                <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center mb-6">
                                    <img src="/assets/favicon.png" alt="DistroRun" className="w-10 h-10" />
                                </div>
                                <h1 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] tracking-tight mb-2">
                                    DistroRun LLM
                                </h1>
                                <p className="text-[14px] text-[var(--text-muted)] max-w-[440px] mb-8">
                                    Describe the Linux OS you want to build and I'll generate a valid DistroRun YAML configuration for you.
                                </p>

                                {/* Suggestion chips */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-[520px]">
                                    {SUGGESTIONS.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSend(s)}
                                            className="text-left p-4 bg-[var(--bg-card)] border border-[var(--border-secondary)] hover:border-[var(--border-accent)] rounded-xl text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all hover:shadow-[var(--shadow-card)] group"
                                        >
                                            <div className="flex items-start gap-3">
                                                <FontAwesomeIcon icon={faTerminal} className="w-3.5 h-3.5 text-[var(--accent)] mt-0.5 flex-shrink-0" />
                                                <span>{s}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Message list */}
                        {messages.map((msg) => (
                            <div key={msg.id} className={`mb-6 ${msg.role === "user" ? "flex justify-end" : ""}`}>
                                {msg.role === "user" ? (
                                    <div className="max-w-[85%] sm:max-w-[70%]">
                                        <div className="bg-[var(--accent)] text-white px-4 py-3 rounded-2xl rounded-br-md text-[14px] leading-relaxed">
                                            {msg.content}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="max-w-full">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                                <img src="/assets/favicon.png" alt="DistroRun" className="w-7 h-7" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {msg.loading && !msg.content && !msg.yaml && (
                                                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-[13px] py-2">
                                                        <Spinner className="h-3.5 w-3.5" />
                                                        Generating configuration, might take a few minutes...
                                                    </div>
                                                )}

                                                {msg.content && !msg.yaml && (
                                                    <div className="text-[14px] text-[var(--text-primary)] leading-relaxed py-1">
                                                        {msg.content}
                                                        {msg.loading && <span className="inline-block w-1.5 h-4 bg-[var(--accent)] ml-0.5 animate-pulse rounded-sm align-middle" />}
                                                    </div>
                                                )}

                                                {msg.content && msg.yaml && (
                                                    <p className="text-[14px] text-[var(--text-primary)] mb-3">{msg.content}</p>
                                                )}

                                                {msg.yaml && (
                                                    <div className="bg-[var(--code-bg)] rounded-xl overflow-hidden">
                                                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-secondary)]/30 bg-[var(--bg-secondary)]/50">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[11px] font-bold text-[var(--text-dimmed)] uppercase tracking-wider">distrorun.yaml</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    onClick={() => handleCopy(msg.yaml!, msg.id)}
                                                                    className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-dimmed)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                                                                    title="Copy YAML"
                                                                >
                                                                    <FontAwesomeIcon icon={copiedId === msg.id ? faCheck : faCopy} className={`w-3 h-3 ${copiedId === msg.id ? "text-green-400" : ""}`} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDownload(msg.yaml!)}
                                                                    className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-dimmed)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                                                                    title="Download YAML"
                                                                >
                                                                    <FontAwesomeIcon icon={faDownload} className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <pre className="p-4 overflow-x-auto text-[13px] leading-[1.6] font-['JetBrains_Mono',monospace]">
                                                            <code dangerouslySetInnerHTML={{ __html: highlightYaml(msg.yaml) }} />
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="flex-shrink-0 border-t border-[var(--border-secondary)] bg-[var(--bg-header)] backdrop-blur-md">
                    <div className="max-w-[800px] mx-auto px-4 md:px-6 py-4">
                        <div className="relative flex items-end gap-3">
                            <div className="flex-1 relative">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Describe the Linux OS you want to build..."
                                    rows={1}
                                    className="w-full min-h-[44px] max-h-[160px] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl px-4 py-3 pr-12 text-[14px] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none leading-[1.5]"
                                />
                            </div>
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || sending}
                                className="flex-shrink-0 w-[44px] h-[44px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {sending ? (
                                    <Spinner className="h-4 w-4" />
                                ) : (
                                    <FontAwesomeIcon icon={faPaperPlane} className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        <p className="text-[10px] text-[var(--text-dimmed)] mt-2 text-center">
                            Powered by Ollama. Generates DistroRun YAML configs validated against the official schema.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
