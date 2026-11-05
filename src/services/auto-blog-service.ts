import crypto from "crypto";
import { db } from "@/db/client";
import { PlanSlot, WeeklySettings, dayIndex, dayStartIST, pickCount, planDay, planWeek, weekStartIST } from "@/lib/auto-blog/weekly-plan";

// Each call is one pool.query: the connection is released right after, never held across LLM/image work.

export type AutoBlogMode = "draft" | "publish";
export type CoverPreference = "auto" | "diagram" | "stock" | "photo";
export type TopicSource = "queue" | "live" | "queue_then_live";

export interface AutoBlogSettings {
  workspace_id: string;
  enabled: boolean;
  interval_days: number;
  preferred_time: string;
  timezone: string;
  mode: AutoBlogMode;
  cover_preference: CoverPreference;
  notify_email: string | null;
  use_suggested: boolean;
  topic_source: TopicSource;
  // Migration 005 (absent until it is applied: treat undefined as "interval")
  schedule_type?: "interval" | "weekly";
  posts_per_week?: number;
  random_count?: boolean;
  posts_min?: number;
  posts_max?: number;
  window_start?: string;
  window_end?: string;
  allowed_days?: number[];
  // Migration 006 (undefined until applied: "Every N days" then keeps its one-post-at-the-preferred-time behaviour)
  posts_per_run?: number;
  spread_mode?: "spread" | "all_at_once";
  last_batch_at?: Date | null;
  last_digest_batch_at?: Date | null;
  image_limited_until?: Date | null;
  last_post_at: Date | null;
  last_category: string | null;
  locked_at: Date | null;
}

export interface AutoBlogTopic {
  id: string;
  workspace_id: string;
  title: string;
  category: string;
  notes: string | null;
  status: "queued" | "suggested" | "used";
  source: "manual" | "llm" | "live";
  position: number;
  content_id: string | null;
  used_at: Date | null;
  trend_headline?: string | null;
  source_urls?: string[] | null;
}

export interface AutoBlogRun {
  id: string;
  trigger: "scheduled" | "manual";
  started_at: Date;
  duration_ms: number;
  mode: AutoBlogMode | null;
  status: "published" | "draft" | "skipped" | "failed";
  topic: string | null;
  content_id: string | null;
  title: string | null;
  reason: string | null;
  error: string | null;
}

const SETTING_FIELDS = ["enabled", "interval_days", "preferred_time", "timezone", "mode", "cover_preference", "notify_email", "use_suggested", "topic_source", "last_post_at", "last_category",
  "schedule_type", "posts_per_week", "random_count", "posts_min", "posts_max", "window_start", "window_end", "allowed_days",
  "posts_per_run", "spread_mode", "last_batch_at", "last_digest_batch_at", "image_limited_until"] as const;
export const SCHEDULE_FIELDS = ["schedule_type", "posts_per_week", "random_count", "posts_min", "posts_max", "window_start", "window_end", "allowed_days"] as const;

export interface PlanRow extends PlanSlot {
  content_id: string | null;
  attempts: number;
  note: string | null;
  batch_at?: Date | null;
}

/** A batch slot with its post (for the summary email). */
export interface BatchSlotRow extends PlanRow {
  post_title: string | null;
  post_category: string | null;
}

/** Weekly settings with the migration-005 defaults for any column that isn't there yet. */
export const weeklyOf = (s: AutoBlogSettings): WeeklySettings => ({
  posts_per_week: s.posts_per_week ?? 3,
  random_count: s.random_count ?? false,
  posts_min: s.posts_min ?? 2,
  posts_max: s.posts_max ?? 4,
  window_start: s.window_start || "09:00",
  window_end: s.window_end || "19:00",
  allowed_days: s.allowed_days?.length ? s.allowed_days.map(Number) : [1, 2, 3, 4, 5, 6, 7],
});
type SettingsPatch = Partial<Pick<AutoBlogSettings, (typeof SETTING_FIELDS)[number]>>;

function requireDb() {
  if (!db.isConfigured) throw new Error("DATABASE_URL is not configured; blog automation needs the database.");
}

export const AutoBlogService = {
  async getSettings(workspaceId: string): Promise<AutoBlogSettings> {
    requireDb();
    await db.query("INSERT INTO auto_blog_settings (workspace_id) VALUES ($1) ON CONFLICT DO NOTHING", [workspaceId]);
    return (await db.query<AutoBlogSettings>("SELECT * FROM auto_blog_settings WHERE workspace_id = $1", [workspaceId])).rows[0];
  },

  async updateSettings(workspaceId: string, patch: SettingsPatch): Promise<AutoBlogSettings> {
    await this.getSettings(workspaceId);
    const keys = SETTING_FIELDS.filter((k) => patch[k] !== undefined);
    if (keys.length) {
      const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
      await db.query(`UPDATE auto_blog_settings SET ${sets}, updated_at = NOW() WHERE workspace_id = $1`, [workspaceId, ...keys.map((k) => patch[k])]);
    }
    return this.getSettings(workspaceId);
  },

  /** Atomic run lock; a lock older than 30 minutes is treated as stale and taken over. */
  async acquireLock(workspaceId: string): Promise<{ acquired: boolean; clearedStale: boolean }> {
    await this.getSettings(workspaceId);
    const r = await db.query<{ prev: Date | null }>(
      `UPDATE auto_blog_settings s SET locked_at = NOW()
       FROM (SELECT locked_at AS prev FROM auto_blog_settings WHERE workspace_id = $1 FOR UPDATE) old
       WHERE s.workspace_id = $1 AND (old.prev IS NULL OR old.prev < NOW() - INTERVAL '30 minutes')
       RETURNING old.prev`,
      [workspaceId]
    );
    return { acquired: r.rows.length > 0, clearedStale: Boolean(r.rows[0]?.prev) };
  },

  async releaseLock(workspaceId: string): Promise<void> {
    await db.query("UPDATE auto_blog_settings SET locked_at = NULL WHERE workspace_id = $1", [workspaceId]);
  },

  async listTopics(workspaceId: string): Promise<AutoBlogTopic[]> {
    requireDb();
    return (await db.query<AutoBlogTopic>(
      "SELECT * FROM auto_blog_topics WHERE workspace_id = $1 ORDER BY (status = 'used'), position, created_at",
      [workspaceId]
    )).rows;
  },

  async addTopic(
    workspaceId: string,
    t: { title: string; category: string; notes?: string | null; status?: "queued" | "suggested"; source?: AutoBlogTopic["source"]; trendHeadline?: string; sourceUrls?: string[] }
  ): Promise<AutoBlogTopic> {
    requireDb();
    const id = `abt_${crypto.randomUUID().slice(0, 12)}`;
    const live = t.trendHeadline !== undefined || t.sourceUrls !== undefined; // trend columns exist only after migration 004
    return (await db.query<AutoBlogTopic>(
      `INSERT INTO auto_blog_topics (id, workspace_id, title, category, notes, status, source, position${live ? ", trend_headline, source_urls" : ""})
       VALUES ($1, $2, $3, $4, $5, $6, $7, (SELECT COALESCE(MAX(position), 0) + 1 FROM auto_blog_topics WHERE workspace_id = $8)${live ? ", $9, $10" : ""})
       RETURNING *`,
      // workspace id passed twice: reusing $2 in the subquery makes Postgres deduce conflicting types
      [id, workspaceId, t.title, t.category, t.notes || null, t.status || "queued", t.source || "manual", workspaceId,
        ...(live ? [t.trendHeadline || null, JSON.stringify(t.sourceUrls || [])] : [])]
    )).rows[0];
  },

  /** For live trends: blog titles/slugs plus topics (and their trend headlines) used in the last `days` days. */
  async recentTitlesForLiveDedup(workspaceId: string, days = 60): Promise<string[]> {
    const posts = await db.query<{ title: string; slug: string }>(
      "SELECT title, slug FROM content_items WHERE workspace_id = $1 AND type = 'blog' AND deleted_at IS NULL",
      [workspaceId]
    );
    const used = await db.query<{ title: string; trend_headline: string | null }>(
      "SELECT title, trend_headline FROM auto_blog_topics WHERE workspace_id = $1 AND status = 'used' AND used_at > NOW() - make_interval(days => $2)",
      [workspaceId, days]
    );
    return [
      ...posts.rows.flatMap((p) => [p.title, (p.slug || "").replace(/-/g, " ")]),
      ...used.rows.flatMap((t) => [t.title, t.trend_headline || ""]),
    ].filter(Boolean);
  },

  async updateTopic(workspaceId: string, id: string, patch: { title?: string; category?: string; notes?: string | null; status?: "queued" | "suggested" }): Promise<AutoBlogTopic | null> {
    requireDb();
    return (await db.query<AutoBlogTopic>(
      `UPDATE auto_blog_topics SET title = COALESCE($3, title), category = COALESCE($4, category),
         notes = CASE WHEN $5::boolean THEN $6 ELSE notes END, status = COALESCE($7, status)
       WHERE workspace_id = $1 AND id = $2 RETURNING *`,
      [workspaceId, id, patch.title ?? null, patch.category ?? null, patch.notes !== undefined, patch.notes ?? null, patch.status ?? null]
    )).rows[0] || null;
  },

  async deleteTopic(workspaceId: string, id: string): Promise<void> {
    requireDb();
    await db.query("DELETE FROM auto_blog_topics WHERE workspace_id = $1 AND id = $2", [workspaceId, id]);
  },

  /** Sets positions to the order of `ids`. */
  async reorderTopics(workspaceId: string, ids: string[]): Promise<void> {
    requireDb();
    await db.query(
      `UPDATE auto_blog_topics t SET position = x.ord FROM unnest($2::text[]) WITH ORDINALITY AS x(id, ord)
       WHERE t.workspace_id = $1 AND t.id = x.id`,
      [workspaceId, ids]
    );
  },

  async markTopicUsed(id: string, contentId: string): Promise<void> {
    await db.query("UPDATE auto_blog_topics SET status = 'used', content_id = $2, used_at = NOW() WHERE id = $1", [id, contentId]);
  },

  /** Existing blog titles/slugs plus every queued or suggested topic, so new suggestions can avoid them. */
  async existingTitles(workspaceId: string): Promise<string[]> {
    const posts = await db.query<{ title: string; slug: string }>(
      "SELECT title, slug FROM content_items WHERE workspace_id = $1 AND type = 'blog' AND deleted_at IS NULL",
      [workspaceId]
    );
    const topics = await db.query<{ title: string }>("SELECT title FROM auto_blog_topics WHERE workspace_id = $1", [workspaceId]);
    return [...posts.rows.flatMap((p) => [p.title, (p.slug || "").replace(/-/g, " ")]), ...topics.rows.map((t) => t.title)].filter(Boolean);
  },

  async recordRun(workspaceId: string, run: Omit<AutoBlogRun, "id">): Promise<void> {
    await db.query(
      `INSERT INTO auto_blog_runs (id, workspace_id, trigger, started_at, duration_ms, mode, status, topic, content_id, title, reason, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [`abr_${crypto.randomUUID().slice(0, 12)}`, workspaceId, run.trigger, run.started_at, run.duration_ms, run.mode, run.status, run.topic, run.content_id, run.title, run.reason, run.error]
    );
  },

  // ---------------------------------------------------------------- weekly plan (migration 005)

  async listPlan(workspaceId: string, now = new Date()): Promise<PlanRow[]> {
    requireDb();
    return (await db.query<PlanRow>(
      // SELECT *: kind / batch_at exist only after migration 006
      "SELECT * FROM auto_blog_plan WHERE workspace_id = $1 AND week_start = $2 ORDER BY slot_at",
      [workspaceId, weekStartIST(now)]
    )).rows;
  },

  // ---------------------------------------------------------------- every-N-days day plan (migration 006)

  /** Plans today's batch: posts_per_run slots (back to back, or spread 45+ min apart); posts that don't fit are skipped rows. */
  async createBatch(settings: AutoBlogSettings, now = new Date()): Promise<{ planned: number; dropped: number }> {
    const ws = settings.workspace_id;
    const batchAt = dayStartIST(now);
    const spread = settings.spread_mode !== "all_at_once";
    const { times, dropped } = planDay(
      { count: settings.posts_per_run ?? 1, spread, window_start: settings.window_start || "09:00", window_end: settings.window_end || "19:00" },
      now
    );
    const insert = (at: Date, status: string, note: string | null) =>
      db.query(
        "INSERT INTO auto_blog_plan (id, workspace_id, week_start, slot_at, status, note, kind, batch_at) VALUES ($1, $2, $3, $4, $5, $6, 'batch', $7)",
        [`abp_${crypto.randomUUID().slice(0, 12)}`, ws, weekStartIST(at), at, status, note, batchAt]
      );
    for (const at of times) await insert(at, "pending", null);
    for (let i = 0; i < dropped; i++) await insert(now, "skipped", "Not enough time left in today's posting window (45 minutes apart)");
    // The N-day count runs from the day of the batch, not the last single post.
    await this.updateSettings(ws, { last_batch_at: batchAt });
    return { planned: times.length, dropped };
  },

  async dueBatchSlots(workspaceId: string, now = new Date()): Promise<PlanRow[]> {
    return (await db.query<PlanRow>(
      "SELECT * FROM auto_blog_plan WHERE workspace_id = $1 AND kind = 'batch' AND status = 'pending' AND slot_at <= $2 ORDER BY slot_at",
      [workspaceId, now]
    )).rows;
  },

  async batchSlots(workspaceId: string, batchAt: Date): Promise<BatchSlotRow[]> {
    return (await db.query<BatchSlotRow>(
      `SELECT p.*, c.title AS post_title, c.category AS post_category FROM auto_blog_plan p
       LEFT JOIN content_items c ON c.id = p.content_id
       WHERE p.workspace_id = $1 AND p.kind = 'batch' AND p.batch_at = $2 ORDER BY p.slot_at`,
      [workspaceId, batchAt]
    )).rows;
  },

  /** Heartbeat between posts of a long run, so the 30-minute stale-lock rule never fires mid-batch. */
  async touchLock(workspaceId: string): Promise<void> {
    await db.query("UPDATE auto_blog_settings SET locked_at = NOW() WHERE workspace_id = $1 AND locked_at IS NOT NULL", [workspaceId]);
  },

  /** Creates this week's plan if there is none yet; pending slots of earlier weeks become skipped. */
  async ensureWeekPlan(settings: AutoBlogSettings, now = new Date()): Promise<PlanRow[]> {
    await db.query(
      "UPDATE auto_blog_plan SET status = 'skipped', note = 'Week ended before it ran', updated_at = NOW() WHERE workspace_id = $1 AND week_start < $2 AND status IN ('pending', 'running')",
      [settings.workspace_id, weekStartIST(now)]
    );
    const plan = await this.listPlan(settings.workspace_id, now);
    // "Every N days" batch slots in this week don't count as a weekly plan
    return plan.some((p) => p.kind !== "batch") ? plan : this.replanWeek(settings, now);
  },

  /**
   * (Re)plans the rest of this week: drops pending slots, keeps done/running (and failed/skipped as history),
   * and plans count - posts-already-made new slots on days that have no post yet.
   */
  async replanWeek(settings: AutoBlogSettings, now = new Date()): Promise<PlanRow[]> {
    const ws = settings.workspace_id;
    const weekStart = weekStartIST(now);
    await db.query("DELETE FROM auto_blog_plan WHERE workspace_id = $1 AND week_start = $2 AND status = 'pending'", [ws, weekStart]);
    const kept = await this.listPlan(ws, now);
    const made = kept.filter((s) => s.status === "done" || s.status === "running");
    const weekly = weeklyOf(settings);
    const slots = planWeek(weekly, { now, count: pickCount(weekly) - made.length, takenDays: new Set(made.map((s) => dayIndex(new Date(s.slot_at), weekStart))) });
    for (const at of slots) {
      await db.query(
        "INSERT INTO auto_blog_plan (id, workspace_id, week_start, slot_at) VALUES ($1, $2, $3, $4)",
        [`abp_${crypto.randomUUID().slice(0, 12)}`, ws, weekStart, at]
      );
    }
    return this.listPlan(ws, now);
  },

  async updateSlot(id: string, patch: { status?: PlanRow["status"]; slot_at?: Date; content_id?: string | null; note?: string | null; attempts?: number }): Promise<void> {
    await db.query(
      `UPDATE auto_blog_plan SET status = COALESCE($2, status), slot_at = COALESCE($3, slot_at), content_id = COALESCE($4, content_id),
         note = COALESCE($5, note), attempts = COALESCE($6, attempts), updated_at = NOW() WHERE id = $1`,
      [id, patch.status ?? null, patch.slot_at ?? null, patch.content_id ?? null, patch.note ?? null, patch.attempts ?? null]
    );
  },

  /** "Skip this slot" (pending only, so a running or finished post is never touched). */
  async skipSlot(workspaceId: string, id: string): Promise<boolean> {
    requireDb();
    const r = await db.query(
      "UPDATE auto_blog_plan SET status = 'skipped', note = 'Skipped by you', updated_at = NOW() WHERE workspace_id = $1 AND id = $2 AND status = 'pending'",
      [workspaceId, id]
    );
    return (r.rowCount || 0) > 0;
  },

  /** After a stale lock (a crashed run): its slot goes back to pending. */
  async resetRunningSlots(workspaceId: string): Promise<void> {
    await db.query("UPDATE auto_blog_plan SET status = 'pending', updated_at = NOW() WHERE workspace_id = $1 AND status = 'running'", [workspaceId]);
  },

  async listRuns(workspaceId: string, limit = 25): Promise<AutoBlogRun[]> {
    requireDb();
    return (await db.query<AutoBlogRun>("SELECT * FROM auto_blog_runs WHERE workspace_id = $1 ORDER BY started_at DESC LIMIT $2", [workspaceId, limit])).rows;
  },
};
