import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Layers,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const stats = [
    {
      title: "Total Content",
      value: "0",
      description: "Across all categories",
      icon: Layers,
      trend: "+0 this week",
    },
    {
      title: "Drafts",
      value: "0",
      description: "In progress or queued",
      icon: Clock,
      badge: "Drafts",
    },
    {
      title: "In Review",
      value: "0",
      description: "Awaiting human review",
      icon: BookOpen,
      badge: "Pending",
    },
    {
      title: "Approved & Exported",
      value: "0",
      description: "Production ready",
      icon: CheckCircle2,
      badge: "Approved",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-studio-800/60 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Content Dashboard
          </h1>
          <p className="text-sm text-studio-400 mt-1">
            Autonomous multi-agent content generation & editorial workspace
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/create?type=case-study">
            <Button variant="secondary" size="md">
              New Case Study
            </Button>
          </Link>
          <Link href="/create?type=blog">
            <Button variant="primary" size="md" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Create Blog Post</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="relative overflow-hidden">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-medium text-studio-400">
                  {stat.title}
                </span>
                <div className="p-2 rounded-lg bg-studio-800/80 text-studio-300">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white tracking-tight mt-1">
                {stat.value}
              </div>
              <p className="text-xs text-studio-500 mt-1">{stat.description}</p>
            </Card>
          );
        })}
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:border-studio-700 transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-brand-950/80 border border-brand-800/60 flex items-center justify-center text-brand-400 mb-2">
              <FileText className="h-5 w-5" />
            </div>
            <CardTitle>Autonomous Blog Generator</CardTitle>
            <CardDescription>
              Research, outline, write, and optimize full-length articles with SEO
              metadata, keyword strategy, and featured visual briefs.
            </CardDescription>
          </CardHeader>
          <div className="pt-2">
            <Link href="/create?type=blog">
              <Button variant="outline" size="sm" className="gap-2">
                <span>Configure Blog Workflow</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="hover:border-studio-700 transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-2">
              <TrendingUp className="h-5 w-5" />
            </div>
            <CardTitle>B2B Case Study Generator</CardTitle>
            <CardDescription>
              Transform client metrics, technical architectures, and business
              challenges into structured, high-conversion proof points.
            </CardDescription>
          </CardHeader>
          <div className="pt-2">
            <Link href="/create?type=case-study">
              <Button variant="outline" size="sm" className="gap-2">
                <span>Configure Case Study</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent Activity Table Placeholder */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Recent Content Items</CardTitle>
            <CardDescription>
              Drafts and generated assets requiring review
            </CardDescription>
          </div>
          <Badge variant="outline">0 Total Items</Badge>
        </CardHeader>
        <div className="border border-dashed border-studio-800 rounded-lg p-12 text-center">
          <p className="text-sm text-studio-400">
            No content generated yet in this workspace.
          </p>
          <p className="text-xs text-studio-500 mt-1">
            Start a new generation workflow above to begin producing research-backed articles.
          </p>
        </div>
      </Card>
    </div>
  );
}
