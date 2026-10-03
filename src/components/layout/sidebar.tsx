"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Search,
  Image as ImageIcon,
  Sliders,
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
  { name: "Research", href: "/research", icon: Search },
  { name: "Media", href: "/media", icon: ImageIcon },
  { name: "Templates", href: "/templates", icon: Sliders },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="w-64 border-r border-studio-800/80 bg-studio-950/60 backdrop-blur-md flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-studio-800/80 gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-brand-900/40">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm tracking-tight text-white">
            AI Content Studio
          </span>
          <span className="text-[11px] text-studio-400">Autonomous Workspace</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-studio-500">
          Navigation
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-600/15 text-brand-400 border border-brand-500/20"
                  : "text-studio-400 hover:text-studio-100 hover:bg-studio-900/80"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Workspace Switcher & User Account */}
      <div className="p-3 border-t border-studio-800/80 space-y-3">
        <WorkspaceSwitcher />

        {user && (
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2 truncate">
              <UserCheck className="h-3.5 w-3.5 text-brand-400 shrink-0" />
              <span className="text-xs text-studio-300 truncate">{user.name}</span>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              title="Sign Out"
              className="p-1 rounded text-studio-500 hover:text-red-400 hover:bg-studio-900 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
