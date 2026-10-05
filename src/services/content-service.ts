import crypto from "crypto";
import { DbContentItem } from "@/db/schema";
import { db } from "@/db/client";

// In-memory persistent database store for local development without live PostgreSQL
const globalForContent = global as unknown as {
  memoryContent?: Map<string, DbContentItem>;
  hasInitialized?: boolean;
};
const memoryContent: Map<string, DbContentItem> =
  globalForContent.memoryContent || new Map<string, DbContentItem>();
globalForContent.memoryContent = memoryContent;

// Only seed once on initial process startup, never re-seed when user deletes items
if (!globalForContent.hasInitialized) {
  globalForContent.hasInitialized = true;
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
