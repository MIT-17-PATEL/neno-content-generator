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

const PUBLISH_TIMEOUT_MS = 60000;

export class WebsiteSyncService {
  public static getBaseConfig() {
    const websiteBaseUrl = (
      process.env.NENO_WEBSITE_URL ||
      process.env.NENO_WEBSITE_API_URL ||
      "http://localhost:3001"
    )
      .replace(/\/+$/, "")
      .replace(/\/api\/admin\/blogs$/, "")
      .replace(/\/api\/blogs$/, "")
      .replace(/\/api\/integrations\/content-engine\/blogs$/, "");

    const apiKey =
      process.env.CONTENT_ENGINE_API_KEY ||
      process.env.NENO_CONTENT_ENGINE_API_KEY ||
      "";

    return { websiteBaseUrl, apiKey };
  }

  public static getTargetWebsiteUrl(): string {
    return this.getBaseConfig().websiteBaseUrl;
  }

  /**
   * Refuse sync if NENO_WEBSITE_URL points to this application's own port
   */
  public static validateTargetUrl(urlStr?: string): { valid: boolean; reason?: string } {
    const rawUrl = urlStr || this.getBaseConfig().websiteBaseUrl;
    try {
      const parsed = new URL(rawUrl);
      const isLoopback =
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "0.0.0.0" ||
        parsed.hostname === "::1";

      const currentPort = process.env.PORT || "3000";
      const targetPort = parsed.port || (parsed.protocol === "https:" ? "443" : "80");

      if (isLoopback && targetPort === currentPort) {
        const errorMsg = `[WebsiteSyncService] CONFIGURATION ERROR: NENO_WEBSITE_URL (${rawUrl}) points to Content Engine's own port (${currentPort}). The website must run on a separate port (e.g., http://localhost:3001) or production URL (https://www.nenotechnology.com). Refusing to sync to avoid self-loopback.`;
        console.error(errorMsg);
        return { valid: false, reason: errorMsg };
      }
      return { valid: true };
    } catch {
      const err = `[WebsiteSyncService] Invalid NENO_WEBSITE_URL configured: "${rawUrl}"`;
      console.error(err);
      return { valid: false, reason: err };
    }
  }

  /**
   * Fetch live blogs currently stored on the target website
   */
  static async listWebsiteBlogs(): Promise<Array<{ id: string; title: string; slug: string; category?: string; [key: string]: unknown }>> {
    const { websiteBaseUrl, apiKey } = this.getBaseConfig();
    const validation = this.validateTargetUrl(websiteBaseUrl);
    if (!validation.valid) {
      console.warn(validation.reason);
      return [];
    }

    const headers: Record<string, string> = { "Cache-Control": "no-cache" };
    if (apiKey) headers["x-api-key"] = apiKey;

    // 1. Try modern integration endpoint
    try {
      const response = await fetch(`${websiteBaseUrl}/api/integrations/content-engine/blogs`, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : data?.blogs || data?.items || [];
      }
    } catch {
      // Fall through to public endpoint
    }

    // 2. Fallback to public /api/blogs endpoint
    try {
      const response = await fetch(`${websiteBaseUrl}/api/blogs`, {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : data?.blogs || [];
      }
    } catch (err) {
      console.warn(`[WebsiteSyncService] Could not list website blogs from ${websiteBaseUrl}:`, err);
    }
    return [];
  }

  /**
   * Publish blog to the website using the dedicated integration endpoint:
   * POST /api/integrations/content-engine/blogs with header `x-api-key`
   * 60s timeout per attempt (the website uploads the image to S3, then writes via the
   * API Gateway Lambda), 1 retry, throws on failure. The website upserts by slug, so
   * a retry after a timeout cannot create a duplicate post.
   */
  static async publishBlog(
    item: ContentItem,
    version: ContentVersion,
    workspaceId: string,
    authorName?: string
  ): Promise<WebsiteSyncResult> {
    const { websiteBaseUrl, apiKey } = this.getBaseConfig();

    const validation = this.validateTargetUrl(websiteBaseUrl);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    if (!apiKey) {
      console.warn("[WebsiteSyncService] Warning: CONTENT_ENGINE_API_KEY is not defined in environment.");
    }

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
      publishDate: blogPayload.publishDate || new Date().toISOString().split("T")[0],
      readingTime: blogPayload.readingTime || "5 min read",
      thumb: featuredImgUrl,
      thumbFull: featuredImgUrl,
      buttonText: "Read Article",
      buttonLink: `/blog-single/${item.slug}`,
    };

    const targetEndpoint = `${websiteBaseUrl}/api/integrations/content-engine/blogs`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    };

    let lastError: Error | null = null;
    const maxAttempts = 2; // initial attempt + 1 retry

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PUBLISH_TIMEOUT_MS);

        const response = await fetch(targetEndpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(targetPayload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

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

        const errBody = await response.text().catch(() => "");
        const errMsg = `Website rejected publish (HTTP ${response.status} ${response.statusText}): ${errBody || "Empty response body"}`;
        lastError = new Error(errMsg);

        // Do not retry 4xx client errors (e.g. 401 unauthorized, 400 bad request)
        if (response.status >= 400 && response.status < 500 && response.status !== 408) {
          break;
        }
      } catch (err: unknown) {
        const isAbort = (err as { name?: string })?.name === "AbortError";
        const msg = isAbort
          ? `Request to ${targetEndpoint} timed out after ${PUBLISH_TIMEOUT_MS / 1000} seconds`
          : err instanceof Error ? err.message : String(err);
        lastError = new Error(msg);
      }

      if (attempt < maxAttempts) {
        console.warn(`[WebsiteSyncService] Publish attempt ${attempt} failed. Retrying in 1s...`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    throw lastError || new Error(`Failed to publish blog to ${targetEndpoint}`);
  }

  /**
   * Delete a blog from the website:
   * DELETE /api/integrations/content-engine/blogs/[slug] with header `x-api-key`
   * 15s timeout, 1 retry, throws on failure.
   */
  static async deleteFromWebsite(slugOrId: string, title?: string): Promise<boolean> {
    const { websiteBaseUrl, apiKey } = this.getBaseConfig();

    const validation = this.validateTargetUrl(websiteBaseUrl);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    const cleanSlug = encodeURIComponent(slugOrId.trim());
    const targetEndpoint = `${websiteBaseUrl}/api/integrations/content-engine/blogs/${cleanSlug}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    };

    let lastError: Error | null = null;
    const maxAttempts = 2; // initial + 1 retry

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(targetEndpoint, {
          method: "DELETE",
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok || response.status === 404) {
          // 200 OK or 404 (already deleted) are considered successful deletion
          return true;
        }

        const errBody = await response.text().catch(() => "");
        lastError = new Error(
          `Website rejected delete (HTTP ${response.status} ${response.statusText}): ${errBody || "Empty response body"}`
        );

        if (response.status >= 400 && response.status < 500 && response.status !== 408) {
          break;
        }
      } catch (err: unknown) {
        const isAbort = (err as { name?: string })?.name === "AbortError";
        const msg = isAbort
          ? `DELETE request to ${targetEndpoint} timed out after 15 seconds`
          : err instanceof Error ? err.message : String(err);
        lastError = new Error(msg);
      }

      if (attempt < maxAttempts) {
        console.warn(`[WebsiteSyncService] Delete attempt ${attempt} failed. Retrying in 1s...`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    throw lastError || new Error(`Failed to delete blog ${slugOrId} from ${targetEndpoint}`);
  }

  static async unpublishBlog(item: ContentItem): Promise<WebsiteSyncResult> {
    try {
      await this.deleteFromWebsite(item.slug);
      return { success: true, publishedToWebsite: false };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, publishedToWebsite: false, errorDetail: msg };
    }
  }

  static async listWebsiteCaseStudies(): Promise<Array<{ id: string; title: string; slug: string; category?: string; [key: string]: unknown }>> {
    const { websiteBaseUrl, apiKey } = this.getBaseConfig();
    try {
      const headers: Record<string, string> = { "Cache-Control": "no-cache" };
      if (apiKey) headers["x-api-key"] = apiKey;
      const response = await fetch(`${websiteBaseUrl}/api/case-studies`, {
        method: "GET",
        headers,
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
    const { websiteBaseUrl, apiKey } = this.getBaseConfig();

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
      if (apiKey) headers["x-api-key"] = apiKey;

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
    const { websiteBaseUrl, apiKey } = this.getBaseConfig();
    const targetEndpoint = `${websiteBaseUrl}/api/admin/case-studies/${encodeURIComponent(item.slug)}`;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["x-api-key"] = apiKey;

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
    const { websiteBaseUrl, apiKey } = this.getBaseConfig();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["x-api-key"] = apiKey;

    try {
      const res = await fetch(`${websiteBaseUrl}/api/admin/case-studies/${encodeURIComponent(slugOrId)}`, {
        method: "DELETE",
        headers,
      });
      return res.ok || res.status === 404;
    } catch {
      return false;
    }
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
