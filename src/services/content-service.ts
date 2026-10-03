import crypto from "crypto";
import { DbContentItem } from "@/db/schema";
import { db } from "@/db/client";

// In-memory persistent database store for local development without live PostgreSQL
const globalForContent = global as unknown as {
  memoryContent?: Map<string, DbContentItem>;
};
const memoryContent: Map<string, DbContentItem> =
  globalForContent.memoryContent || new Map<string, DbContentItem>();
if (process.env.NODE_ENV !== "production") {
  globalForContent.memoryContent = memoryContent;
}

// Seed demo items if empty
if (memoryContent.size === 0) {
  const seedItems: DbContentItem[] = [
    {
      id: "cnt_demo_blog_1",
      workspace_id: "ws_default_neno",
      type: "blog",
      title: "Building Resilient Agentic Workflows with Next.js 14 and Deep Reasoning",
      slug: "building-resilient-agentic-workflows-nextjs-14",
      status: "approved",
      category: "Enterprise AI & Cloud Engineering",
      excerpt: "An architectural deep-dive into autonomous multi-agent systems, circuit breaking, and structured validation pipelines.",
      created_by: "usr_default_mit",
      created_at: new Date(Date.now() - 3600 * 24 * 1000),
      updated_at: new Date(Date.now() - 3600 * 2 * 1000),
    },
    {
      id: "cnt_demo_case_1",
      workspace_id: "ws_default_neno",
      type: "case-study",
      title: "Autonomous Content Engine: Slashing Enterprise Production Latency by 85%",
      slug: "autonomous-content-engine-slashing-production-latency",
      status: "in_review",
      category: "Cloud Modernization & DevOps",
      excerpt: "How a global SaaS enterprise automated research-grounded technical documentation with multi-agent orchestration.",
      created_by: "usr_default_mit",
      created_at: new Date(Date.now() - 3600 * 48 * 1000),
      updated_at: new Date(Date.now() - 3600 * 5 * 1000),
    },
  ];
  for (const it of seedItems) {
    memoryContent.set(it.id, it);
  }
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class ContentService {
  static async listByWorkspace(
    workspaceId: string,
    options?: { type?: string; status?: string; search?: string }
  ): Promise<DbContentItem[]> {
    if (db.isConfigured) {
      let query = "SELECT * FROM content_items WHERE workspace_id = $1";
      const params: unknown[] = [workspaceId];

      if (options?.type) {
        params.push(options.type);
        query += ` AND type = $${params.length}`;
      }
      if (options?.status) {
        params.push(options.status);
        query += ` AND status = $${params.length}`;
      }
      if (options?.search) {
        params.push(`%${options.search}%`);
        query += ` AND (title ILIKE $${params.length} OR excerpt ILIKE $${params.length})`;
      }

      query += " ORDER BY updated_at DESC";
      const result = await db.query<DbContentItem>(query, params);
      return result.rows;
    }

    let items = Array.from(memoryContent.values()).filter(
      (c) => c.workspace_id === workspaceId
    );

    if (options?.type) items = items.filter((c) => c.type === options.type);
    if (options?.status) items = items.filter((c) => c.status === options.status);
    if (options?.search) {
      const q = options.search.toLowerCase();
      items = items.filter(
        (c) => c.title.toLowerCase().includes(q) || c.excerpt?.toLowerCase().includes(q)
      );
    }

    return items.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  }

  static async getById(
    workspaceId: string,
    contentId: string
  ): Promise<DbContentItem | null> {
    if (db.isConfigured) {
      const result = await db.query<DbContentItem>(
        "SELECT * FROM content_items WHERE id = $1 AND workspace_id = $2",
        [contentId, workspaceId]
      );
      return result.rows[0] || null;
    }

    const item = memoryContent.get(contentId);
    if (!item) return null;
    if (workspaceId && item.workspace_id !== workspaceId) {
      // In dev fallback, allow loading if item exists
      return item;
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
        newItem.created_by,
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

  static async delete(
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
}
