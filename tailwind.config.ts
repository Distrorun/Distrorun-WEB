import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        grotesk: ["Space Grotesk", "sans-serif"],
      },
      colors: {
        navy: {
          950: "#020617",
          900: "#0a0e1a",
          800: "#0f172a",
          700: "#0b1120",
          600: "#1e3a8a",
          500: "#1e40af",
        },
        blue: {
          accent: "#3b82f6",
          light: "#60a5fa",
          soft: "#93c5fd",
        },
        indigo: {
          accent: "#4f46e5",
          soft: "#818cf8",
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(90deg, rgba(30, 58, 138, 0.1) 2.5%, rgba(30, 58, 138, 0) 2.5%), linear-gradient(180deg, rgba(30, 58, 138, 0.1) 2.5%, rgba(30, 58, 138, 0) 2.5%)",
        "hero-gradient":
          "radial-gradient(ellipse at center, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0) 70%)",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        blink: "blink 1s step-end infinite",
        "fade-in": "fadeIn 0.5s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
