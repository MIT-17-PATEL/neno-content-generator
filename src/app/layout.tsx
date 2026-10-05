import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/features/auth/auth-context";
import { BackgroundGenerationProvider } from "@/features/generation/background-generation-context";
import { BackgroundGenerationWidget } from "@/components/generation/background-generation-widget";
import { AppLayout } from "@/components/layout/app-layout";

export const metadata: Metadata = {
  title: "AI Content Studio — Autonomous Content & Research Workspace",
  description:
    "Production-grade AI content workspace for blogs, case studies, SEO metadata, and research-backed publishing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased">
        <AuthProvider>
          <BackgroundGenerationProvider>
            <AppLayout>{children}</AppLayout>
            <BackgroundGenerationWidget />
          </BackgroundGenerationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
