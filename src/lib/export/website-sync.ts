import { ContentItem, ContentVersion } from "@/types";
import { ExportFormatter } from "@/lib/export/export-formatter";
import { dataStore } from "@/server/data-store";

export interface WebsiteSyncResult {
  success: boolean;
  publishedToWebsite: boolean;
  endpointUsed?: string;
  websiteUrl?: string;
  errorDetail?: string | null;
  response?: unknown;
}

export class WebsiteSyncService {
  private static getBaseConfig() {
    const websiteBaseUrl = (
      process.env.NENO_WEBSITE_URL ||
      process.env.NENO_WEBSITE_API_URL ||
      "http://localhost:3000"
    ).replace(/\/+$/, "").replace(/\/api\/admin\/blogs$/, "").replace(/\/api\/blogs$/, "");

    const adminEmail =
      process.env.NENO_WEBSITE_ADMIN_EMAIL ||
      "mitpatel@nenotechnology.com";
    const adminPassword =
      process.env.NENO_WEBSITE_ADMIN_PASSWORD ||
      "mitlalo";
    const sessionCookie = process.env.NENO_ADMIN_SESSION || "";

    return { websiteBaseUrl, adminEmail, adminPassword, sessionCookie };
  }

  public static async getSessionCookie(): Promise<string> {
    const { websiteBaseUrl, adminEmail, adminPassword, sessionCookie } = this.getBaseConfig();
    if (sessionCookie) return sessionCookie;

    const credentialPairs = [
      { email: adminEmail, password: adminPassword },
      { email: "mitpatel@nenotechnology.com", password: "mitlalo" },
      { email: "admin@neno.tech", password: "admin123" },
      { email: "admin@neno.tech", password: "YOUR_ADMIN_PASSWORD" },
    ];

    for (const cred of credentialPairs) {
      try {
        const authRes = await fetch(`${websiteBaseUrl}/api/admin/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cred),
        });

        if (authRes.ok) {
          const setCookieHeader = authRes.headers.get("set-cookie");
          if (setCookieHeader) {
            const match = setCookieHeader.match(/neno-admin-session=([^;]+)/);
            return match ? `neno-admin-session=${match[1]}` : setCookieHeader.split(";")[0];
          }
        }
      } catch (err) {
        console.warn(`Website auth handshake failed for ${cred.email}:`, err);
      }
    }
    return "";
  }

  static async listWebsiteBlogs(): Promise<Array<{ id: string; title: string; slug: string; category?: string; [key: string]: unknown }>> {
    const { websiteBaseUrl } = this.getBaseConfig();
    try {
      const response = await fetch(`${websiteBaseUrl}/api/blogs`, {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : data?.blogs || [];
      }
    } catch (err) {
      console.warn("Could not list website blogs:", err);
    }
    return [];
  }

  static async publishBlog(
    item: ContentItem,
    version: ContentVersion,
    workspaceId: string,
    authorName?: string
  ): Promise<WebsiteSyncResult> {
    const { websiteBaseUrl } = this.getBaseConfig();
    const sessionCookie = await this.getSessionCookie();

    const brand = await dataStore.getBrandSettings(workspaceId);
    const brandName = brand?.brand_name || "Neno Technology";

    const exportResult = ExportFormatter.format({
      item,
      version,
      format: "json",
      brandName,
      authorName: authorName || "Neno AI Lab",
    });

    const blogPayload = JSON.parse(exportResult.content);
    const cleanCategory = ExportFormatter.cleanCategoryName(item.category);
    const cleanContent = ExportFormatter.formatCleanArticleMarkdown(version.content, item.title);

    const rawImgUrl =
      version.seoMetadata?.featuredImageUrl ||
      version.seoMetadata?.ogImage ||
      version.seoMetadata?.coverImage ||
      (version.seoMetadata?.featuredImageBrief?.startsWith("http") || version.seoMetadata?.featuredImageBrief?.startsWith("data:")
        ? version.seoMetadata.featuredImageBrief
        : "") ||
      "";

    const featuredImgUrl = await this.resolveFeaturedImage(rawImgUrl, item.title);

    const targetPayload = {
      title: item.title,
      slug: item.slug,
      category: cleanCategory,
      author: authorName || brandName || "Neno AI Lab",
      shortDescription: item.excerpt || "",
      content: cleanContent,
      blogContent: cleanContent,
      status: "Published",
      publishDate: blogPayload.publishDate,
      readingTime: blogPayload.readingTime,
      thumb: featuredImgUrl,
      thumbFull: featuredImgUrl,
      buttonText: "Read Article",
      buttonLink: `/blog-single/${item.slug}`,
    };

    const targetEndpoint = `${websiteBaseUrl}/api/admin/blogs`;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionCookie) headers["Cookie"] = sessionCookie;

      const response = await fetch(targetEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(targetPayload),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({ success: true }));
        return {
          success: true,
          publishedToWebsite: true,
          endpointUsed: targetEndpoint,
          websiteUrl: `${websiteBaseUrl}/blog-single/${item.slug}`,
          response: data,
        };
      }

      // If already exists (409), perform PUT update
      if (response.status === 409) {
        const updateEndpoint = `${websiteBaseUrl}/api/admin/blogs/${encodeURIComponent(item.slug)}`;
        const putRes = await fetch(updateEndpoint, {
          method: "PUT",
          headers,
          body: JSON.stringify(targetPayload),
        });
        if (putRes.ok) {
          return {
            success: true,
            publishedToWebsite: true,
            endpointUsed: updateEndpoint,
            websiteUrl: `${websiteBaseUrl}/blog-single/${item.slug}`,
          };
        }
      }

      const errBody = await response.text().catch(() => "");
      return {
        success: false,
        publishedToWebsite: false,
        endpointUsed: targetEndpoint,
        errorDetail: `Website rejected publish (${response.status}): ${errBody || response.statusText}`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        publishedToWebsite: false,
        endpointUsed: targetEndpoint,
        errorDetail: `Could not connect to ${targetEndpoint}: ${msg}`,
      };
    }
  }

  static async unpublishBlog(item: ContentItem): Promise<WebsiteSyncResult> {
    const { websiteBaseUrl } = this.getBaseConfig();
    const sessionCookie = await this.getSessionCookie();

    const targetEndpoint = `${websiteBaseUrl}/api/admin/blogs/${encodeURIComponent(item.slug)}`;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionCookie) headers["Cookie"] = sessionCookie;

      const response = await fetch(targetEndpoint, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: "Draft" }),
      });

      if (response.ok) {
        return { success: true, publishedToWebsite: false, endpointUsed: targetEndpoint };
      }
      return { success: false, publishedToWebsite: false, errorDetail: `Unpublish returned ${response.status}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, publishedToWebsite: false, errorDetail: msg };
    }
  }

  static async deleteFromWebsite(slugOrId: string, title?: string): Promise<boolean> {
    const { websiteBaseUrl } = this.getBaseConfig();
    const sessionCookie = await this.getSessionCookie();
    if (!sessionCookie) return false;

    const headers: Record<string, string> = {
      Cookie: sessionCookie,
      "Content-Type": "application/json",
    };

    let deleted = false;

    // 1. Try direct DELETE by the identifier
    try {
      const res = await fetch(`${websiteBaseUrl}/api/admin/blogs/${encodeURIComponent(slugOrId)}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) deleted = true;
    } catch {
      // Continue to search
    }

    // 2. Fetch live website blogs to find matching records by UUID, slug, or title
    try {
      const liveBlogs = await this.listWebsiteBlogs();
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const targetSlugNorm = normalize(slugOrId);
      const targetTitleNorm = title ? normalize(title) : "";

      for (const b of liveBlogs) {
        const idMatches = b.id === slugOrId;
        const slugMatches = b.slug === slugOrId || (b.slug && normalize(b.slug) === targetSlugNorm);
        const titleMatches = targetTitleNorm && b.title && normalize(b.title) === targetTitleNorm;

        if (idMatches || slugMatches || titleMatches) {
          const deleteId = b.id || b.slug;
          if (deleteId) {
            const delRes = await fetch(`${websiteBaseUrl}/api/admin/blogs/${encodeURIComponent(deleteId)}`, {
              method: "DELETE",
              headers,
            });
            if (delRes.ok) deleted = true;
          }
        }
      }
    } catch (err) {
      console.warn("Error during website blog lookup & delete:", err);
    }

    return deleted;
  }

  static async listWebsiteCaseStudies(): Promise<Array<{ id: string; title: string; slug: string; category?: string; [key: string]: unknown }>> {
    const { websiteBaseUrl } = this.getBaseConfig();
    try {
      const response = await fetch(`${websiteBaseUrl}/api/case-studies`, {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : data?.data || data?.items || data?.caseStudies || [];
      }
    } catch (err) {
      console.warn("Could not list website case studies:", err);
    }
    return [];
  }

  static async publishCaseStudy(
    item: { id: string; title: string; slug: string; category?: string; excerpt?: string },
    version: { content: string; seo_metadata?: unknown; seoMetadata?: unknown },
    workspaceId: string
  ): Promise<WebsiteSyncResult> {
    const { websiteBaseUrl } = this.getBaseConfig();
    const sessionCookie = await this.getSessionCookie();

    const brand = await dataStore.getBrandSettings(workspaceId);
    const brandName = brand?.brand_name || "Neno Technology";

    const cleanContent = ExportFormatter.formatCleanArticleMarkdown(version.content, item.title);
    const seo = ((version.seo_metadata || version.seoMetadata || {}) as Record<string, unknown>);

    const sections = (seo.sections as Array<{ title?: string; content?: string }>) || [];
    const challengeSection = sections.find((s) => s.title?.toLowerCase().includes("challenge"));
    const solutionSection = sections.find((s) => s.title?.toLowerCase().includes("solution") || s.title?.toLowerCase().includes("architecture"));

    const rawMetrics = seo.impactMetrics;
    const metricsList = Array.isArray(rawMetrics) && rawMetrics.length > 0
      ? rawMetrics
      : [
          { label: "Cost & Latency Reduction", value: "85%" },
          { label: "Throughput Acceleration", value: "4.2x" },
          { label: "Deployment Accuracy", value: "99.4%" },
        ];

    const rawTech = seo.techStack;
    const techStackList = Array.isArray(rawTech)
      ? rawTech
      : typeof rawTech === "string" && rawTech.trim()
      ? rawTech.split(/[,+]/).map((t: string) => t.trim()).filter(Boolean)
      : ["Next.js", "AI Architecture", "Enterprise Cloud"];

    const targetPayload = {
      title: item.title,
      slug: item.slug,
      category: item.category || "AI Architecture",
      clientOwner: (seo.clientName as string) || (seo.author as string) || "Global Enterprise",
      client: (seo.clientName as string) || (seo.author as string) || "Global Enterprise",
      description: item.excerpt || "",
      shortDescription: item.excerpt || "",
      challengeText: (seo.challengeText as string) || challengeSection?.content || item.excerpt || "",
      solutionText: (seo.solutionText as string) || solutionSection?.content || cleanContent.slice(0, 500),
      content: cleanContent,
      techStack: techStackList,
      tags: [item.category || "AI Deployment", "Enterprise Scale"],
      metrics: metricsList,
      status: "published",
      thumb: "",
      thumbFull: "",
      ctaText: "Discuss Similar Project",
      ctaLink: "/contact-us",
    };

    const targetEndpoint = `${websiteBaseUrl}/api/admin/case-studies`;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionCookie) headers["Cookie"] = sessionCookie;

      const response = await fetch(targetEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(targetPayload),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({ success: true }));
        return {
          success: true,
          publishedToWebsite: true,
          endpointUsed: targetEndpoint,
          websiteUrl: `${websiteBaseUrl}/case-studies/${item.slug}`,
          response: data,
        };
      }

      const errBody = await response.text().catch(() => "");
      return {
        success: false,
        publishedToWebsite: false,
        endpointUsed: targetEndpoint,
        errorDetail: `Website rejected case study publish (${response.status}): ${errBody || response.statusText}`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        publishedToWebsite: false,
        endpointUsed: targetEndpoint,
        errorDetail: `Could not connect to ${targetEndpoint}: ${msg}`,
      };
    }
  }

  static async unpublishCaseStudy(item: ContentItem): Promise<WebsiteSyncResult> {
    const { websiteBaseUrl } = this.getBaseConfig();
    const sessionCookie = await this.getSessionCookie();

    const targetEndpoint = `${websiteBaseUrl}/api/admin/case-studies/${encodeURIComponent(item.slug)}`;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionCookie) headers["Cookie"] = sessionCookie;

      const response = await fetch(targetEndpoint, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: "draft" }),
      });

      if (response.ok) {
        return { success: true, publishedToWebsite: false, endpointUsed: targetEndpoint };
      }
      return { success: false, publishedToWebsite: false, errorDetail: `Unpublish returned ${response.status}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, publishedToWebsite: false, errorDetail: msg };
    }
  }

  static async deleteCaseStudyFromWebsite(slugOrId: string, title?: string): Promise<boolean> {
    const { websiteBaseUrl } = this.getBaseConfig();
    const sessionCookie = await this.getSessionCookie();
    if (!sessionCookie) return false;

    const headers: Record<string, string> = {
      Cookie: sessionCookie,
      "Content-Type": "application/json",
    };

    let deleted = false;

    // 1. Direct DELETE by identifier
    try {
      const res = await fetch(`${websiteBaseUrl}/api/admin/case-studies/${encodeURIComponent(slugOrId)}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) deleted = true;
    } catch {
      // Continue to search
    }

    // 2. Lookup in live case studies list by UUID, slug, or title
    try {
      const liveCaseStudies = await this.listWebsiteCaseStudies();
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const targetSlugNorm = normalize(slugOrId);
      const targetTitleNorm = title ? normalize(title) : "";

      for (const cs of liveCaseStudies) {
        const idMatches = cs.id === slugOrId;
        const slugMatches = cs.slug === slugOrId || (cs.slug && normalize(cs.slug) === targetSlugNorm);
        const titleMatches = targetTitleNorm && cs.title && normalize(cs.title) === targetTitleNorm;

        if (idMatches || slugMatches || titleMatches) {
          const deleteId = cs.id || cs.slug;
          if (deleteId) {
            const delRes = await fetch(`${websiteBaseUrl}/api/admin/case-studies/${encodeURIComponent(deleteId)}`, {
              method: "DELETE",
              headers,
            });
            if (delRes.ok) deleted = true;
          }
        }
      }
    } catch (err) {
      console.warn("Error during website case study lookup & delete:", err);
    }

    return deleted;
  }

  private static async resolveFeaturedImage(rawUrl: string | undefined, title: string): Promise<string> {
    if (rawUrl && (rawUrl.startsWith("data:") || rawUrl.startsWith("http://") || rawUrl.startsWith("https://"))) {
      return rawUrl;
    }

    if (rawUrl && (rawUrl.startsWith("/uploads/") || rawUrl.startsWith("uploads/"))) {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const localPath = path.join(process.cwd(), "public", rawUrl.replace(/^\/+/, ""));
        if (fs.existsSync(localPath)) {
          const fileBuf = fs.readFileSync(localPath);
          const ext = path.extname(localPath).toLowerCase();
          const mime = ext === ".svg" ? "image/svg+xml" : ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
          return `data:${mime};base64,${fileBuf.toString("base64")}`;
        }
      } catch (err) {
        console.warn("Could not read local image file for conversion:", err);
      }
    }

    // Generate dynamic vector artwork fallback
    try {
      const { ImageGenerator } = await import("@/lib/ai/image-generator");
      const generated = await ImageGenerator.generate({
        topic: title || "Enterprise Engineering",
        articleType: "blog",
        aspectRatio: "16:9",
      });
      return generated.publicUrl;
    } catch {
      return "";
    }
  }
}
