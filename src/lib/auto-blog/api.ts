import { NextResponse } from "next/server";
import { z } from "zod";

// Shared by the /api/auto-blog routes (route files may only export handlers).

/** JSON error; points at the migration when the automation tables don't exist yet. */
export function autoBlogError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  const hint = /does not exist/.test(msg) && /auto_blog|schedule_type|posts_|window_|allowed_days|random_count/.test(msg)
    ? " A blog-automation database migration (003-005) hasn't been applied yet."
    : "";
  return NextResponse.json({ error: msg + hint }, { status: 500 });
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const settingsSchema = z.object({
  enabled: z.boolean(),
  interval_days: z.number().int().min(1).max(60),
  preferred_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h)"),
  timezone: z.string().min(1).max(64),
  mode: z.enum(["draft", "publish"]),
  cover_preference: z.enum(["auto", "diagram", "stock", "photo"]),
  notify_email: z.union([z.literal("").transform(() => null), z.string().trim().email().max(255), z.null()]),
  use_suggested: z.boolean(),
  topic_source: z.enum(["queue", "live", "queue_then_live"]),
  schedule_type: z.enum(["interval", "weekly"]),
  posts_per_week: z.number().int().min(1).max(7),
  random_count: z.boolean(),
  posts_min: z.number().int().min(1).max(7),
  posts_max: z.number().int().min(1).max(7),
  window_start: z.string().regex(HHMM, "Use HH:MM (24h)"),
  window_end: z.string().regex(HHMM, "Use HH:MM (24h)"),
  allowed_days: z.array(z.number().int().min(1).max(7)).min(1, "Pick at least one day").max(7).transform((d) => Array.from(new Set(d)).sort()),
  posts_per_run: z.number().int().min(1).max(10),
  spread_mode: z.enum(["spread", "all_at_once"]),
})
  .partial()
  .refine((s) => !s.window_start || !s.window_end || s.window_start < s.window_end, { message: "Posting window must start before it ends", path: ["window_end"] })
  .refine((s) => s.posts_min === undefined || s.posts_max === undefined || s.posts_min <= s.posts_max, { message: "Min must not exceed Max", path: ["posts_max"] });

export const planActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("replan") }),
  z.object({ action: z.literal("skip"), id: z.string().min(1).max(64) }),
]);

export const topicSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(200),
  category: z.string().trim().min(1, "Category is required").max(128),
  notes: z.string().trim().max(1000).nullable().optional(),
});

// status: "queued" approves a suggested topic; "suggested" moves it back.
export const topicPatchSchema = topicSchema.partial().extend({ status: z.enum(["queued", "suggested"]).optional() });
