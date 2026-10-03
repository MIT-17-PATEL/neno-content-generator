import Link from "next/link";
import { FileText, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CreatePage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Create New Content
        </h1>
        <p className="text-sm text-studio-400 mt-1">
          Select an autonomous multi-agent content generation engine
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Blog Post Generator (Phase 4 Ready) */}
        <Card className="hover:border-brand-500/60 transition-all flex flex-col justify-between p-6 bg-studio-900/60">
          <CardHeader className="p-0 pb-4">
            <div className="h-12 w-12 rounded-xl bg-brand-950/80 border border-brand-800/60 flex items-center justify-center text-brand-400 mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">Autonomous Blog Generator</CardTitle>
            <CardDescription className="mt-2 text-sm leading-relaxed text-studio-400">
              Full autonomous multi-agent pipeline: Research Agent → Content Strategist →
              Writer Agent → SEO Optimizer → QA Reviewer → Image Prompter.
            </CardDescription>
          </CardHeader>
          <div className="pt-4">
            <Link href="/create/blog">
              <Button variant="primary" size="md" className="w-full gap-2">
                <Sparkles className="h-4 w-4" />
                <span>Launch Blog Generator</span>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Case Study Generator (Coming in Phase 7) */}
        <Card className="hover:border-emerald-500/40 transition-all flex flex-col justify-between p-6 bg-studio-900/60">
          <CardHeader className="p-0 pb-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-3">
              <TrendingUp className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">B2B Case Study Generator</CardTitle>
            <CardDescription className="mt-2 text-sm leading-relaxed text-studio-400">
              Transform technical architectures, business challenges, and ROI metrics
              into structured, high-conversion proof points.
            </CardDescription>
          </CardHeader>
          <div className="pt-4">
            <Button variant="secondary" size="md" className="w-full gap-2" disabled>
              <Sparkles className="h-4 w-4" />
              <span>Coming in Phase 7</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
