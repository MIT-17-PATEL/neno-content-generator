"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Plus,
  Eye,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContentItem } from "@/types";

export default function DashboardPage() {
  const { activeWorkspace } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    drafts: 0,
    inReview: 0,
    approved: 0,
  });
  const [recentItems, setRecentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!activeWorkspace) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/stats?workspaceId=${activeWorkspace.id}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentItems(data.recent || []);
      }
    } catch (err) {
      console.error("Dashboard stats error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const statCards = [
    {
      title: "Total Content",
      value: stats.total.toString(),
      description: "Across all categories",
      icon: Layers,
    },
    {
      title: "Drafts & Generating",
      value: stats.drafts.toString(),
      description: "In progress or queued",
      icon: Clock,
    },
    {
      title: "In Review",
      value: stats.inReview.toString(),
      description: "Awaiting human review",
      icon: BookOpen,
    },
    {
      title: "Approved & Exported",
      value: stats.approved.toString(),
      description: "Production ready",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome / Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-studio-800/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Content Dashboard
            </h1>
            <Badge variant="info">{activeWorkspace?.name || "Workspace"}</Badge>
          </div>
          <p className="text-sm text-studio-400">
            Autonomous multi-agent content generation & editorial control center
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
        {statCards.map((stat) => {
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
                {isLoading ? "..." : stat.value}
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

      {/* Recent Activity Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Recent Content Items</CardTitle>
            <CardDescription>
              Articles and case studies in <strong>{activeWorkspace?.name}</strong>
            </CardDescription>
          </div>
          <Link href="/content">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-studio-500">
            Loading dashboard data...
          </div>
        ) : recentItems.length === 0 ? (
          <div className="border border-dashed border-studio-800 rounded-lg p-12 text-center">
            <p className="text-sm text-studio-400">
              No content items generated yet in this workspace.
            </p>
            <p className="text-xs text-studio-500 mt-1">
              Start by creating a new manual draft or initiating an autonomous generation workflow above.
            </p>
            <Link href="/content">
              <Button variant="primary" size="sm" className="mt-4 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                <span>Create Content Item</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-lg border border-studio-800 bg-studio-950/60 hover:border-studio-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-7 w-7 rounded flex items-center justify-center shrink-0 ${
                      item.type === "blog"
                        ? "bg-brand-950 text-brand-400"
                        : "bg-emerald-950 text-emerald-400"
                    }`}
                  >
                    {item.type === "blog" ? (
                      <FileText className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingUp className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/content/${item.id}`}
                      className="text-xs font-semibold text-white hover:text-brand-400 transition-colors truncate block"
                    >
                      {item.title}
                    </Link>
                    <span className="text-[11px] text-studio-500">
                      Category: {item.category} • Updated:{" "}
                      {new Date(item.updatedAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={item.status === "approved" ? "success" : item.status === "in_review" ? "warning" : "outline"}>
                    {item.status.replace("_", " ")}
                  </Badge>
                  <Link href={`/content/${item.id}`}>
                    <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
