import crypto from "crypto";
import { DbMediaAsset } from "@/db/schema";
import { db } from "@/db/client";
import { MediaAsset, MediaType, ImageAspectRatio, ImageStylePreset } from "@/types";

const memoryMedia = new Map<string, DbMediaAsset[]>();

function mapDbToMediaAsset(dbAsset: DbMediaAsset): MediaAsset {
  const meta = (dbAsset.metadata || {}) as Record<string, unknown>;
  return {
    id: dbAsset.id,
    workspaceId: dbAsset.workspace_id,
    contentId: dbAsset.content_id,
    type: dbAsset.type as MediaType,
    title: (meta.title as string) || "Media Asset",
    prompt: meta.prompt as string | undefined,
    altText: meta.altText as string | undefined,
    aspectRatio: meta.aspectRatio as ImageAspectRatio | undefined,
    style: meta.style as ImageStylePreset | undefined,
    storageKey: dbAsset.storage_key,
    publicUrl: dbAsset.public_url,
    fileSize: meta.fileSize as number | undefined,
    mimeType: meta.mimeType as string | undefined,
    metadata: meta,
    createdAt: new Date(dbAsset.created_at).toISOString(),
  };
}

export class MediaService {
  static async listByWorkspace(workspaceId: string, type?: string): Promise<MediaAsset[]> {
    if (db.isConfigured) {
      let query = "SELECT * FROM media_assets WHERE workspace_id = $1";
      const params: unknown[] = [workspaceId];
      if (type) {
        query += " AND type = $2";
        params.push(type);
      }
      query += " ORDER BY created_at DESC";
      const res = await db.query<DbMediaAsset>(query, params);
      return res.rows.map(mapDbToMediaAsset);
    }

    const list = memoryMedia.get(workspaceId) || [];
    const filtered = type ? list.filter((m) => m.type === type) : list;
    return filtered
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(mapDbToMediaAsset);
  }

  static async listByContent(contentId: string): Promise<MediaAsset[]> {
    if (db.isConfigured) {
      const res = await db.query<DbMediaAsset>(
        "SELECT * FROM media_assets WHERE content_id = $1 ORDER BY created_at DESC",
        [contentId]
      );
      return res.rows.map(mapDbToMediaAsset);
    }

    const all: DbMediaAsset[] = [];
    for (const list of memoryMedia.values()) {
      for (const item of list) {
        if (item.content_id === contentId) {
          all.push(item);
        }
      }
    }
    return all
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(mapDbToMediaAsset);
  }

  static async getById(id: string, workspaceId: string): Promise<MediaAsset | null> {
    if (db.isConfigured) {
      const res = await db.query<DbMediaAsset>(
        "SELECT * FROM media_assets WHERE id = $1 AND workspace_id = $2",
        [id, workspaceId]
      );
      if (res.rows.length === 0) return null;
      return mapDbToMediaAsset(res.rows[0]);
    }

    const list = memoryMedia.get(workspaceId) || [];
    const found = list.find((m) => m.id === id);
    return found ? mapDbToMediaAsset(found) : null;
  }

  static async create(data: {
    workspaceId: string;
    contentId?: string;
    type: MediaType;
    title: string;
    prompt?: string;
    altText?: string;
    aspectRatio?: ImageAspectRatio;
    style?: ImageStylePreset;
    storageKey: string;
    publicUrl: string;
    fileSize?: number;
    mimeType?: string;
    metadata?: Record<string, unknown>;
  }): Promise<MediaAsset> {
    const id = `med_${crypto.randomUUID().slice(0, 8)}`;
    const metadataObj: Record<string, unknown> = {
      title: data.title,
      prompt: data.prompt,
      altText: data.altText,
      aspectRatio: data.aspectRatio,
      style: data.style,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      ...(data.metadata || {}),
    };

    const newDbAsset: DbMediaAsset = {
      id,
      workspace_id: data.workspaceId,
      content_id: data.contentId,
      type: data.type,
      storage_key: data.storageKey,
      public_url: data.publicUrl,
      metadata: metadataObj,
      created_at: new Date(),
    };

    if (db.isConfigured) {
      const query = `
        INSERT INTO media_assets (id, workspace_id, content_id, type, storage_key, public_url, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const res = await db.query<DbMediaAsset>(query, [
        newDbAsset.id,
        newDbAsset.workspace_id,
        newDbAsset.content_id,
        newDbAsset.type,
        newDbAsset.storage_key,
        newDbAsset.public_url,
        JSON.stringify(newDbAsset.metadata),
        newDbAsset.created_at,
      ]);
      return mapDbToMediaAsset(res.rows[0]);
    }

    const currentList = memoryMedia.get(data.workspaceId) || [];
    currentList.push(newDbAsset);
    memoryMedia.set(data.workspaceId, currentList);
    return mapDbToMediaAsset(newDbAsset);
  }

  static async delete(id: string, workspaceId: string): Promise<boolean> {
    if (db.isConfigured) {
      const res = await db.query(
        "DELETE FROM media_assets WHERE id = $1 AND workspace_id = $2",
        [id, workspaceId]
      );
      return (res.rowCount ?? 0) > 0;
    }

    const list = memoryMedia.get(workspaceId) || [];
    const updated = list.filter((m) => m.id !== id);
    if (updated.length !== list.length) {
      memoryMedia.set(workspaceId, updated);
      return true;
    }
    return false;
  }
}
