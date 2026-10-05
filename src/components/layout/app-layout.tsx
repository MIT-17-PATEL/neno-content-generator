"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/auth");
  const isPublicPage =
    pathname === "/blog-with-sidebar" ||
    pathname.startsWith("/blog-with-sidebar/") ||
    (pathname.startsWith("/blog/") &&
      !pathname.endsWith("/edit") &&
      !pathname.startsWith("/blog/create"));

  if (isAuthPage || isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900 antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
