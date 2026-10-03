import Link from "next/link";
import { FileText, TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CreatePage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Create Content
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Select a content format and configure generation parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        {/* Blog Post Generator */}
        <Card className="hover:border-orange-300 hover:shadow-sm transition-all flex flex-col justify-between p-6">
          <CardHeader className="p-0 pb-4">
            <div className="h-10 w-10 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 mb-3">
              <FileText className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg text-slate-900">Blog Post</CardTitle>
            <CardDescription className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Research-backed technical articles, guides, and opinion pieces with SEO metadata and structured headings.
            </CardDescription>
          </CardHeader>
          <div className="pt-4 border-t border-slate-100">
            <Link href="/create/blog">
              <Button variant="primary" size="default" className="w-full gap-2 font-semibold h-9">
                <span>Configure Blog Post</span>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Case Study Generator */}
        <Card className="hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between p-6">
          <CardHeader className="p-0 pb-4">
            <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 mb-3">
              <TrendingUp className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg text-slate-900">Case Study</CardTitle>
            <CardDescription className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Customer success stories detailing business challenges, architectural solutions, and quantified results.
            </CardDescription>
          </CardHeader>
          <div className="pt-4 border-t border-slate-100">
            <Link href="/create/case-study">
              <Button variant="outline" size="default" className="w-full gap-2 font-semibold h-9 hover:border-slate-400">
                <span>Configure Case Study</span>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
