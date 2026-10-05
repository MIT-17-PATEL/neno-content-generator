import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { WebsiteSyncService } from "@/lib/export/website-sync";
import { ContentService } from "@/services/content-service";
import { VersionService } from "@/services/version-service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || "ws_default_neno";

  const auth = await requireWorkspaceAccess(req, workspaceId);
  if ("error" in auth) return auth.error;

  const websiteCaseStudies = await WebsiteSyncService.listWebsiteCaseStudies();
  return NextResponse.json({
    success: true,
    websiteCaseStudies,
    count: websiteCaseStudies.length,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const workspaceId = body.workspaceId || "ws_default_neno";
    const action = body.action || "import";

    const wsAuth = await requireWorkspaceAccess(req, workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    if (action === "import") {
      const websiteCaseStudies = await WebsiteSyncService.listWebsiteCaseStudies();
      const existingStudioItems = await ContentService.listByWorkspace(workspaceId, { type: "case-study" });
      const existingSlugs = new Set(existingStudioItems.map((cs) => cs.slug));

      let importedCount = 0;
      for (const wcs of websiteCaseStudies) {
        if (!existingSlugs.has(wcs.slug)) {
          const item = await ContentService.create({
            workspaceId,
            type: "case-study",
            title: wcs.title || "Untitled Case Study",
            category: (wcs.category as string) || "Enterprise",
            excerpt: (wcs.description as string) || (wcs.shortDescription as string) || "",
            createdBy: auth.user.userId,
          });

          await ContentService.updateItem(workspaceId, item.id, {
            slug: wcs.slug,
            status: "approved",
          });

          const challenge = (wcs.challengeText as string) || "";
          const solution = (wcs.solutionText as string) || (wcs.content as string) || "";
          const metricsList = Array.isArray(wcs.metrics) ? wcs.metrics : [];
          const techStackList = Array.isArray(wcs.techStack) ? wcs.techStack : [];
          const imgUrl = (wcs.thumb as string) || (wcs.thumbFull as string) || "";

          let fullMarkdown = `# ${wcs.title}\n\n`;
          if (imgUrl) {
            fullMarkdown += `![Architecture & System Overview](${imgUrl})\n\n`;
          }
          if (wcs.description || wcs.shortDescription) {
            fullMarkdown += `${wcs.description || wcs.shortDescription}\n\n---\n\n`;
          }
          if (challenge) {
            fullMarkdown += `## 1. The Challenge\n\n${challenge}\n\n`;
          }
          if (solution) {
            fullMarkdown += `## 2. Engineered Solution & Architecture\n\n${solution}\n\n`;
          }
          if (metricsList.length > 0) {
            fullMarkdown += `## 3. Measurable Impact & Key Results\n\n` +
              metricsList.map((m: { label?: string; value?: string }) => `- **${m.value || ""}**: ${m.label || ""}`).join("\n") + "\n\n";
          }
          if (techStackList.length > 0) {
            fullMarkdown += `## 4. Technology Stack\n\n${techStackList.join(", ")}\n\n`;
          }

          const sections = [
            { id: "sec_1", type: "Text", title: "1. The Challenge", content: challenge || (wcs.description as string) || "" },
            { id: "sec_2", type: "Text", title: "2. Solution & Architecture", content: solution || "" },
            { id: "sec_3", type: "Results", title: "3. Measurable Impact", content: metricsList.map((m: { label?: string; value?: string }) => `- ${m.value}: ${m.label}`).join("\n") },
            { id: "sec_4", type: "Technology", title: "4. Technology Stack", content: techStackList.join(", ") },
          ];

          await VersionService.createVersion({
            contentId: item.id,
            content: fullMarkdown,
            seoMetadata: {
              seoTitle: (wcs.seoTitle as string) || wcs.title,
              metaDescription: (wcs.metaDescription as string) || (wcs.description as string) || (wcs.shortDescription as string),
              featuredImageBrief: imgUrl,
              ogImage: imgUrl,
              featuredImageUrl: imgUrl,
              coverImage: imgUrl,
              clientName: (wcs.clientOwner as string) || (wcs.client as string) || "Enterprise Client",
              author: (wcs.clientOwner as string) || (wcs.client as string) || "Enterprise Client",
              techStack: techStackList,
              impactMetrics: metricsList,
              sections: sections,
            },
            createdBy: auth.user.userId,
          });
          importedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Imported ${importedCount} case study item(s) from website`,
        importedCount,
      });
    }

    if (action === "delete-from-website") {
      const ids: string[] = body.ids || [];
      const slugs: string[] = body.slugs || [];
      const titles: string[] = body.titles || [];

      let deletedCount = 0;
      for (let i = 0; i < Math.max(ids.length, slugs.length, titles.length); i++) {
        const idOrSlug = ids[i] || slugs[i];
        const title = titles[i];
        if (idOrSlug || title) {
          const ok = await WebsiteSyncService.deleteCaseStudyFromWebsite(idOrSlug || title, title);
          if (ok) deletedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Deleted ${deletedCount} case study item(s) from website`,
        deletedCount,
      });
    }

    if (action === "purge-all-website") {
      const websiteCaseStudies = await WebsiteSyncService.listWebsiteCaseStudies();
      let purgedCount = 0;
      for (const wcs of websiteCaseStudies) {
        const ok = await WebsiteSyncService.deleteCaseStudyFromWebsite(wcs.id || wcs.slug, wcs.title);
        if (ok) purgedCount++;
      }
      return NextResponse.json({
        success: true,
        message: `Purged ${purgedCount} case study item(s) from website`,
        purgedCount,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Case study sync route error:", error);
    const msg = error instanceof Error ? error.message : "Sync operation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
