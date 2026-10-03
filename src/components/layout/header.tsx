import { Bell, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="h-16 border-b border-studio-800/80 bg-studio-950/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4 w-96">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-studio-500" />
          <input
            type="text"
            placeholder="Search content, drafts, or sources..."
            className="w-full bg-studio-900/60 border border-studio-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-studio-200 placeholder-studio-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-3.5 w-3.5 text-brand-400" />
          <span>New Generation</span>
        </Button>
        <button
          type="button"
          aria-label="Notifications"
          className="p-2 rounded-lg border border-studio-800 text-studio-400 hover:text-white hover:bg-studio-900 transition-colors"
        >
          <Bell className="h-4 w-4" />
        </button>
        <div className="h-8 w-8 rounded-full bg-brand-700/60 border border-brand-500/40 flex items-center justify-center text-xs font-semibold text-white">
          MP
        </div>
      </div>
    </header>
  );
}
