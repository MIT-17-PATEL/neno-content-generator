"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, PhoneCall, Sparkles, ChevronRight, Layers, ArrowRight } from "lucide-react";

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? "py-3 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/60 shadow-2xl" : "py-5 bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between">
            {/* Brand Logo */}
            <Link href="/blog-with-sidebar" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <div className="h-full w-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                  <span className="font-bold font-mono text-sm bg-gradient-to-r from-sky-400 to-indigo-300 bg-clip-text text-transparent">
                    N
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-white group-hover:text-sky-400 transition-colors">
                  Neno Technology
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase -mt-0.5">
                  Research &amp; AI Engineering
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 px-4 py-1.5 rounded-full shadow-inner">
              <Link
                href="/blog-with-sidebar"
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  pathname === "/blog-with-sidebar" || pathname.startsWith("/blog-with-sidebar") || pathname.startsWith("/blog/")
                    ? "bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-xs"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                Research &amp; Blogs
              </Link>
              <Link
                href="/"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-full text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all"
              >
                Dashboard
              </Link>
              <Link
                href="/blog"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-full text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all flex items-center gap-1"
              >
                <Layers className="h-3 w-3 text-orange-400" />
                <span>Content Studio</span>
              </Link>
              <Link
                href="/create/blog"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-full text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>Create Blog</span>
              </Link>
            </div>

            {/* Right Action CTAs */}
            <div className="hidden sm:flex items-center gap-3">
              <Link
                href="/blog"
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <span>CMS Admin</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
              <a
                href="https://www.nenotechnology.com/contact-us"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.02]"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                <span>Book A Call</span>
              </a>
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </nav>
        </div>

        {/* Mobile Slide-down Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-950 border-b border-slate-800/80 px-5 py-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
            <div className="flex flex-col space-y-2">
              <Link
                href="/blog-with-sidebar"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20"
              >
                Research &amp; Blogs
              </Link>
              <Link
                href="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-900"
              >
                Content Studio Blog CMS
              </Link>
              <Link
                href="/create/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-900"
              >
                Create New Post
              </Link>
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-900"
              >
                Studio Dashboard
              </Link>
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              <a
                href="https://www.nenotechnology.com/contact-us"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-2.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600 shadow-md shadow-sky-500/20"
              >
                Book A Call With An FDE
              </a>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
