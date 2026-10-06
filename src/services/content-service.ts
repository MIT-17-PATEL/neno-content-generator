import crypto from "crypto";
import { DbContentItem, DbContentVersion } from "@/db/schema";
import { db } from "@/db/client";
import { VersionService } from "@/services/version-service";

export interface PublicBlogItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  status: string;
  author: string;
  readingTime: string;
  publishDate: string;
  thumb: string;
  content?: string;
  seoTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface PublicBlogListResult {
  items: PublicBlogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  categories: Array<{ name: string; count: number }>;
  featuredPost?: PublicBlogItem | null;
}

// In-memory persistent database store for local development without live PostgreSQL
const globalForContent = global as unknown as {
  memoryContent?: Map<string, DbContentItem>;
  hasInitialized?: boolean;
};
const memoryContent: Map<string, DbContentItem> =
  globalForContent.memoryContent || new Map<string, DbContentItem>();
globalForContent.memoryContent = memoryContent;

// Initialize initial demo articles if empty
if (!globalForContent.hasInitialized) {
  globalForContent.hasInitialized = true;
  if (memoryContent.size === 0) {
    memoryContent.set("cnt_demo_blog_1", {
      id: "cnt_demo_blog_1",
      workspace_id: "ws_default_neno",
      type: "blog",
      title: "Building Resilient Agentic Workflows with Next.js 14 and Deep Reasoning",
      slug: "building-resilient-agentic-workflows-nextjs-14",
      status: "approved",
      category: "AI Architecture",
      excerpt: "In modern engineering landscapes, mastering autonomous agent pipelines has shifted from an exploratory advantage to a foundational architectural mandate. This blueprint provides a deep, production-grade analysis.",
      current_version_id: "ver_demo_blog_1",
      created_by: "usr_default_mit",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });

    memoryContent.set("cnt_demo_blog_2", {
      id: "cnt_demo_blog_2",
      workspace_id: "ws_default_neno",
      type: "blog",
      title: "Event-Driven Microfrontends: Real-World Latency Benchmarks and ROI",
      slug: "event-driven-microfrontends-real-world-latency-benchmarks-roi",
      status: "approved",
      category: "Frontend & Architecture",
      excerpt: "Quantifying sub-50ms latency gains, module federation strategies, and enterprise ROI across distributed engineering teams.",
      current_version_id: "ver_demo_blog_2",
      created_by: "usr_default_mit",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    memoryContent.set("cnt_demo_blog_3", {
      id: "cnt_demo_blog_3",
      workspace_id: "ws_default_neno",
      type: "blog",
      title: "Designing Zero-Trust Architecture for Microservices in Kubernetes",
      slug: "designing-zero-trust-architecture-for-microservices-in-kubernetes",
      status: "approved",
      category: "Cloud & Kubernetes",
      excerpt: "A comprehensive guide to implementing identity-driven service meshes, mTLS, and eBPF kernel telemetry without performance degradation.",
      current_version_id: "ver_demo_blog_3",
      created_by: "usr_default_mit",
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });
  }
}

import { generateSlug } from "@/lib/utils";
export { generateSlug };

export class ContentService {
  static async listByWorkspace(
    workspaceId: string,
    options?: {
      type?: string;
      status?: string;
      search?: string;
      onlyDeleted?: boolean;
      includeDeleted?: boolean;
    }
  ): Promise<DbContentItem[]> {
    if (db.isConfigured) {
      let query = "SELECT * FROM content_items WHERE workspace_id = $1";
      const params: unknown[] = [workspaceId];

      if (options?.onlyDeleted) {
        query += " AND deleted_at IS NOT NULL";
      } else if (!options?.includeDeleted) {
        query += " AND deleted_at IS NULL";
      }

      if (options?.type && options.type !== "all") {
        params.push(options.type);
        query += ` AND type = $${params.length}`;
      }
      if (options?.status && options.status !== "all") {
        params.push(options.status);
        query += ` AND status = $${params.length}`;
      }
      if (options?.search) {
        params.push(`%${options.search}%`);
        query += ` AND (title ILIKE $${params.length} OR excerpt ILIKE $${params.length})`;
      }

      if (options?.onlyDeleted) {
        query += " ORDER BY deleted_at DESC NULLS LAST";
      } else {
        query += " ORDER BY updated_at DESC";
      }

      const result = await db.query<DbContentItem>(query, params);
      return result.rows;
    }

    let items = Array.from(memoryContent.values()).filter(
      (c) => c.workspace_id === workspaceId
    );

    if (options?.onlyDeleted) {
      items = items.filter((c) => Boolean(c.deleted_at));
    } else if (!options?.includeDeleted) {
      items = items.filter((c) => !c.deleted_at);
    }

    if (options?.type && options.type !== "all") {
      items = items.filter((c) => c.type === options.type);
    }
    if (options?.status && options.status !== "all") {
      items = items.filter((c) => c.status === options.status);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      items = items.filter(
        (c) => c.title.toLowerCase().includes(q) || c.excerpt?.toLowerCase().includes(q)
      );
    }

    if (options?.onlyDeleted) {
      return items.sort((a, b) => {
        const timeA = a.deleted_at ? new Date(a.deleted_at).getTime() : 0;
        const timeB = b.deleted_at ? new Date(b.deleted_at).getTime() : 0;
        return timeB - timeA;
      });
    }

    return items.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  }

  /**
   * Public Query: Retrieve ONLY published, non-deleted blogs for /blog-with-sidebar
   */
  static async listPublicBlogs(options?: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  }): Promise<PublicBlogListResult> {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, Math.min(50, options?.limit || 6));
    const offset = (page - 1) * limit;

    let rawItems: DbContentItem[] = [];

    if (db.isConfigured) {
      let query = `
        SELECT * FROM content_items 
        WHERE type = 'blog' 
          AND (status = 'approved' OR status = 'exported') 
          AND deleted_at IS NULL
      `;
      const params: unknown[] = [];

      if (options?.category && options.category.toLowerCase() !== "all") {
        params.push(`%${options.category}%`);
        query += ` AND category ILIKE $${params.length}`;
      }

      if (options?.search) {
        params.push(`%${options.search}%`);
        query += ` AND (title ILIKE $${params.length} OR excerpt ILIKE $${params.length} OR category ILIKE $${params.length})`;
      }

      query += " ORDER BY updated_at DESC";

      const res = await db.query<DbContentItem>(query, params);
      rawItems = res.rows;
    } else {
      rawItems = Array.from(memoryContent.values()).filter(
        (c) =>
          c.type === "blog" &&
          (c.status === "approved" || c.status === "exported") &&
          !c.deleted_at
      );

      if (options?.category && options.category.toLowerCase() !== "all") {
        const cat = options.category.toLowerCase();
        rawItems = rawItems.filter((c) => c.category.toLowerCase().includes(cat));
      }

      if (options?.search) {
        const q = options.search.toLowerCase();
        rawItems = rawItems.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.excerpt?.toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q)
        );
      }

      rawItems.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
    }

    // Compute dynamic category counts across ALL published non-deleted blogs
    const allPublished = db.isConfigured
      ? (await db.query<DbContentItem>("SELECT category FROM content_items WHERE type = 'blog' AND (status = 'approved' OR status = 'exported') AND deleted_at IS NULL")).rows
      : Array.from(memoryContent.values()).filter((c) => c.type === "blog" && (c.status === "approved" || c.status === "exported") && !c.deleted_at);

    const categoryMap: Record<string, number> = {};
    for (const b of allPublished) {
      const cat = b.category || "AI Architecture";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    }
    const categories = Object.entries(categoryMap).map(([name, count]) => ({ name, count }));

    const total = rawItems.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = rawItems.slice(offset, offset + limit);

    // Format items with version SEO metadata
    const items: PublicBlogItem[] = await Promise.all(
      paginated.map(async (item) => {
        const version = await VersionService.getLatest(item.id);
        const seo = (version?.seo_metadata || {}) as Record<string, unknown>;
        const thumb =
          (seo.featuredImageBrief as string) ||
          (seo.ogImage as string) ||
          (seo.thumb as string) ||
          "";

        return {
          id: item.id,
          title: item.title,
          slug: item.slug,
          category: item.category || "AI Architecture",
          excerpt: item.excerpt || "In-depth engineering insights and architectural specifications.",
          status: item.status,
          author: (seo.author as string) || "Mit Patel",
          readingTime: (seo.readingTime as string) || "5 min read",
          publishDate: (seo.publishDate as string) || new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          thumb,
          created_at: item.created_at,
          updated_at: item.updated_at,
        };
      })
    );

    const featuredPost = items.length > 0 && page === 1 ? items[0] : null;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      categories,
      featuredPost,
    };
  }

  /**
   * Public Query: Retrieve a single published, non-deleted blog by slug or ID
   */
  static async getPublicBlogBySlugOrId(slugOrId: string): Promise<PublicBlogItem | null> {
    let dbItem: DbContentItem | null = null;

    if (db.isConfigured) {
      const query = `
        SELECT * FROM content_items 
        WHERE (slug = $1 OR id = $1)
          AND type = 'blog'
          AND (status = 'approved' OR status = 'exported')
          AND deleted_at IS NULL
        LIMIT 1
      `;
      const res = await db.query<DbContentItem>(query, [slugOrId]);
      dbItem = res.rows[0] || null;
    } else {
      const all = Array.from(memoryContent.values()).filter(
        (c) =>
          c.type === "blog" &&
          (c.status === "approved" || c.status === "exported") &&
          !c.deleted_at
      );
      dbItem = all.find((c) => c.slug === slugOrId || c.id === slugOrId) || null;
    }

    if (!dbItem) return null;

    const version = await VersionService.getLatest(dbItem.id);
    const seo = (version?.seo_metadata || {}) as Record<string, unknown>;
    const thumb =
      (seo.featuredImageBrief as string) ||
      (seo.ogImage as string) ||
      (seo.thumb as string) ||
      "";

    return {
      id: dbItem.id,
      title: dbItem.title,
      slug: dbItem.slug,
      category: dbItem.category || "AI Architecture",
      excerpt: dbItem.excerpt || "",
      status: dbItem.status,
      author: (seo.author as string) || "Mit Patel",
      readingTime: (seo.readingTime as string) || "5 min read",
      publishDate: (seo.publishDate as string) || new Date(dbItem.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      thumb,
      content: version?.content || "",
      seoTitle: (seo.seoTitle as string) || dbItem.title,
      metaDescription: (seo.metaDescription as string) || dbItem.excerpt || "",
      keywords: Array.isArray(seo.keywords) ? (seo.keywords as string[]) : [],
      created_at: dbItem.created_at,
      updated_at: dbItem.updated_at,
    };
  }

  static async getById(
    workspaceId: string,
    contentId: string,
    options?: { allowDeleted?: boolean }
  ): Promise<DbContentItem | null> {
    if (db.isConfigured) {
      let query = "SELECT * FROM content_items WHERE id = $1 AND workspace_id = $2";
      if (!options?.allowDeleted) {
        query += " AND deleted_at IS NULL";
      }
      const result = await db.query<DbContentItem>(query, [contentId, workspaceId]);
      return result.rows[0] || null;
    }

    const item = memoryContent.get(contentId);
    if (!item) return null;
    if (workspaceId && item.workspace_id !== workspaceId) {
      return item;
    }
    if (!options?.allowDeleted && item.deleted_at) {
      return null;
    }
    return item;
  }

  static async create(data: {
    workspaceId: string;
    type: "blog" | "case-study";
    title: string;
    category?: string;
    excerpt?: string;
    createdBy?: string;
  }): Promise<DbContentItem> {
    const id = `cnt_${crypto.randomUUID().slice(0, 8)}`;
    const baseSlug = generateSlug(data.title) || "untitled-content";
    const slug = `${baseSlug}-${id.slice(-4)}`;

    const newItem: DbContentItem = {
      id,
      workspace_id: data.workspaceId,
      type: data.type,
      title: data.title,
      slug,
      status: "draft",
      category: data.category || "General",
      excerpt: data.excerpt,
      created_by: data.createdBy || "system",
      created_at: new Date(),
      updated_at: new Date(),
    };

    if (db.isConfigured) {
      let validUserId: string | null = null;
      if (data.createdBy) {
        try {
          const userCheck = await db.query("SELECT id FROM users WHERE id = $1 LIMIT 1", [data.createdBy]);
          if (userCheck.rows.length > 0) {
            validUserId = userCheck.rows[0].id;
          } else {
            const firstUser = await db.query("SELECT id FROM users LIMIT 1");
            validUserId = firstUser.rows[0]?.id || null;
          }
        } catch {
          validUserId = null;
        }
      }

      const query = `
        INSERT INTO content_items (id, workspace_id, type, title, slug, status, category, excerpt, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const res = await db.query<DbContentItem>(query, [
        newItem.id,
        newItem.workspace_id,
        newItem.type,
        newItem.title,
        newItem.slug,
        newItem.status,
        newItem.category,
        newItem.excerpt,
        validUserId,
      ]);
      return res.rows[0];
    }

    memoryContent.set(id, newItem);
    return newItem;
  }

  static async updateStatus(
    workspaceId: string,
    contentId: string,
    status: DbContentItem["status"]
  ): Promise<DbContentItem | null> {
    if (db.isConfigured) {
      const res = await db.query<DbContentItem>(
        "UPDATE content_items SET status = $1, updated_at = NOW() WHERE id = $2 AND workspace_id = $3 RETURNING *",
        [status, contentId, workspaceId]
      );
      return res.rows[0] || null;
    }

    const item = memoryContent.get(contentId);
    if (!item || item.workspace_id !== workspaceId) return null;
    item.status = status;
    item.updated_at = new Date();
    memoryContent.set(contentId, item);
    return item;
  }

  static async updateItem(
    workspaceId: string,
    contentId: string,
    data: {
      title?: string;
      slug?: string;
      category?: string;
      excerpt?: string;
      status?: DbContentItem["status"];
    }
  ): Promise<DbContentItem | null> {
    if (db.isConfigured) {
      const updates: string[] = [];
      const values: unknown[] = [];
      if (data.title !== undefined) {
        values.push(data.title);
        updates.push(`title = $${values.length}`);
      }
      if (data.slug !== undefined) {
        values.push(data.slug);
        updates.push(`slug = $${values.length}`);
      }
      if (data.category !== undefined) {
        values.push(data.category);
        updates.push(`category = $${values.length}`);
      }
      if (data.excerpt !== undefined) {
        values.push(data.excerpt);
        updates.push(`excerpt = $${values.length}`);
      }
      if (data.status !== undefined) {
        values.push(data.status);
        updates.push(`status = $${values.length}`);
      }
      updates.push("updated_at = NOW()");
      values.push(contentId, workspaceId);
      const query = `UPDATE content_items SET ${updates.join(", ")} WHERE id = $${values.length - 1} AND workspace_id = $${values.length} RETURNING *`;
      const res = await db.query<DbContentItem>(query, values);
      return res.rows[0] || null;
    }

    const item = memoryContent.get(contentId);
    if (!item || (workspaceId && item.workspace_id !== workspaceId)) return null;
    if (data.title !== undefined) item.title = data.title;
    if (data.slug !== undefined) item.slug = data.slug;
    if (data.category !== undefined) item.category = data.category;
    if (data.excerpt !== undefined) item.excerpt = data.excerpt;
    if (data.status !== undefined) item.status = data.status;
    item.updated_at = new Date();
    memoryContent.set(contentId, item);
    return item;
  }

  static async duplicate(
    workspaceId: string,
    contentId: string,
    userId?: string
  ): Promise<DbContentItem | null> {
    const original = await this.getById(workspaceId, contentId);
    if (!original) return null;

    const newItem = await this.create({
      workspaceId,
      type: original.type,
      title: `${original.title} (Copy)`,
      category: original.category,
      excerpt: original.excerpt,
      createdBy: userId || original.created_by,
    });

    return newItem;
  }

  static async delete(
    workspaceId: string,
    contentId: string,
    userId?: string
  ): Promise<boolean> {
    return this.softDelete(workspaceId, contentId, userId);
  }

  static async softDelete(
    workspaceId: string,
    contentId: string,
    userId?: string
  ): Promise<boolean> {
    const deletedAt = new Date();
    const permanentDeleteAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiration

    if (db.isConfigured) {
      const res = await db.query(
        `UPDATE content_items 
         SET deleted_at = $1, deleted_by = $2, permanent_delete_at = $3, updated_at = NOW() 
         WHERE id = $4 AND workspace_id = $5`,
        [deletedAt, userId || null, permanentDeleteAt, contentId, workspaceId]
      );
      return (res.rowCount ?? 0) > 0;
    }

    const item = memoryContent.get(contentId);
    if (!item || item.workspace_id !== workspaceId) return false;
    item.deleted_at = deletedAt;
    item.deleted_by = userId || "admin";
    item.permanent_delete_at = permanentDeleteAt;
    item.updated_at = new Date();
    memoryContent.set(contentId, item);
    return true;
  }

  static async restore(
    workspaceId: string,
    contentId: string
  ): Promise<DbContentItem | null> {
    if (db.isConfigured) {
      const res = await db.query<DbContentItem>(
        `UPDATE content_items 
         SET deleted_at = NULL, deleted_by = NULL, permanent_delete_at = NULL, updated_at = NOW() 
         WHERE id = $1 AND workspace_id = $2 
         RETURNING *`,
        [contentId, workspaceId]
      );
      return res.rows[0] || null;
    }

    const item = memoryContent.get(contentId);
    if (!item || item.workspace_id !== workspaceId) return null;
    item.deleted_at = null;
    item.deleted_by = null;
    item.permanent_delete_at = null;
    item.updated_at = new Date();
    memoryContent.set(contentId, item);
    return item;
  }

  static async permanentDelete(
    workspaceId: string,
    contentId: string
  ): Promise<boolean> {
    if (db.isConfigured) {
      const res = await db.query(
        "DELETE FROM content_items WHERE id = $1 AND workspace_id = $2",
        [contentId, workspaceId]
      );
      return (res.rowCount ?? 0) > 0;
    }

    const item = memoryContent.get(contentId);
    if (!item || item.workspace_id !== workspaceId) return false;
    memoryContent.delete(contentId);
    return true;
  }

  static async emptyTrash(workspaceId: string): Promise<number> {
    if (db.isConfigured) {
      const res = await db.query(
        "DELETE FROM content_items WHERE workspace_id = $1 AND deleted_at IS NOT NULL",
        [workspaceId]
      );
      return res.rowCount ?? 0;
    }

    let count = 0;
    for (const [id, item] of memoryContent.entries()) {
      if (item.workspace_id === workspaceId && item.deleted_at) {
        memoryContent.delete(id);
        count++;
      }
    }
    return count;
  }

  static async cleanupExpiredTrash(workspaceId?: string): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    if (db.isConfigured) {
      let query = "DELETE FROM content_items WHERE deleted_at IS NOT NULL AND (deleted_at <= $1 OR permanent_delete_at <= NOW())";
      const params: unknown[] = [sevenDaysAgo];
      if (workspaceId) {
        params.push(workspaceId);
        query += ` AND workspace_id = $${params.length}`;
      }
      const res = await db.query(query, params);
      return res.rowCount ?? 0;
    }

    let purged = 0;
    const now = Date.now();
    for (const [id, item] of memoryContent.entries()) {
      if (workspaceId && item.workspace_id !== workspaceId) continue;
      if (item.deleted_at) {
        const delTime = new Date(item.deleted_at).getTime();
        const permTime = item.permanent_delete_at ? new Date(item.permanent_delete_at).getTime() : delTime + 7 * 24 * 60 * 60 * 1000;
        if (now >= permTime || now - delTime >= 7 * 24 * 60 * 60 * 1000) {
          memoryContent.delete(id);
          purged++;
        }
      }
    }
    return purged;
  }
}
