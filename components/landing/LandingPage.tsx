"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faMoon, faChevronDown, faGear, faRightFromBracket, faDownload } from "@fortawesome/free-solid-svg-icons";
import { useSession, signOut } from "@/lib/auth-client";
import { getIcon } from "@/lib/icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

// Local assets (downloaded from Figma)
const imgContainer = "/assets/icon-search.svg";
const imgContainer1 = "/assets/corner-step1.svg";
const imgContainer2 = "/assets/icon-yaml.svg";
const imgContainer3 = "/assets/corner-step2.svg";
const imgContainer4 = "/assets/icon-build.svg";
const imgSvg = "/assets/connector-line.svg";
const imgContainer5 = "/assets/corner-step3.svg";
const imgContainer6 = "/assets/icon-registry.svg";
const imgOverlayBorder = "/assets/icon-shield-border.svg";
const imgOverlay = "/assets/icon-shield-verified.svg";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredOS, setFeaturedOS] = useState<any[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, systemTheme } = useTheme();
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    fetch("/api/registry?limit=6")
      .then(res => res.json())
      .then(data => {
        if (data.packages) setFeaturedOS(data.packages);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";

  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  return (
    <div className="bg-[var(--bg-primary)] flex flex-col items-start w-full min-h-screen transition-colors duration-300">
      {/* Background with grid pattern */}
      <div
        className="flex flex-col items-start w-full relative"
        style={{
          backgroundImage:
            "linear-gradient(90deg, var(--grid-line) 2.5%, transparent 2.5%), linear-gradient(180deg, var(--grid-line) 2.5%, transparent 2.5%)",
          backgroundSize: "40px 40px",
        }}
      >
        {/* Radial gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 60% at 50% 50%, var(--glow-radial) 0%, transparent 70%)",
          }}
        />

        {/* ═══════════════════════════════════════════
            HEADER / NAVIGATION
        ═══════════════════════════════════════════ */}
        <header className="backdrop-blur-md bg-[var(--bg-header)] border-b border-[var(--border-primary)] flex items-center justify-between py-3 px-6 md:px-10 w-full z-30 sticky top-0 transition-colors duration-300">
          {/* Logo */}
          <div className="flex items-center">
            <span className="font-['Space_Grotesk',sans-serif] font-bold text-[18px] text-[var(--text-primary)] tracking-tight">
              Distrorun
            </span>
          </div>

          {/* Nav + CTA */}
          <div className="flex items-center gap-8">
            <nav className="hidden md:flex items-center gap-9">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="w-6 h-6 relative opacity-80 hover:opacity-100 transition-opacity text-[var(--text-muted)]"
                aria-label="Toggle theme"
              >
                <FontAwesomeIcon icon={mounted && !isDark ? faMoon : faSun} className="w-5 h-5" />
              </button>
              <a
                href="/llm"
                className="font-['Space_Grotesk',sans-serif] font-medium text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
              AI
              </a>
              <a
                href="/registry"
                className="font-['Space_Grotesk',sans-serif] font-medium text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Explore
              </a>
              <a
                href="http://localhost:8000"
                target="_blank"
                className="font-['Space_Grotesk',sans-serif] font-medium text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Docs
              </a>
            </nav>
            {isPending ? (
              <div className="w-[84px] h-10 bg-[var(--bg-secondary)] animate-pulse rounded-full"></div>
            ) : session ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 text-[14px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {session.user.image ? (
                    <img src={session.user.image} alt="" className="w-8 h-8 rounded-full border border-[var(--border-secondary)]" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--accent)] font-bold text-[14px]">
                      {session.user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-['Space_Grotesk',sans-serif] font-medium">{session.user.name}</span>
                  <FontAwesomeIcon icon={faChevronDown} className={`w-[10px] h-[10px] transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
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
            ) : (
              <Link href="/auth" className="flex items-center justify-center bg-[var(--accent)] text-white font-['Space_Grotesk',sans-serif] font-bold text-[14px] tracking-wide px-5 h-10 rounded-full shadow-[0px_0px_15px_0px_rgba(59,130,246,0.4)] hover:bg-[var(--accent-hover)] hover:shadow-[0px_0px_20px_0px_rgba(59,130,246,0.6)] transition-all duration-200 whitespace-nowrap">
                Sign In
              </Link>
            )}
          </div>
        </header>

        {/* ═══════════════════════════════════════════
            MAIN CONTENT
        ═══════════════════════════════════════════ */}
        <main className="flex flex-col items-center px-6 md:px-10 lg:px-40 pb-20 w-full relative z-10">
          {/* Hero decorative blur */}
          <div className="absolute opacity-20 overflow-hidden right-0 w-[600px] h-[600px] top-0 pointer-events-none">
            <div className="absolute bg-[var(--accent)] blur-[50px] right-[150px] rounded-full w-64 h-64 top-[150px]" />
            <div className="absolute bg-[#4f46e5] blur-[60px] right-0 rounded-full w-96 h-96 top-[calc(50%+192px)] -translate-y-1/2" />
          </div>

          <div className="flex flex-col gap-16 items-start max-w-[1200px] pt-16 w-full">

            {/* ─── HERO SECTION ─── */}
            <section className="flex flex-col lg:flex-row gap-12 items-center justify-center w-full">
              {/* Left: headline + CTA */}
              <div className="flex flex-1 flex-col gap-6 items-start min-w-0">
                <div className="flex flex-col gap-4 items-start w-full">
                  {/* Heading */}
                  <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[42px] md:text-[53px] text-[var(--text-primary)] tracking-[-0.04em] leading-[1.13] w-full">
                    <span className="block">Build, Run, and</span>
                    <span className="block">
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#3b82f6] to-[#818cf8]">
                        Share
                      </span>
                      {" Custom"}
                    </span>
                    <span className="block">Linux Distributions</span>
                  </h1>

                  {/* Subtitle */}
                  <p className="font-['Space_Grotesk',sans-serif] font-normal text-[var(--text-muted)] text-[18px] leading-[1.625] max-w-[600px]">
                    Create lightweight, secure Linux distributions with simple YAML
                    configurations. Define your OS infrastructure as code.
                  </p>
                </div>

                {/* Search bar */}
                <div className="w-full max-w-[512px] py-2">
                  <form className="relative h-14 w-full" onSubmit={(e) => {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      router.push(`/registry?search=${encodeURIComponent(searchQuery)}`);
                    } else {
                      router.push("/registry");
                    }
                  }}>
                    {/* Search icon */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] z-10">
                      <img
                        src={imgContainer}
                        alt="search"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Search configurations (e.g., nginx alpine server)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-full backdrop-blur-sm bg-[var(--search-bg)] border border-[var(--border-primary)] rounded-full pl-12 pr-4 text-[16px] font-['Space_Grotesk',sans-serif] text-[var(--text-dimmed)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] focus:text-[var(--text-primary)] transition-colors shadow-[var(--search-shadow)]"
                    />
                  </form>
                </div>

                {/* CTA Buttons */}
                <div className="flex gap-3 items-center flex-wrap">
                  <Link href="/auth" className="flex items-center justify-center relative bg-[var(--accent)] text-white font-['Space_Grotesk',sans-serif] font-bold text-[16px] h-12 min-w-[140px] px-7 rounded-full shadow-[0px_0px_20px_0px_rgba(59,130,246,0.5)] hover:bg-[var(--accent-hover)] hover:shadow-[0px_0px_30px_0px_rgba(59,130,246,0.7)] transition-all duration-200 overflow-hidden">
                    <span className="relative z-10">Get Started</span>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="-skew-x-12 w-16 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>
                  </Link>
                  <Link href="/registry">
                  <button className="bg-[var(--btn-secondary-bg)] border border-[var(--border-primary)] text-[var(--text-primary)] font-['Space_Grotesk',sans-serif] font-bold text-[16px] h-12 min-w-[140px] px-7 rounded-full hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all duration-200">
                    Explore Registry
                  </button>
                  </Link>
                </div>
              </div>

              {/* Right: Terminal window */}
              <div className="flex flex-1 flex-col items-start min-w-0 w-full lg:max-w-[560px]">
                <div className="relative rounded-3xl overflow-hidden w-full">
                  {/* Glow border */}
                  <div className="absolute -inset-[3px] bg-gradient-to-r from-[rgba(59,130,246,0.1)] to-[rgba(79,70,229,0.1)] blur-[12px] rounded-3xl" />
                  {/* Main card */}
                  <div className="relative bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-3xl shadow-[var(--shadow-heavy)] overflow-hidden transition-colors duration-300">
                    {/* Terminal title bar */}
                    <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] px-4 py-3 flex items-center gap-2">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-[var(--terminal-dot-red)]" />
                        <div className="w-3 h-3 rounded-full bg-[var(--terminal-dot-yellow)]" />
                        <div className="w-3 h-3 rounded-full bg-[var(--terminal-dot-green)]" />
                      </div>
                      <span className="ml-2 font-['JetBrains_Mono',monospace] text-[12px] text-[var(--terminal-label)]">
                        bash — 80x24
                      </span>
                    </div>

                    {/* Subtle gradient inside */}
                    <div className="absolute inset-[1px] bg-gradient-to-b from-[rgba(59,130,246,0.05)] to-transparent pointer-events-none rounded-3xl" />

                    {/* Terminal content */}
                    <div className="relative p-6 flex flex-col gap-[7px]">
                      <div className="flex gap-2 items-start">
                        <span className="font-['JetBrains_Mono',monospace] font-bold text-[14px] text-[var(--accent)] leading-[22.75px] whitespace-nowrap">
                          user@dev:~$
                        </span>
                        <span className="font-['JetBrains_Mono',monospace] text-[14px] text-[var(--terminal-cmd)] leading-[22.75px]">
                          distrorun build ./server.yaml
                        </span>
                      </div>

                      <div className="font-['JetBrains_Mono',monospace] text-[14px] text-[var(--terminal-output)] leading-[22.75px]">
                        <p className="mb-0">{`> Parsing configuration...`}</p>
                        <p className="mb-0">{`> Resolving dependencies (alpine:latest)...`}</p>
                        <p className="mb-0">{`> Installing packages: [nginx, vim, curl,`}</p>
                        <p className="mb-0">openssh]</p>
                        <p className="mb-0">{`> Generating SBOM metadata...`}</p>
                        <p className="mb-0">{`> Hardening kernel parameters...`}</p>
                        <p>{`> Generating ISO image...`}</p>
                      </div>

                      <div className="font-['JetBrains_Mono',monospace] text-[14px] text-[var(--accent)] leading-[22.75px]">
                        <p className="mb-0">✔ Build successful! Output: my-alpine-server-</p>
                        <p>v1.0.iso (52MB)</p>
                      </div>

                      <div className="flex gap-2 items-start">
                        <span className="font-['JetBrains_Mono',monospace] font-bold text-[14px] text-[var(--accent)] leading-[22.75px]">
                          user@dev:~$
                        </span>
                        <span className="font-['JetBrains_Mono',monospace] text-[14px] text-[var(--terminal-cmd)] leading-[22.75px] animate-[blink_1s_step-end_infinite]">
                          _
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ─── FROM CONFIG TO ISO — WORKFLOW STEPS ─── */}
            <section className="border-t border-[var(--border-secondary)] flex flex-col gap-16 items-start pb-16 pt-16 w-full">
              <div className="flex flex-col gap-2 w-full">
                <h2 className="font-['Space_Grotesk',sans-serif] font-bold text-[30px] text-[var(--text-primary)] leading-[1.25]">
                  From Config to ISO in Seconds
                </h2>
                <p className="font-['Space_Grotesk',sans-serif] font-normal text-[var(--text-muted)] text-[18px] leading-[28px]">
                  Streamlined workflow for modern infrastructure.
                </p>
              </div>

              <div className="relative w-full">
                <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 top-0 bottom-8 w-[2px] border-l-2 border-dashed border-[rgba(59,130,246,0.2)]" />

                <div className="flex flex-col gap-8 lg:gap-0">

                  {/* ── Step 1: Write YAML ── */}
                  <div className="flex flex-col lg:flex-row items-center w-full relative mb-0 lg:mb-[-32px]">
                    <div className="w-full lg:w-1/2 lg:pr-16 flex justify-end">
                      <div className="relative backdrop-blur-md bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-2xl p-8 flex flex-col gap-4 w-full max-w-[448px] shadow-[var(--shadow-card)] overflow-hidden transition-colors duration-300">
                        <div className="absolute right-0 top-0 w-24 h-28 pointer-events-none">
                          <img src={imgContainer1} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex gap-4 items-center">
                          <div className="relative bg-[var(--icon-box-bg)] border border-[var(--border-accent)] rounded-3xl flex items-center justify-center w-14 h-14 shrink-0">
                            <img src={imgContainer2} alt="yaml icon" className="w-5 h-[25px] object-contain" />
                          </div>
                          <h3 className="font-['Space_Grotesk',sans-serif] font-bold text-[24px] text-[var(--text-primary)] leading-8">
                            1. Write YAML
                          </h3>
                        </div>
                        <p className="font-['Space_Grotesk',sans-serif] font-normal text-[var(--text-muted)] text-[18px] leading-[29.25px]">
                          Define base distro, packages, and system settings in a declarative yaml file.
                        </p>
                      </div>
                    </div>
                    <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[var(--dot-bg)] border-2 border-[var(--accent)] rounded-full items-center justify-center shadow-[0px_0px_15px_0px_rgba(59,130,246,0.5)] z-10">
                      <div className="w-2 h-2 bg-[var(--accent)] rounded-full" />
                    </div>
                    <div className="hidden lg:block lg:w-1/2" />
                  </div>

                  {/* ── Step 2: Build ISO ── */}
                  <div className="flex flex-col lg:flex-row items-center w-full relative mb-0 lg:mb-[-32px]">
                    <div className="hidden lg:block lg:w-1/2" />
                    <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[var(--dot-bg)] border-2 border-[var(--accent)] rounded-full items-center justify-center shadow-[0px_0px_15px_0px_rgba(59,130,246,0.5)] z-10">
                      <div className="w-2 h-2 bg-[var(--accent)] rounded-full" />
                    </div>
                    <div className="w-full lg:w-1/2 lg:pl-16 flex justify-start">
                      <div className="relative backdrop-blur-md bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-2xl p-8 flex flex-col gap-4 w-full max-w-[448px] shadow-[var(--shadow-card)] overflow-hidden transition-colors duration-300">
                        <div className="absolute right-0 top-0 w-28 h-28 pointer-events-none">
                          <img src={imgContainer3} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="hidden lg:block absolute -left-[664px] top-28 w-[600px] h-64 pointer-events-none">
                          <img src={imgSvg} alt="" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex gap-4 items-center">
                          <div className="relative bg-[var(--icon-box-bg)] border border-[var(--border-accent)] rounded-3xl flex items-center justify-center w-14 h-14 shrink-0">
                            <img src={imgContainer4} alt="build icon" className="w-[25px] h-[25px] object-contain" />
                          </div>
                          <h3 className="font-['Space_Grotesk',sans-serif] font-bold text-[24px] text-[var(--text-primary)] leading-8">
                            2. Build ISO
                          </h3>
                        </div>
                        <p className="font-['Space_Grotesk',sans-serif] font-normal text-[var(--text-muted)] text-[18px] leading-[29.25px]">
                          Run the build command locally or in CI/CD. Receive a bootable, immutable ISO image with SPDX SBOM.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Step 3: Push to Registry ── */}
                  <div className="flex flex-col lg:flex-row items-center w-full relative mb-0 lg:mb-[-32px]">
                    <div className="w-full lg:w-1/2 lg:pr-16 flex justify-end">
                      <div className="relative backdrop-blur-md bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-2xl p-8 flex flex-col gap-4 w-full max-w-[448px] shadow-[var(--shadow-card)] overflow-hidden transition-colors duration-300">
                        <div className="absolute right-0 top-0 w-28 h-28 pointer-events-none">
                          <img src={imgContainer5} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex gap-4 items-center">
                          <div className="relative bg-[var(--icon-box-bg)] border border-[var(--border-accent)] rounded-3xl flex items-center justify-center w-14 h-14 shrink-0">
                            <img src={imgContainer6} alt="registry icon" className="w-[25px] h-[25px] object-contain" />
                          </div>
                          <h3 className="font-['Space_Grotesk',sans-serif] font-bold text-[24px] text-[var(--text-primary)] leading-8">
                            3. Push to Registry
                          </h3>
                        </div>
                        <p className="font-['Space_Grotesk',sans-serif] font-normal text-[var(--text-muted)] text-[18px] leading-[29.25px]">
                          Tag and push your custom distro to the registry to share with your team or the world.
                        </p>
                      </div>
                    </div>
                    <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[var(--dot-bg)] border-2 border-[var(--accent)] rounded-full items-center justify-center shadow-[0px_0px_15px_0px_rgba(59,130,246,0.5)] z-10">
                      <div className="w-2 h-2 bg-[var(--accent)] rounded-full" />
                    </div>
                    <div className="hidden lg:block lg:w-1/2" />
                  </div>

                </div>
              </div>
            </section>

            {/* ─── YAML EDITOR + SECURE BY DESIGN ─── */}
            <section className="flex flex-col lg:flex-row gap-10 items-center pb-16 w-full">

              {/* Left: YAML code card */}
              <div className="flex flex-1 flex-col min-w-0 relative">
                <div className="absolute bg-[var(--glow-blur)] blur-[32px] -left-10 rounded-full w-40 h-40 -top-10 pointer-events-none" />
                <div className="terminal-block bg-[var(--bg-primary)] transition-colors duration-300 border border-[var(--border-primary)] transition-colors duration-300 rounded-3xl shadow-[var(--shadow-heavy)] overflow-hidden w-full">
                  <div className="bg-[var(--bg-secondary)] transition-colors duration-300 border-b border-[var(--border-primary)] transition-colors duration-300 flex items-center justify-between px-4 py-2">
                    <span className="font-['JetBrains_Mono',monospace] text-[12px] text-[var(--text-dimmed)] transition-colors duration-300">
                      my-alpine-server.yaml
                    </span>
                    <div className="bg-[var(--icon-box-bg)] transition-colors duration-300 border border-[var(--border-accent)] transition-colors duration-300 rounded-lg px-2 py-[3px]">
                      <span className="font-['Space_Grotesk',sans-serif] font-bold text-[12px] text-[var(--accent)] transition-colors duration-300">
                        YAML
                      </span>
                    </div>
                  </div>

                  <div className="bg-[var(--code-bg)] transition-colors duration-300 p-6 overflow-x-auto">
                    <pre className="font-['JetBrains_Mono',monospace] text-[14px] leading-[20px] m-0">
                      <span className="text-[var(--code-key)] transition-colors duration-300">version</span>
                      <span className="text-[var(--code-text)] transition-colors duration-300">: </span>
                      <span className="text-[var(--code-value)] transition-colors duration-300">1.0</span>
                      {"\n"}
                      <span className="text-[var(--code-key)] transition-colors duration-300">name</span>
                      <span className="text-[var(--code-text)] transition-colors duration-300">: </span>
                      <span className="text-[var(--code-value)] transition-colors duration-300">my-alpine-server</span>
                      {"\n"}
                      <span className="text-[var(--code-key)] transition-colors duration-300">distro</span>
                      <span className="text-[var(--code-text)] transition-colors duration-300">:</span>
                      {"\n"}
                      <span className="text-[var(--code-text)] transition-colors duration-300">  </span>
                      <span className="text-[var(--code-key)] transition-colors duration-300">base</span>
                      <span className="text-[var(--code-text)] transition-colors duration-300">: </span>
                      <span className="text-[var(--code-value)] transition-colors duration-300">alpine</span>
                      {"\n"}
                      <span className="text-[var(--code-key)] transition-colors duration-300">packages</span>
                      <span className="text-[var(--code-text)] transition-colors duration-300">:</span>
                      {"\n"}
                      <span className="text-[var(--code-text)] transition-colors duration-300">  - </span>
                      <span className="text-[var(--code-value)] transition-colors duration-300">nginx</span>
                      {"\n"}
                      <span className="text-[var(--code-text)] transition-colors duration-300">  - </span>
                      <span className="text-[var(--code-value)] transition-colors duration-300">vim</span>
                      {"\n"}
                      <span className="text-[var(--code-text)] transition-colors duration-300">  - </span>
                      <span className="text-[var(--code-value)] transition-colors duration-300">curl</span>
                      {"\n"}
                      <span className="text-[var(--code-text)] transition-colors duration-300">  - </span>
                      <span className="text-[var(--code-value)] transition-colors duration-300">openssh</span>
                      {"\n"}
                      <span className="text-[var(--code-key)] transition-colors duration-300">users</span>
                      <span className="text-[var(--code-text)] transition-colors duration-300">:</span>
                      {"\n"}
                      <span className="text-[var(--code-text)] transition-colors duration-300">  - </span>
                      <span className="text-[var(--code-key)] transition-colors duration-300">name</span>
                      <span className="text-[var(--code-text)] transition-colors duration-300">: </span>
                      <span className="text-[var(--code-value)] transition-colors duration-300">root</span>
                      {"\n"}
                      <span className="text-[var(--code-text)] transition-colors duration-300">  - </span>
                      <span className="text-[var(--code-key)] transition-colors duration-300">password</span>
                      <span className="text-[var(--code-text)] transition-colors duration-300">: </span>
                      <span className="text-[var(--code-value)] transition-colors duration-300">toor</span>
                      {"\n"}
                      <span className="text-[var(--code-text)] transition-colors duration-300">  - </span>
                      <span className="text-[var(--code-key)] transition-colors duration-300">name</span>
                      <span className="text-[var(--code-text)] transition-colors duration-300">: </span>
                      <span className="text-[var(--code-value)] transition-colors duration-300">talfaza</span>
                      {"\n"}
                      <span className="text-[var(--code-text)] transition-colors duration-300">  - </span>
                      <span className="text-[var(--code-key)] transition-colors duration-300">password</span>
                      <span className="text-[var(--code-text)] transition-colors duration-300">: </span>
                      <span className="text-[var(--code-value)] transition-colors duration-300">securepassword</span>
                      {"\n"}
                      <span className="text-[var(--code-key)] transition-colors duration-300">services</span>
                      <span className="text-[var(--code-text)] transition-colors duration-300">:</span>
                      {"\n"}
                      <span className="text-[var(--code-text)] transition-colors duration-300">  </span>
                      <span className="text-[var(--code-key)] transition-colors duration-300">enabled</span>
                      <span className="text-[var(--code-text)] transition-colors duration-300">:</span>
                      {"\n"}
                      <span className="text-[var(--code-text)] transition-colors duration-300">    - </span>
                      <span className="text-[var(--code-value)] transition-colors duration-300">nginx</span>
                      {"\n"}
                      <span className="text-[var(--code-text)] transition-colors duration-300">    - </span>
                      <span className="text-[var(--code-value)] transition-colors duration-300">sshd</span>
                      {"\n"}
                      <span className="text-[var(--code-text)] transition-colors duration-300">    - </span>
                      <span className="text-[var(--code-value)] transition-colors duration-300">networking</span>
                      {"\n"}
                      <span className="text-[var(--code-key)] transition-colors duration-300">build</span>
                      <span className="text-[var(--code-text)] transition-colors duration-300">:</span>
                      {"\n"}
                      <span className="text-[var(--code-text)] transition-colors duration-300">  </span>
                      <span className="text-[var(--code-key)] transition-colors duration-300">sbom</span>
                      <span className="text-[var(--code-text)] transition-colors duration-300">: </span>
                      <span className="text-[var(--code-bool)] transition-colors duration-300">true</span>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Right: Secure by Design */}
              <div className="flex flex-1 flex-col gap-6 min-w-0">
                <div className="flex gap-3 items-center">
                  <div className="w-[38px] h-[43px] shrink-0 relative">
                    <img src={imgOverlayBorder} alt="shield icon" className="w-full h-full object-contain" />
                  </div>
                  <h2 className="font-['Space_Grotesk',sans-serif] font-bold text-[30px] text-[var(--text-primary)] leading-9">
                    Secure by Design
                  </h2>
                </div>

                <p className="font-['Space_Grotesk',sans-serif] font-normal text-[var(--text-muted)] text-[18px] leading-7">
                  Every build automatically generates a Software Bill of Materials
                  (SBOM) ensuring full transparency and compliance.
                </p>

                <div className="backdrop-blur-md bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-3xl p-6 flex flex-col gap-4 shadow-[var(--shadow-card)] transition-colors duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-9 shrink-0 relative">
                        <img src={imgOverlay} alt="verified icon" className="w-full h-full object-contain" />
                      </div>
                      <span className="font-['Space_Grotesk',sans-serif] font-bold text-[16px] text-[var(--text-primary)] leading-6">
                        SBOM Verified
                      </span>
                    </div>
                    <span className="bg-[var(--passed-bg)] border border-[var(--passed-border)] text-[#22c55e] font-['Space_Grotesk',sans-serif] font-bold text-[12px] px-3 py-1 rounded-md uppercase tracking-wide">
                      Passed
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-['Space_Grotesk',sans-serif] text-[14px] text-[var(--text-dimmed)]">
                      Vulnerability Scan
                    </span>
                    <span className="font-['Space_Grotesk',sans-serif] text-[14px] text-[var(--text-muted)]">
                      0 Critical, 0 High
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* ─── FEATURED CONFIGURATIONS ─── */}
            <section className="flex flex-col gap-8 pb-16 w-full">
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col gap-2">
                  <h2 className="font-['Space_Grotesk',sans-serif] font-bold text-[30px] text-[var(--text-primary)] leading-[1.25]">
                    Featured Configurations
                  </h2>
                  <p className="font-['Space_Grotesk',sans-serif] font-normal text-[var(--text-muted)] text-[18px] leading-7">
                    Official curated builds ready for production.
                  </p>
                </div>
                <a href="/registry" className="font-['Space_Grotesk',sans-serif] font-medium text-[14px] text-[var(--accent)] hover:text-[#60a5fa] transition-colors whitespace-nowrap mt-2">
                  View all →
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {featuredOS.map((entry) => {
                  const iconColor = entry.icon_color || "var(--accent)";
                  const tags = entry.tags || [];
                  return (
                    <Link
                      href={`/registry/${entry.name}`}
                      key={entry.id}
                      className="backdrop-blur-md bg-[var(--bg-card)] border border-[var(--border-secondary)] rounded-2xl p-5 flex flex-col gap-3 hover:border-[var(--accent)]/50 transition-colors cursor-pointer group"
                    >
                      {/* Header: icon + downloads */}
                      <div className="flex items-start justify-between">
                        <div
                          className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-secondary)] flex items-center justify-center shrink-0"
                        >
                          <FontAwesomeIcon
                            icon={getIcon(entry.icon)}
                            className="w-4 h-4"
                            style={{ color: iconColor }}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <FontAwesomeIcon icon={faDownload} className="w-3 h-3 text-[var(--text-dimmed)]" />
                          <span className="font-['Space_Grotesk',sans-serif] text-[12px] text-[var(--text-dimmed)]">
                            {entry.downloads}
                          </span>
                        </div>
                      </div>

                      {/* Name + base */}
                      <div className="flex flex-col gap-0.5">
                        <span className="font-['Space_Grotesk',sans-serif] font-bold text-[16px] text-[var(--text-primary)] group-hover:text-[#60a5fa] transition-colors">
                          {entry.name}
                        </span>
                        <span className="font-['Space_Grotesk',sans-serif] text-[12px] text-[var(--text-dimmed)] capitalize">
                          {entry.base_distro || "alpine"} Based
                        </span>
                      </div>

                      {/* Description */}
                      <p className="font-['Space_Grotesk',sans-serif] font-normal text-[var(--text-muted)] text-[13px] leading-5 line-clamp-2">
                        {entry.description}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mt-auto">
                        {entry.official && (
                          <span className="text-[11px] font-['Space_Grotesk',sans-serif] font-medium px-2.5 py-1 rounded-full bg-[var(--tag-bg)] text-[var(--accent)] border border-[var(--tag-border)]">
                            OFFICIAL
                          </span>
                        )}
                        {tags.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="text-[11px] font-['Space_Grotesk',sans-serif] font-medium px-2.5 py-1 rounded-full bg-[var(--tag-bg)] text-[var(--accent)] border border-[var(--tag-border)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

          </div>
        </main>

        {/* ═══════════════════════════════════════════
            FOOTER
        ═══════════════════════════════════════════ */}
        <footer className="border-t border-[var(--border-secondary)] w-full px-6 md:px-10 lg:px-40 py-6 relative z-10">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between">
            <span className="font-['Space_Grotesk',sans-serif] font-bold text-[18px] text-[var(--text-primary)] tracking-tight">
              Distrorun
            </span>
            <div className="flex items-center gap-4">
              <a href="#" className="text-[var(--text-dimmed)] hover:text-[var(--text-secondary)] transition-colors" aria-label="Website">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </a>
              <a href="https://github.com/Distrorun" target="_blank" className="text-[var(--text-dimmed)] hover:text-[var(--text-secondary)] transition-colors" aria-label="GitHub">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
