import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Distrorun — Build, Run, and Share Custom Linux Distributions",
  description:
    "Create lightweight, secure Linux distributions with simple YAML configurations. Define your OS infrastructure as code.",
  keywords: ["linux", "distro", "iso", "yaml", "devops", "infrastructure"],
  icons: {
    icon: "/assets/favicon.png",
  },
  openGraph: {
    title: "Distrorun — Custom Linux OS Builder",
    description:
      "Create lightweight, secure Linux distributions with simple YAML configurations.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased transition-colors duration-300">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
