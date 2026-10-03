"use client";

import { Bell, Search, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";

export function Header() {
  const { user, activeWorkspace } = useAuth();
  const pathname = usePathname();

  const getPageTitle = (path: string) => {
    if (path === "/") return "Dashboard";
    if (path.startsWith("/create")) return "Create Content";
    if (path.startsWith("/content")) return "Content Library";
    if (path.startsWith("/research")) return "Research Workspace";
    if (path.startsWith("/media")) return "Media Library";
    if (path.startsWith("/templates")) return "Templates";
    if (path.startsWith("/settings")) return "Settings";
    return "AI Content Studio";
  };

  const getInitials = (name?: string) => {
    if (!name) return "AI";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Breadcrumb / Section Name */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-medium">Workspace</span>
        <span className="text-xs text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-900">{getPageTitle(pathname)}</span>
      </div>

      {/* Center: Search input */}
      <div className="flex items-center gap-3 w-80 max-w-sm hidden md:flex">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeWorkspace?.name || "content"}...`}
            className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 transition-colors"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5">
        <Link href="/create">
          <Button variant="primary" size="sm" className="gap-1.5 h-8 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" />
            <span>Create Content</span>
          </Button>
        </Link>
        <button
          type="button"
          aria-label="Notifications"
          className="h-8 w-8 rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors"
        >
          <Bell className="h-4 w-4" />
        </button>
        <div
          title={user?.email || "User"}
          className="h-8 w-8 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-xs font-bold text-orange-700 select-none"
        >
          {getInitials(user?.name)}
        </div>
      </div>
    </header>
  );
}
