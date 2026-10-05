"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Newspaper,
  Briefcase,
  Search,
  Image as ImageIcon,
  Sliders,
  Trash2,
  Settings,
  Sparkles,
  LogOut,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth-context";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Create", href: "/create", icon: PlusCircle },
  { name: "Content", href: "/content", icon: FileText },
  { name: "Blog", href: "/blog", icon: Newspaper },
  { name: "Case Studies", href: "/case-studies", icon: Briefcase },
  { name: "Research", href: "/research", icon: Search },
  { name: "Media", href: "/media", icon: ImageIcon },
  { name: "Templates", href: "/templates", icon: Sliders },
  { name: "Trash", href: "/trash", icon: Trash2 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="w-60 border-r border-slate-200 bg-white flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200 gap-3">
        <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-sm shrink-0">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-sm tracking-tight text-slate-900 truncate">
            AI Content Studio
          </span>
          <span className="text-[11px] text-slate-500 truncate">Autonomous Workspace</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1">
        <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Workspace
        </div>
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-orange-50 text-orange-600 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-orange-600" : "text-slate-400")} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Workspace Switcher & User Account */}
      <div className="p-3 border-t border-slate-200 space-y-2 bg-slate-50/50">
        <WorkspaceSwitcher />

        {user && (
          <div className="flex items-center justify-between px-2 pt-1 border-t border-slate-200/60 mt-2">
            <div className="flex items-center gap-2 truncate">
              <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold shrink-0">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-700 truncate">{user.name}</span>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              title="Sign Out"
              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
