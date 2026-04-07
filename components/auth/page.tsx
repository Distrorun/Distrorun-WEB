"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faEyeSlash, faEye, faSun, faMoon } from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { signIn, signUp } from "@/lib/auth-client";

const GoogleIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        <path d="M1 1h22v22H1z" fill="none" />
    </svg>
);

export default function AuthPage() {
    const [activeTab, setActiveTab] = useState<"login" | "register">("login");
    const [showPassword, setShowPassword] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [name, setName] = useState("");
    const { theme, setTheme, systemTheme } = useTheme();
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    const currentTheme = theme === "system" ? systemTheme : theme;
    const isDark = currentTheme === "dark";

    const toggleTheme = () => setTheme(isDark ? "light" : "dark");

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        try {
            await signIn.social({
                provider: "google",
                callbackURL: "/registry",
            });
        } catch (err) {
            setError("Failed to sign in with Google.");
            setLoading(false);
        }
    };

    const handleGitHubSignIn = async () => {
        setLoading(true);
        setError(null);
        try {
            await signIn.social({
                provider: "github",
                callbackURL: "/registry",
            });
        } catch (err) {
            setError("Failed to sign in with GitHub.");
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (activeTab === "register") {
                if (password !== confirmPassword) {
                    setError("Passwords do not match.");
                    setLoading(false);
                    return;
                }
                const res = await signUp.email({
                    email,
                    password,
                    name: name || email.split("@")[0],
                });
                if (res.error) {
                    setError(res.error.message || "Registration failed.");
                    setLoading(false);
                    return;
                }
                router.push("/dashboard");
            } else {
                const res = await signIn.email({
                    email,
                    password,
                });
                if (res.error) {
                    setError(res.error.message || "Login failed.");
                    setLoading(false);
                    return;
                }
                router.push("/");
            }
        } catch (err) {
            setError(activeTab === "login" ? "Login failed. Please try again." : "Registration failed. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div
            className="bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col items-center min-h-screen relative overflow-hidden font-['Space_Grotesk',sans-serif] transition-colors duration-300"
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
            {/* Background glow effects */}
            <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] bg-[var(--glow-radial)] blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[20%] right-[10%] w-[50%] h-[50%] bg-[var(--glow-blur)] blur-[150px] rounded-full pointer-events-none" />

            {/* Header */}
            <header className="w-full flex items-center justify-between px-8 py-6 z-20">
                <Link href="/" className="font-bold text-[18px] tracking-tight text-[var(--text-primary)] transition-colors duration-300">
                    Distrorun
                </Link>
                <div className="flex flex-row items-center gap-6">
                    <button
                        onClick={toggleTheme}
                        className="w-6 h-6 relative opacity-80 hover:opacity-100 transition-opacity text-[var(--text-muted)]"
                        aria-label="Toggle theme"
                    >
                        <FontAwesomeIcon icon={mounted && !isDark ? faMoon : faSun} className="w-5 h-5" />
                    </button>
                    <Link href="http://localhost:8000" target="_blank" className="text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-300">
                        Need help?
                    </Link>
                </div>
            </header>

            {/* Main Container */}
            <main className="flex-1 flex flex-col items-center justify-center w-full relative z-10 px-4 mt-[-40px]">
                {/* Card */}
                <div className="w-full max-w-[420px] bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-secondary)] rounded-3xl p-7 shadow-[var(--shadow-heavy)] transition-colors duration-300">

                    {/* Toggle Tab */}
                    <div className="flex bg-[var(--bg-secondary)] rounded-full p-1.5 border border-[var(--border-secondary)] mb-8 transition-colors duration-300">
                        <button
                            onClick={() => { setActiveTab("login"); setError(null); }}
                            className={`flex-1 flex items-center justify-center py-2.5 rounded-full text-[13px] font-bold transition-all duration-300 ${activeTab === "login"
                                ? "bg-[var(--accent)] text-white shadow-[0px_0px_15px_rgba(59,130,246,0.4)]"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                }`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => { setActiveTab("register"); setError(null); }}
                            className={`flex-1 flex items-center justify-center py-2.5 rounded-full text-[13px] font-bold transition-all duration-300 ${activeTab === "register"
                                ? "bg-[var(--accent)] text-white shadow-[0px_0px_15px_rgba(59,130,246,0.4)]"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                }`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Heading */}
                    <div className="flex flex-col items-center gap-2 mb-8 text-center transition-colors duration-300">
                        <h1 className="text-[22px] font-bold text-[var(--text-primary)] leading-tight">
                            Welcome to the Registry
                        </h1>
                        <p className="text-[13px] text-[var(--text-muted)]">
                            Securely manage your distributions
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-[12px] text-red-400 text-center font-medium">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                        {/* Name Field (Register only) */}
                        {activeTab === "register" && (
                            <div className="flex flex-col gap-2">
                                <label className="text-[12px] font-medium text-[var(--text-secondary)] transition-colors duration-300">
                                    Display Name
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dimmed)] transition-colors duration-300">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Your name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full h-[46px] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-full pl-11 pr-4 text-[13px] font-['Space_Grotesk',sans-serif] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] focus:bg-[var(--bg-primary)] transition-colors duration-300"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Email Field */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[12px] font-medium text-[var(--text-secondary)] transition-colors duration-300">
                                Email
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dimmed)] transition-colors duration-300">
                                    <FontAwesomeIcon icon={faEnvelope} className="w-[14px] h-[14px]" />
                                </div>
                                <input
                                    type="email"
                                    placeholder="name@distrorun.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full h-[46px] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-full pl-11 pr-4 text-[13px] font-['Space_Grotesk',sans-serif] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] focus:bg-[var(--bg-primary)] transition-colors duration-300"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[12px] font-medium text-[var(--text-secondary)] transition-colors duration-300">
                                    Password
                                </label>
                            </div>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dimmed)] transition-colors duration-300">
                                    <FontAwesomeIcon icon={faLock} className="w-[14px] h-[14px]" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full h-[46px] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-full pl-11 pr-11 text-[20px] tracking-widest font-['Space_Grotesk',sans-serif] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] focus:bg-[var(--bg-primary)] transition-colors duration-300"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-dimmed)] hover:text-[var(--text-primary)] transition-colors outline-none duration-300"
                                >
                                    <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} className="w-[14px] h-[14px]" />
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password Field (Only for Register) */}
                        {activeTab === "register" && (
                            <div className="flex flex-col gap-2 transition-all duration-300">
                                <label className="text-[12px] font-medium text-[var(--text-secondary)] transition-colors duration-300">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dimmed)] transition-colors duration-300">
                                        <FontAwesomeIcon icon={faLock} className="w-[14px] h-[14px]" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="w-full h-[46px] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-full pl-11 pr-11 text-[20px] tracking-widest font-['Space_Grotesk',sans-serif] text-[var(--text-primary)] placeholder-[var(--text-dimmed)] focus:outline-none focus:border-[var(--accent)] focus:bg-[var(--bg-primary)] transition-colors duration-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-dimmed)] hover:text-[var(--text-primary)] transition-colors outline-none duration-300"
                                    >
                                        <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} className="w-[14px] h-[14px]" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-[46px] mt-2 bg-[var(--accent)] text-white font-bold text-[14px] rounded-full shadow-[0px_4px_20px_rgba(59,130,246,0.3)] hover:bg-[var(--accent-hover)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    {activeTab === "login" ? "Signing In..." : "Signing Up..."}
                                </span>
                            ) : (
                                activeTab === "login" ? "Sign In" : "Sign Up"
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-7 transition-colors duration-300">
                        <div className="flex-1 h-[1px] bg-[var(--grid-line)] transition-colors duration-300" />
                        <span className="text-[11px] text-[var(--text-dimmed)] transition-colors duration-300">Or continue with</span>
                        <div className="flex-1 h-[1px] bg-[var(--grid-line)] transition-colors duration-300" />
                    </div>

                    {/* Social Auth */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="flex-1 h-[42px] flex items-center justify-center gap-2.5 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-full hover:bg-[var(--border-primary)] hover:border-[var(--accent)] transition-all duration-300 text-[12px] font-bold text-[var(--text-primary)] disabled:opacity-50"
                        >
                            <GoogleIcon />
                            Google
                        </button>
                        <button
                            type="button"
                            onClick={handleGitHubSignIn}
                            disabled={loading}
                            className="flex-1 h-[42px] flex items-center justify-center gap-2.5 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-full hover:bg-[var(--border-primary)] hover:border-[var(--accent)] transition-all duration-300 text-[12px] font-bold text-[var(--text-primary)] disabled:opacity-50"
                        >
                            <FontAwesomeIcon icon={faGithub} className="w-[16px] h-[16px]" />
                            GitHub
                        </button>
                    </div>

                    {/* Terms Footer inside card as per mockup */}
                    <div className="mt-8 text-center text-[10px] text-[var(--text-dimmed)] leading-[18px] transition-colors duration-300">
                        By continuing, you agree to Distrorun's <Link href="/terms" className="text-[var(--accent)] hover:underline">Terms</Link> and <Link href="/privacy" className="text-[var(--accent)] hover:underline">Privacy Policy</Link>.
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-[var(--text-muted)] z-20 whitespace-nowrap transition-colors duration-300">
                © 2026 Distrorun, Under the Apache2.0 licence
            </footer>
        </div>
    );
}
