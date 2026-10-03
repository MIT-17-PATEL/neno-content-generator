"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Layers,
  Plus,
  Eye,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ContentItem } from "@/types";

export default function DashboardPage() {
  const { user, activeWorkspace } = useAuth();
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "published":
      case "exported":
        return <Badge variant="success">Published</Badge>;
      case "in_review":
        return <Badge variant="warning">In Review</Badge>;
      case "generating":
        return <Badge variant="primary">Generating</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Create, manage, and review autonomous content for{" "}
            <span className="font-semibold text-slate-700">{activeWorkspace?.name || "your workspace"}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/create">
            <Button variant="primary" size="default" className="gap-1.5 h-9 font-semibold">
              <Plus className="h-4 w-4" />
              <span>Create Content</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row (Compact Stat Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Content */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Content</span>
            <Layers className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {isLoading ? "—" : stats.total}
            </div>
            <p className="text-xs text-slate-500 mt-1">Across all categories</p>
          </div>
        </Card>

        {/* Drafts */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Drafts</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {isLoading ? "—" : stats.drafts}
            </div>
            <p className="text-xs text-slate-500 mt-1">In progress & queued</p>
          </div>
        </Card>

        {/* In Review */}
        <Card className="p-5 flex flex-col justify-between border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">In Review</span>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {isLoading ? "—" : stats.inReview}
            </div>
            <p className="text-xs text-slate-500 mt-1">Awaiting editorial review</p>
          </div>
        </Card>

        {/* Published */}
        <Card className="p-5 flex flex-col justify-between border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Published</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {isLoading ? "—" : stats.approved}
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-1">Production ready</p>
          </div>
        </Card>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 hover:border-slate-300 transition-colors">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-900">Blog Post Generator</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Generate structured, SEO-optimized technical blog posts and industry articles with verified citations.
              </p>
              <div className="pt-2">
                <Link href="/create?type=blog">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <span>New Blog Post</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 hover:border-slate-300 transition-colors">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-900">Case Study Generator</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Formulate data-driven customer success stories with challenge, solution, and impact metrics.
              </p>
              <div className="pt-2">
                <Link href="/create?type=case-study">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <span>New Case Study</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Content Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-5 border-b border-slate-100">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Recent Content
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Latest documents in {activeWorkspace?.name || "Workspace"}
            </CardDescription>
          </div>
          <Link href="/content">
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-slate-600 hover:text-slate-900">
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading content...</div>
          ) : recentItems.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-medium text-slate-700">No content items found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Get started by creating your first article or generating a case study.
              </p>
              <Link href="/create">
                <Button variant="primary" size="sm" className="mt-4 gap-1.5 h-8 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Content</span>
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentItems.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs text-slate-400 font-mono">
                      {(idx + 1).toString().padStart(2, "0")}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      <Link
                        href={`/content/${item.id}`}
                        className="hover:text-orange-600 transition-colors line-clamp-1"
                      >
                        {item.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs capitalize text-slate-600">
                      {item.type.replace("-", " ")}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {item.category}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(item.updatedAt || Date.now()).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/content/${item.id}`}>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
