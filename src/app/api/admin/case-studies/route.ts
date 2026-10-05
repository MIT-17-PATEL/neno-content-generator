import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { ContentService } from "@/services/content-service";
import { VersionService } from "@/services/version-service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || "ws_default_neno";

  const auth = await requireWorkspaceAccess(req, workspaceId);
  if ("error" in auth) return auth.error;

  const status = searchParams.get("status") || undefined;
  const industry = searchParams.get("industry") || undefined;
  const search = searchParams.get("search") || undefined;
  const sort = searchParams.get("sort") || "newest";

  const rawItems = await ContentService.listByWorkspace(workspaceId, {
    type: "case-study",
    status: status === "all" ? undefined : status,
    search,
  });

  let items = rawItems;
  if (industry && industry !== "all") {
    items = items.filter((item) =>
      item.category.toLowerCase().includes(industry.toLowerCase())
    );
  }

  // Sorting
  if (sort === "oldest") {
    items = [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else if (sort === "az") {
    items = [...items].sort((a, b) => a.title.localeCompare(b.title));
  } else if (sort === "za") {
    items = [...items].sort((a, b) => b.title.localeCompare(a.title));
  } else {
    items = [...items].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  // Stats
  const allStudies = await ContentService.listByWorkspace(workspaceId, { type: "case-study" });
  const stats = {
    total: allStudies.length,
    published: allStudies.filter((b) => b.status === "approved" || b.status === "exported").length,
    drafts: allStudies.filter((b) => b.status === "draft" || b.status === "generating").length,
    scheduled: allStudies.filter((b) => b.status === "in_review").length,
  };

  return NextResponse.json({
    items,
    stats,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const workspaceId = body.workspaceId || "ws_default_neno";

    const wsAuth = await requireWorkspaceAccess(req, workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const item = await ContentService.create({
      workspaceId,
      type: "case-study",
      title: body.title,
      category: body.industry || body.category || "Enterprise AI & Cloud",
      excerpt: body.shortDescription || body.excerpt || "",
      createdBy: auth.user.userId,
    });

    if (body.slug) {
      await ContentService.updateItem(workspaceId, item.id, { slug: body.slug });
      item.slug = body.slug;
    }

    // Serialize modular sections into structured markdown
    const sections = Array.isArray(body.sections) ? body.sections : [];
    let compiledContent = `# Case Study: ${item.title}\n\n> **Client**: ${body.clientName || "Enterprise Client"}\n> **Industry**: ${item.category}\n> **Location**: ${body.location || "Global"}\n\n`;

    if (sections.length > 0) {
      for (const sec of sections) {
        compiledContent += `## ${sec.title || sec.type}\n\n${sec.content || ""}\n\n`;
      }
    } else {
      compiledContent += body.content || "## 1. Executive Summary\n\nDetailed breakdown of customer implementation and business impact.";
    }

    const version = await VersionService.createVersion({
      contentId: item.id,
      content: compiledContent,
      seoMetadata: {
        clientName: body.clientName || "",
        industry: body.industry || item.category,
        location: body.location || "",
        coverImage: body.coverImage || "",
        featuredImageBrief: body.coverImage || "",
        sections: sections,
        techStack: body.techStack || "",
        impactMetrics: body.impactMetrics || [],
      },
      createdBy: auth.user.userId,
    });

    if (body.status === "Published" || body.status === "approved" || body.publishNow) {
      await ContentService.updateStatus(workspaceId, item.id, "approved");
      item.status = "approved";
    }

    return NextResponse.json({
      success: true,
      item,
      version,
    });
  } catch (error: unknown) {
    console.error("Admin case study creation error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create case study";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
