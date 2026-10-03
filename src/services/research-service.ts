import crypto from "crypto";
import { DbResearchSource, DbGenerationRun } from "@/db/schema";
import { db } from "@/db/client";

const memorySources = new Map<string, DbResearchSource[]>();
const memoryRuns = new Map<string, DbGenerationRun>();

export class ResearchService {
  static async listByContent(contentId: string): Promise<DbResearchSource[]> {
    if (db.isConfigured) {
      const res = await db.query<DbResearchSource>(
        "SELECT * FROM research_sources WHERE content_id = $1 ORDER BY retrieved_at DESC",
        [contentId]
      );
      return res.rows;
    }
    return memorySources.get(contentId) || [];
  }

  static async addSource(data: {
    contentId: string;
    url: string;
    title: string;
    publisher?: string;
    notes?: string;
    relevance?: string;
  }): Promise<DbResearchSource> {
    const id = `src_${crypto.randomUUID().slice(0, 8)}`;
    const newSource: DbResearchSource = {
      id,
      content_id: data.contentId,
      url: data.url,
      title: data.title,
      publisher: data.publisher,
      notes: data.notes,
      relevance: data.relevance,
      retrieved_at: new Date(),
    };

    if (db.isConfigured) {
      const query = `
        INSERT INTO research_sources (id, content_id, url, title, publisher, notes, relevance)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const res = await db.query<DbResearchSource>(query, [
        newSource.id,
        newSource.content_id,
        newSource.url,
        newSource.title,
        newSource.publisher,
        newSource.notes,
        newSource.relevance,
      ]);
      return res.rows[0];
    }

    const currentList = memorySources.get(data.contentId) || [];
    currentList.push(newSource);
    memorySources.set(data.contentId, currentList);
    return newSource;
  }
}

export class GenerationService {
  static async startRun(data: {
    contentId: string;
    runType: string;
    model: string;
    promptVersion?: string;
    inputData: Record<string, unknown>;
  }): Promise<DbGenerationRun> {
    const id = `run_${crypto.randomUUID().slice(0, 8)}`;
    const newRun: DbGenerationRun = {
      id,
      content_id: data.contentId,
      run_type: data.runType,
      status: "running",
      model: data.model,
      prompt_version: data.promptVersion || "v1.0",
      input_data: data.inputData,
      token_usage: 0,
      estimated_cost: 0,
      started_at: new Date(),
    };

    if (db.isConfigured) {
      const query = `
        INSERT INTO generation_runs (id, content_id, run_type, status, model, prompt_version, input_data)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const res = await db.query<DbGenerationRun>(query, [
        newRun.id,
        newRun.content_id,
        newRun.run_type,
        newRun.status,
        newRun.model,
        newRun.prompt_version,
        JSON.stringify(newRun.input_data),
      ]);
      return res.rows[0];
    }

    memoryRuns.set(id, newRun);
    return newRun;
  }

  static async completeRun(
    runId: string,
    data: {
      outputData: Record<string, unknown>;
      tokenUsage?: number;
      estimatedCost?: number;
    }
  ): Promise<DbGenerationRun | null> {
    if (db.isConfigured) {
      const res = await db.query<DbGenerationRun>(
        `UPDATE generation_runs
         SET status = 'completed', output_data = $1, token_usage = $2, estimated_cost = $3, completed_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [JSON.stringify(data.outputData), data.tokenUsage || 0, data.estimatedCost || 0, runId]
      );
      return res.rows[0] || null;
    }

    const run = memoryRuns.get(runId);
    if (!run) return null;
    run.status = "completed";
    run.output_data = data.outputData;
    run.token_usage = data.tokenUsage || 0;
    run.estimated_cost = data.estimatedCost || 0;
    run.completed_at = new Date();
    memoryRuns.set(runId, run);
    return run;
  }

  static async failRun(runId: string, error: string): Promise<DbGenerationRun | null> {
    if (db.isConfigured) {
      const res = await db.query<DbGenerationRun>(
        `UPDATE generation_runs
         SET status = 'failed', error = $1, completed_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [error, runId]
      );
      return res.rows[0] || null;
    }

    const run = memoryRuns.get(runId);
    if (!run) return null;
    run.status = "failed";
    run.error = error;
    run.completed_at = new Date();
    memoryRuns.set(runId, run);
    return run;
  }
}
