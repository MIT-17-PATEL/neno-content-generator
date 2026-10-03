import crypto from "crypto";
import { DbContentVersion } from "@/db/schema";
import { db } from "@/db/client";

const memoryVersions = new Map<string, DbContentVersion[]>();

export class VersionService {
  static async listByContent(contentId: string): Promise<DbContentVersion[]> {
    if (db.isConfigured) {
      const res = await db.query<DbContentVersion>(
        "SELECT * FROM content_versions WHERE content_id = $1 ORDER BY version_number DESC",
        [contentId]
      );
      return res.rows;
    }

    return (memoryVersions.get(contentId) || []).sort(
      (a, b) => b.version_number - a.version_number
    );
  }

  static async getLatest(contentId: string): Promise<DbContentVersion | null> {
    const versions = await this.listByContent(contentId);
    return versions[0] || null;
  }

  static async createVersion(data: {
    contentId: string;
    content: string;
    seoMetadata?: Record<string, unknown>;
    generationRunId?: string;
    createdBy?: string;
  }): Promise<DbContentVersion> {
    const existing = await this.listByContent(data.contentId);
    const nextVersionNumber = existing.length > 0 ? existing[0].version_number + 1 : 1;
    const id = `ver_${crypto.randomUUID().slice(0, 8)}`;

    const newVersion: DbContentVersion = {
      id,
      content_id: data.contentId,
      version_number: nextVersionNumber,
      content: data.content,
      seo_metadata: data.seoMetadata || {},
      generation_run_id: data.generationRunId,
      created_by: data.createdBy || "system",
      created_at: new Date(),
    };

    if (db.isConfigured) {
      const query = `
        INSERT INTO content_versions (id, content_id, version_number, content, seo_metadata, generation_run_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const res = await db.query<DbContentVersion>(query, [
        newVersion.id,
        newVersion.content_id,
        newVersion.version_number,
        newVersion.content,
        JSON.stringify(newVersion.seo_metadata),
        newVersion.generation_run_id,
        newVersion.created_by,
      ]);

      // Update current_version_id on content_items
      await db.query(
        "UPDATE content_items SET current_version_id = $1, updated_at = NOW() WHERE id = $2",
        [id, data.contentId]
      );

      return res.rows[0];
    }

    const currentList = memoryVersions.get(data.contentId) || [];
    currentList.unshift(newVersion);
    memoryVersions.set(data.contentId, currentList);
    return newVersion;
  }
}
