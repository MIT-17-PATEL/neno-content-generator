"use client";

import React from "react";
import Link from "next/link";
import { MapPin, Mail, ArrowRight, ShieldCheck } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800/80 relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-radial from-sky-500/10 via-indigo-500/5 to-transparent blur-3xl pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10 space-y-12">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/blog-with-sidebar" className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 p-[1px]">
                <div className="h-full w-full bg-slate-950 rounded-[11px] flex items-center justify-center font-bold text-sky-400 font-mono text-sm">
                  N
                </div>
              </div>
              <span className="font-bold text-lg text-white tracking-tight">Neno Technology</span>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Agentic AI engineering company building production-ready AI systems that scale. We embed senior
              Forward Deployed Engineers to architect, build, and ship custom enterprise AI workloads.
            </p>

            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-lg w-fit">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Recognized by <strong className="text-white font-semibold">Startup India</strong></span>
            </div>
          </div>

          {/* Company Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Company</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/blog-with-sidebar" className="hover:text-sky-400 transition-colors">
                  Research &amp; Blogs
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-sky-400 transition-colors">
                  Content Studio CMS
                </Link>
              </li>
              <li>
                <Link href="/create/blog" className="hover:text-sky-400 transition-colors">
                  AI Generator
                </Link>
              </li>
              <li>
                <a href="https://www.nenotechnology.com/about-us" target="_blank" rel="noopener noreferrer" className="hover:text-sky-400 transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="https://www.nenotechnology.com/careers" target="_blank" rel="noopener noreferrer" className="hover:text-sky-400 transition-colors">
                  Careers
                </a>
              </li>
            </ul>
          </div>

          {/* Services Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">AI Services</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="https://www.nenotechnology.com/services/agentic-ai-development" target="_blank" rel="noopener noreferrer" className="hover:text-sky-400 transition-colors">
                  Agentic AI Development
                </a>
              </li>
              <li>
                <a href="https://www.nenotechnology.com/services/ai-product-development" target="_blank" rel="noopener noreferrer" className="hover:text-sky-400 transition-colors">
                  AI Product Development
                </a>
              </li>
              <li>
                <a href="https://www.nenotechnology.com/services/llm-fine-tuning-deployment" target="_blank" rel="noopener noreferrer" className="hover:text-sky-400 transition-colors">
                  LLM Fine-Tuning &amp; Deploy
                </a>
              </li>
              <li>
                <a href="https://www.nenotechnology.com/services/vibe-coding-squads" target="_blank" rel="noopener noreferrer" className="hover:text-sky-400 transition-colors">
                  Vibe Coding Squads
                </a>
              </li>
            </ul>
          </div>

          {/* Stay Updated Newsletter */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Stay Updated</h4>
            <p className="text-xs text-slate-400">
              Get the latest AI research, latency benchmarks, and architectural blueprints.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Enter your work email"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold rounded-lg text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>Subscribe to Radar</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </form>
          </div>
        </div>

        {/* Global Offices Section */}
        <div className="pt-8 border-t border-slate-800/80 space-y-4">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Global Engineering Hubs</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0" />
                <span>Gandhinagar HQ</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                13th Floor, GIFT Tower One, GIFT City, Gandhinagar, Gujarat 382355
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0" />
                <span>Mumbai Office</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Mathuradas Mill Compound, Peninsula Spenta, Lower Parel, Mumbai 400013
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0" />
                <span>Ahmedabad Office</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Bhuyangdev, Sola Rd, Nr. Parshwanath Jain Mandir, Ahmedabad 380063
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0" />
                <span>United States</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                3838 Andrew Johnson Hwy, Limestone, TN 37681, United States
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Legal Row */}
        <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 Neno Technology. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="https://www.nenotechnology.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="https://www.nenotechnology.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300">
              Terms of Service
            </a>
            <span>•</span>
            <a href="https://www.nenotechnology.com/contact-us" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
