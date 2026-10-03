import crypto from "crypto";
import { DbExport } from "@/db/schema";
import { db } from "@/db/client";
import { ExportRecord, ExportFormat } from "@/types";

const memoryExports = new Map<string, DbExport[]>();

function mapDbToExportRecord(dbExport: DbExport): ExportRecord {
  return {
    id: dbExport.id,
    contentId: dbExport.content_id,
    format: dbExport.format as ExportFormat,
    storageKey: dbExport.storage_key,
    createdAt: new Date(dbExport.created_at).toISOString(),
  };
}

export class ExportService {
  static async listByContent(contentId: string): Promise<ExportRecord[]> {
    if (db.isConfigured) {
      const res = await db.query<DbExport>(
        "SELECT * FROM exports WHERE content_id = $1 ORDER BY created_at DESC",
        [contentId]
      );
      return res.rows.map(mapDbToExportRecord);
    }

    const list = memoryExports.get(contentId) || [];
    return list
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(mapDbToExportRecord);
  }

  static async recordExport(data: {
    contentId: string;
    format: ExportFormat;
    storageKey?: string;
  }): Promise<ExportRecord> {
    const id = `exp_${crypto.randomUUID().slice(0, 8)}`;
    const newDbExport: DbExport = {
      id,
      content_id: data.contentId,
      format: data.format,
      storage_key: data.storageKey || `exports/${data.contentId}/${id}.${data.format === "json" ? "json" : data.format === "html" ? "html" : "md"}`,
      created_at: new Date(),
    };

    if (db.isConfigured) {
      const query = `
        INSERT INTO exports (id, content_id, format, storage_key, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const res = await db.query<DbExport>(query, [
        newDbExport.id,
        newDbExport.content_id,
        newDbExport.format,
        newDbExport.storage_key,
        newDbExport.created_at,
      ]);
      return mapDbToExportRecord(res.rows[0]);
    }

    const currentList = memoryExports.get(data.contentId) || [];
    currentList.push(newDbExport);
    memoryExports.set(data.contentId, currentList);
    return mapDbToExportRecord(newDbExport);
  }
}
