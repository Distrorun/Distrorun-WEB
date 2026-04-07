"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faSlidersH,
  faChevronDown,
  faDownload,
  faList,
  faChevronLeft,
  faChevronRight,
  faCube,
  faDatabase,
  faBrain,
  faTerminal,
  faCheckCircle,
  faUsers,
  faSun,
  faMoon,
  faThLarge,
  faGear,
  faRightFromBracket,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

// --- Types ---
type StatusType = "OFFICIAL" | "COMMUNITY";

interface RegistryItem {
  id: string;
  title: string;
  description: string;
  status: StatusType;
  downloads: string;
  tags: string[];
  icon: any;
}

// --- Mock Data ---
const MOCK_DATA: RegistryItem[] = [
  {
    id: "1",
    title: "Node OS",
    description: "Minimalist NodeJS Os",
    status: "OFFICIAL",
    downloads: "2.4M",
    tags: ["Alpine Based", "Node.js", "Web"],
    icon: faCube,
  },
  {
    id: "2",
    title: "Databases",
    description: "OS with all of the popular databases",
    status: "COMMUNITY",
    downloads: "892k",
    tags: ["Fedora Based", "Database", "Workstation"],
    icon: faDatabase,
  },
  {
    id: "3",
    title: "ML-Workstation",
    description: "Deep learning environment with PyTorch, CUDA 12.1 drivers, and JupyterLab ready to...",
    status: "OFFICIAL",
    downloads: "156k",
    tags: ["Fedora Based", "ML/AI", "Python"],
    icon: faBrain,
  },
  {
    id: "4",
    title: "Dev Toolkit OS",
    description: "Coding OS",
    status: "COMMUNITY",
    downloads: "54k",
    tags: ["Fedora Based", "DevTools", "CLI"],
    icon: faTerminal,
  },
];

export default function RegistryPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, systemTheme } = useTheme();

  // Filters State
  const [baseDistro, setBaseDistro] = useState({ alpine: false, fedora: false });
  const [categories, setCategories] = useState({ webServers: false, databases: false, ml: false, devTools: false });
  const [statusFilter, setStatusFilter] = useState({ official: false, community: false, experimental: false });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };

  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  // Avoid hydration mismatch
  if (!mounted) return null;

  // --- Filter sidebar content (shared between desktop sidebar & mobile drawer) ---
  const filterContent = (
    <div className="space-y-8">
      {/* Filters Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold text-[16px]">
          <FontAwesomeIcon icon={faSlidersH} className="text-[var(--accent)] w-[14px] h-[14px]" />
          Filters
        </div>
        <button className="text-[12px] font-medium text-[var(--accent)] hover:opacity-80 transition-colors">
          RESET
        </button>
      </div>

      {/* Keyword Search */}
      <div className="space-y-3">
        <label className="text-[11px] font-bold text-[var(--text-muted)] tracking-wider uppercase">Keyword</label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dimmed)]">
            <FontAwesomeIcon icon={faSlidersH} className="w-3 h-3" />
          </div>
          <input
            type="text"
            placeholder="Filter by keyword..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full h-10 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg pl-9 pr-3 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
      </div>

      {/* Base Distro Filter */}
      <div className="space-y-4">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <span className="text-[var(--accent)]">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </span>
          Base Distro
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-[4px] border border-[var(--border-secondary)] flex items-center justify-center transition-colors ${baseDistro.alpine ? 'bg-[var(--accent)] border-[var(--accent)]' : 'bg-[var(--bg-secondary)] group-hover:border-[var(--text-dimmed)]'}`}>
                {baseDistro.alpine && <FontAwesomeIcon icon={faCheckCircle} className="w-[10px] h-[10px] text-white" />}
              </div>
              <span className="text-[13px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">Alpine Based</span>
            </div>
            <span className="text-[10px] font-medium bg-[var(--bg-secondary)] text-[var(--text-muted)] px-2 py-0.5 rounded-md">128</span>
            <input type="checkbox" className="hidden" checked={baseDistro.alpine} onChange={(e) => setBaseDistro({ ...baseDistro, alpine: e.target.checked })} />
          </label>
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-[4px] border border-[var(--border-secondary)] flex items-center justify-center transition-colors ${baseDistro.fedora ? 'bg-[var(--accent)] border-[var(--accent)]' : 'bg-[var(--bg-secondary)] group-hover:border-[var(--text-dimmed)]'}`}>
                {baseDistro.fedora && <FontAwesomeIcon icon={faCheckCircle} className="w-[10px] h-[10px] text-white" />}
              </div>
              <span className="text-[13px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">Fedora Based</span>
            </div>
            <span className="text-[10px] font-medium bg-[var(--bg-secondary)] text-[var(--text-muted)] px-2 py-0.5 rounded-md">56</span>
            <input type="checkbox" className="hidden" checked={baseDistro.fedora} onChange={(e) => setBaseDistro({ ...baseDistro, fedora: e.target.checked })} />
          </label>
        </div>
      </div>

      <div className="h-[1px] bg-[var(--border-secondary)] w-full" />

      {/* Categories */}
      <div className="space-y-4">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <span className="text-[var(--accent)]">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </span>
          Categories
        </h3>
        <div className="space-y-3">
          {[
            { key: "webServers" as const, label: "Web Servers" },
            { key: "databases" as const, label: "Databases" },
            { key: "ml" as const, label: "Machine Learning" },
            { key: "devTools" as const, label: "Dev Tools" },
          ].map(cat => (
            <label key={cat.key} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-4 h-4 rounded-[4px] border border-[var(--border-secondary)] flex items-center justify-center transition-colors ${categories[cat.key] ? 'bg-[var(--accent)] border-[var(--accent)]' : 'bg-[var(--bg-secondary)] group-hover:border-[var(--text-dimmed)]'}`}>
                {categories[cat.key] && <FontAwesomeIcon icon={faCheckCircle} className="w-[10px] h-[10px] text-white" />}
              </div>
              <span className="text-[13px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">{cat.label}</span>
              <input type="checkbox" className="hidden" checked={categories[cat.key]} onChange={(e) => setCategories({ ...categories, [cat.key]: e.target.checked })} />
            </label>
          ))}
        </div>
      </div>

      <div className="h-[1px] bg-[var(--border-secondary)] w-full" />

      {/* Status */}
      <div className="space-y-4">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <span className="text-[var(--accent)]">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          Status
        </h3>
        <div className="space-y-3">
          {[
            { key: "official" as const, label: "Official" },
            { key: "community" as const, label: "Community Verified" },
            { key: "experimental" as const, label: "Experimental" },
          ].map(s => (
            <label key={s.key} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-4 h-4 rounded-[4px] border border-[var(--border-secondary)] flex items-center justify-center transition-colors ${statusFilter[s.key] ? 'bg-[var(--accent)] border-[var(--accent)]' : 'bg-[var(--bg-secondary)] group-hover:border-[var(--text-dimmed)]'}`}>
                {statusFilter[s.key] && <FontAwesomeIcon icon={faCheckCircle} className="w-[10px] h-[10px] text-white" />}
              </div>
              <span className="text-[13px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">{s.label}</span>
              <input type="checkbox" className="hidden" checked={statusFilter[s.key]} onChange={(e) => setStatusFilter({ ...statusFilter, [s.key]: e.target.checked })} />
            </label>
          ))}
        </div>
      </div>
    </div>
  );

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
      <header className="sticky top-0 z-50 w-full h-[64px] md:h-[72px] bg-[var(--bg-header)] backdrop-blur-md border-b border-[var(--border-secondary)] flex items-center px-4 md:px-6 lg:px-12 transition-colors duration-300">
        <div className="flex items-center gap-4 md:gap-12 w-full max-w-[1440px] mx-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="font-bold text-[18px] md:text-[20px] tracking-tight">
              Distrorun <span className="text-[var(--accent)] font-medium hidden sm:inline">Registry</span>
            </span>
          </Link>

          {/* Search Bar — hidden on mobile */}
          <div className="relative flex-1 max-w-[400px] hidden md:block">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dimmed)]">
              <FontAwesomeIcon icon={faSearch} className="w-[14px] h-[14px]" />
            </div>
            <input
              type="text"
              placeholder="Search registry..."
              className="w-full h-10 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg pl-10 pr-4 text-[14px] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          {/* Right Nav */}
          <div className="ml-auto flex items-center gap-3 md:gap-6">
            <nav className="hidden md:flex items-center gap-6 text-[14px] font-medium text-[var(--text-muted)]">
              <Link href="/llm" className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5">
                AI Generator
              </Link>
              <Link href="http://localhost:8000" className="hover:text-[var(--text-primary)] transition-colors">
                Docs
              </Link>
            </nav>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setFiltersOpen(true)}
              className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Open filters"
            >
              <FontAwesomeIcon icon={faSlidersH} className="w-[14px] h-[14px]" />
            </button>

            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Toggle theme"
            >
              <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="w-[14px] h-[14px]" />
            </button>

            {isPending ? (
              <div className="w-8 h-8 md:w-[84px] md:h-[36px] bg-[var(--bg-secondary)] animate-pulse rounded-full md:rounded-lg"></div>
            ) : session ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 text-[14px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {session.user.image ? (
                    <img src={session.user.image} alt="" className="w-8 h-8 rounded-full border border-[var(--border-secondary)]" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--accent)]">
                      {session.user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:inline">{session.user.name}</span>
                  <FontAwesomeIcon icon={faChevronDown} className={`w-[10px] h-[10px] transition-transform hidden sm:block ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-[200px] bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden z-50 backdrop-blur-xl">
                    <div className="px-4 py-3 border-b border-[var(--border-secondary)] sm:hidden">
                      <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">{session.user.name}</div>
                      <div className="text-[11px] text-[var(--text-dimmed)] truncate">{session.user.email}</div>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-[13px] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <FontAwesomeIcon icon={faGear} className="w-[14px] h-[14px]" />
                      Settings
                    </Link>
                    <div className="h-[1px] bg-[var(--border-secondary)]" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <FontAwesomeIcon icon={faRightFromBracket} className="w-[14px] h-[14px]" />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth"
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[13px] md:text-[14px] font-semibold px-4 md:px-6 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── MOBILE SEARCH (below header) ── */}
      <div className="md:hidden px-4 pt-4">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dimmed)]">
            <FontAwesomeIcon icon={faSearch} className="w-[14px] h-[14px]" />
          </div>
          <input
            type="text"
            placeholder="Search registry..."
            className="w-full h-10 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg pl-10 pr-4 text-[14px] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
      </div>

      {/* ── MOBILE FILTER DRAWER ── */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
          {/* Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-[300px] max-w-[85vw] bg-[var(--bg-primary)] border-r border-[var(--border-secondary)] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <span className="font-bold text-[16px] text-[var(--text-primary)]">Filters</span>
              <button
                onClick={() => setFiltersOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} className="w-[14px] h-[14px]" />
              </button>
            </div>
            {filterContent}
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-12 py-6 md:py-10 flex gap-10 items-start">
        {/* Sidebar Controls — hidden on mobile/tablet */}
        <aside className="w-[280px] flex-shrink-0 space-y-8 hidden lg:block">
          {filterContent}
        </aside>

        {/* Explore Results */}
        <main className="flex-1 min-w-0 pb-20 relative">

          {/* Title / Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 md:mb-8 relative z-10">
            <div>
              <h1 className="text-[22px] md:text-[28px] font-bold text-[var(--text-primary)] tracking-tight mb-1">Registry Explorer</h1>
              <p className="text-[13px] md:text-[14px] text-[var(--text-muted)]">Discover and Build.</p>
            </div>
            <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] p-1 rounded-lg self-start sm:self-auto">
              <button onClick={() => setViewMode("list")} className={`flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition-colors ${viewMode === 'list' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                <FontAwesomeIcon icon={faList} className={`w-[12px] h-[12px] ${viewMode === 'list' ? 'text-[var(--accent)]' : ''}`} />
                <span className="hidden sm:inline">List View</span>
              </button>
              <button onClick={() => setViewMode("grid")} className={`flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition-colors ${viewMode === 'grid' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                <FontAwesomeIcon icon={faThLarge} className={`w-[12px] h-[12px] ${viewMode === 'grid' ? 'text-[var(--accent)]' : ''}`} />
                <span className="hidden sm:inline">Grid View</span>
              </button>
            </div>
          </div>

          {/* Glowing background blob behind the list */}
          <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-[var(--accent)]/5 rounded-full blur-[100px] pointer-events-none" />

          {/* List */}
          <div className={`relative z-10 ${viewMode === 'list' ? 'space-y-4' : 'grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6'}`}>
            {MOCK_DATA.filter((item) => {
              if (keyword && !item.title.toLowerCase().includes(keyword.toLowerCase()) && !item.description.toLowerCase().includes(keyword.toLowerCase())) return false;
              if (statusFilter.official && item.status !== "OFFICIAL") return false;
              if (statusFilter.community && item.status !== "COMMUNITY") return false;
              if (baseDistro.alpine && !item.tags.includes("Alpine Based")) return false;
              if (baseDistro.fedora && !item.tags.includes("Fedora Based")) return false;
              if (categories.webServers && !item.tags.includes("Web")) return false;
              if (categories.databases && !item.tags.includes("Database")) return false;
              if (categories.ml && !item.tags.includes("ML/AI")) return false;
              if (categories.devTools && !item.tags.includes("DevTools")) return false;
              return true;
            }).map((item) => (
              <div
                key={item.id}
                className={`group flex ${viewMode === 'list' ? 'flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-6' : 'flex-col p-4 md:p-6 items-start justify-between min-h-[240px] md:min-h-[260px]'} bg-[var(--bg-card)] border border-[var(--border-secondary)] hover:border-[var(--border-accent)] rounded-[14px] transition-all duration-300 hover:shadow-[var(--shadow-card)]`}
              >
                {/* Left Content */}
                <div className={`flex items-start ${viewMode === 'list' ? 'sm:items-center gap-4 md:gap-6 w-full sm:w-auto' : 'flex-col gap-4 mb-6 w-full'}`}>
                  {/* Icon Box */}
                  <div className="w-[48px] h-[48px] md:w-[60px] md:h-[60px] flex-shrink-0 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-[10px] md:rounded-[12px] flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                    <FontAwesomeIcon icon={item.icon} className={`w-5 h-5 md:w-7 md:h-7 ${
                      item.title === 'Node OS' ? 'text-blue-500' :
                      item.title === 'Databases' ? 'text-purple-500' :
                      item.title === 'ML-Workstation' ? 'text-orange-500' :
                      'text-emerald-500'
                    }`} />
                  </div>

                  <div className="mt-1 sm:mt-0 w-full min-w-0">
                    <div className={`flex ${viewMode === 'list' ? 'flex-wrap items-center gap-2 md:gap-3 mb-1.5' : 'flex-wrap items-center justify-between gap-3 mb-1.5'}`}>
                      <h3 className="text-[15px] md:text-[16px] font-bold text-[var(--text-primary)]">{item.title}</h3>
                      {item.status === 'OFFICIAL' ? (
                        <div className="flex items-center gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 bg-[var(--passed-bg)] border border-[var(--passed-border)] text-emerald-600 dark:text-emerald-400 text-[9px] md:text-[10px] font-extrabold tracking-widest rounded-full">
                          <FontAwesomeIcon icon={faCheckCircle} className="w-[9px] h-[9px] md:w-[10px] md:h-[10px]" />
                          OFFICIAL
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-dimmed)] text-[9px] md:text-[10px] font-extrabold tracking-widest rounded-full">
                          <FontAwesomeIcon icon={faUsers} className="w-[9px] h-[9px] md:w-[10px] md:h-[10px]" />
                          COMMUNITY
                        </div>
                      )}
                    </div>
                    <p className="text-[12px] md:text-[13px] text-[var(--text-muted)] mb-3 line-clamp-2 pr-0 md:pr-4">{item.description}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                      {item.tags.map(tag => (
                        <span key={tag} className="px-2 md:px-2.5 py-0.5 md:py-1 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] text-[var(--text-muted)] text-[10px] md:text-[11px] rounded-md whitespace-nowrap">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Content */}
                <div className={`flex ${viewMode === 'list' ? 'flex-row sm:flex-col items-center sm:items-end gap-3 mt-4 sm:mt-0 ml-0 sm:ml-4 w-full sm:w-auto justify-between sm:justify-start' : 'flex-row items-center justify-between w-full mt-auto pt-4 border-t border-[var(--border-secondary)]'}`}>
                  <div className={`flex ${viewMode === 'list' ? 'flex-row sm:flex-col items-center sm:items-end gap-1.5 sm:mr-2' : 'flex-row items-center gap-2'}`}>
                    <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-bold text-[13px] md:text-[14px]">
                      <FontAwesomeIcon icon={faDownload} className="w-3 h-3 text-[var(--accent)]" />
                      {item.downloads}
                    </div>
                    <span className="text-[9px] md:text-[10px] text-[var(--text-dimmed)] font-bold uppercase tracking-wider">Downloads</span>
                  </div>
                  <Link
                    href={`/registry/${item.id}`}
                    className="px-4 md:px-6 py-2 bg-transparent hover:bg-[var(--accent)]/10 border border-[var(--border-secondary)] hover:border-[var(--accent)]/50 text-[var(--accent)] text-[12px] md:text-[13px] font-semibold text-center rounded-[8px] transition-all duration-300 whitespace-nowrap"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="mt-8 md:mt-12 flex justify-center">
            <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] p-1 rounded-xl">
              <button className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-[var(--text-dimmed)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />
              </button>
              <button className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-[var(--accent)] text-white font-medium text-[12px] md:text-[13px] rounded-lg transition-colors">
                1
              </button>
              <button className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] font-medium text-[12px] md:text-[13px] rounded-lg transition-colors">
                2
              </button>
              <button className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] font-medium text-[12px] md:text-[13px] rounded-lg transition-colors hidden sm:flex">
                3
              </button>
              <span className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-[var(--text-dimmed)] tracking-widest text-[11px] md:text-[12px]">
                ...
              </span>
              <button className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] font-medium text-[12px] md:text-[13px] rounded-lg transition-colors">
                12
              </button>
              <button className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-[var(--text-dimmed)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3" />
              </button>
            </div>
          </div>

        </main>
      </div>

    </div>
  );
}
