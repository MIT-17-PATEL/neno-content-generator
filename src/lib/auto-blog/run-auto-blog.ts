import { AutoBlogService, AutoBlogTopic, CoverPreference } from "@/services/auto-blog-service";
import { ContentService } from "@/services/content-service";
import { VersionService } from "@/services/version-service";
import { MediaService } from "@/services/media-service";
import { dataStore } from "@/server/data-store";
import { runBlogGenerationPipeline } from "@/lib/ai/blog-generator";
import { callAiStructured, isAiConfigured } from "@/lib/ai/ai-client";
import { BlogVisual, coverMetadata, imageQuota, makeCover } from "@/lib/ai/blog-visuals";
import { findStockCandidates, selectStockPhoto, stockKey } from "@/lib/ai/stock-photos";
import { WebsiteSyncService } from "@/lib/export/website-sync";
import { ContentItem, ContentVersion } from "@/types";
import { notifyBatchSummary, notifyRun } from "@/lib/auto-blog/notify";
import { CoverLimits, checkLimits, coverWithLimits } from "@/lib/auto-blog/limits";
import { NENO_CATEGORIES } from "@/lib/auto-blog/categories";
import { isSimilar } from "@/lib/auto-blog/similar";
import { LiveTopicPick, pickLiveTopic } from "@/lib/auto-blog/live-trends";
import { istDayNumber, minutesIST, parseHHMM, resolveSlots } from "@/lib/auto-blog/weekly-plan";
import { PlanRow, weeklyOf } from "@/services/auto-blog-service";
import type { AutoBlogSettings } from "@/services/auto-blog-service";

// The app's single workspace and admin user (see src/server/data-store.ts).
export const AUTO_BLOG_WORKSPACE = "ws_default_neno";
const AUTO_BLOG_USER = "usr_default_mit";
export const APP_URL = (process.env.AUTO_BLOG_APP_URL || "http://localhost:3001").replace(/\/$/, "");

export interface AutoBlogResult {
  trigger: "scheduled" | "manual";
  startedAt: Date;
  durationMs: number;
  mode: AutoBlogSettings["mode"] | null;
  status: "published" | "draft" | "skipped" | "failed";
  topic: string | null;
  category: string | null;
  contentId: string | null;
  title: string | null;
  coverUri: string | null;
  reason: string | null;
  error: string | null;
  notifyEmail: string | null;
  /** false for routine skips (disabled / not due / already running): no email, no history row. */
  notify: boolean;
  reviewUrl: string | null;
}

// ---------------------------------------------------------------- pure helpers (unit-tested)

/**
 * "Every N days": due once N calendar days (IST) have passed since the last automated post and it is past the
 * preferred time today. The task checks every 15 minutes, so the post goes out at the first check after that time.
 */
export function isDue(lastPostAt: Date | null, intervalDays: number, now = new Date(), preferredTime = "00:00"): boolean {
  if (minutesIST(now) < parseHHMM(preferredTime)) return false;
  if (!lastPostAt) return true;
  return istDayNumber(now) - istDayNumber(new Date(lastPostAt)) >= intervalDays;
}

/**
 * Next queue topic: queued first (then suggested if allowed), in queue order, never a live-trend row, never the
 * last post's category. Inside a batch: never similar to a post already made in it, and categories not yet used
 * in the batch come first.
 */
export function pickTopic(
  topics: AutoBlogTopic[],
  lastCategory: string | null,
  useSuggested: boolean,
  batch?: { titles: string[]; categories: string[] }
): AutoBlogTopic | null {
  const rank = (t: AutoBlogTopic) => (t.status === "queued" ? 0 : 1);
  const norm = (c: string | null | undefined) => (c || "").trim().toLowerCase();
  const last = norm(lastCategory);
  const usedCats = new Set((batch?.categories || []).map(norm));
  const candidates = topics
    // live rows are created by the live-trend pipeline itself (and marked used), never picked from the queue
    .filter((t) => t.source !== "live" && (t.status === "queued" || (useSuggested && t.status === "suggested")))
    .filter((t) => !(batch?.titles || []).some((title) => isSimilar(title, t.title)))
    .filter((t) => norm(t.category) !== last)
    .sort((a, b) => rank(a) - rank(b) || a.position - b.position);
  return candidates.find((t) => !usedCats.has(norm(t.category))) || candidates[0] || null;
}

const STRATEGY_RE = /\b(strateg|hir(e|ing)|team|talent|gtm|go-to-market|market|industry|trend|leader|business|roi|budget|culture|career|vendor|buyer|sales|adoption)/i;
/** Auto: stock photo for strategy / industry / team posts, diagram for technical / how-it-works posts. */
export function chooseCoverType(pref: CoverPreference, topic: Pick<AutoBlogTopic, "title" | "category" | "notes">): "diagram" | "stock" | "photo" {
  if (pref !== "auto") return pref;
  // Title + category only: angle notes are full of words like "teams" that don't make a post a team/strategy post.
  return STRATEGY_RE.test(`${topic.title} ${topic.category}`) ? "stock" : "diagram";
}

export { isSimilar };

// ---------------------------------------------------------------- topic suggestions

/** Asks the LLM for 5 Neno-related topics unlike existing posts/topics; saves them as "suggested". */
export async function suggestTopics(workspaceId: string): Promise<AutoBlogTopic[]> {
  const existing = await AutoBlogService.existingTitles(workspaceId);
  const raw = await callAiStructured<{ topics?: Array<{ title?: string; category?: string; notes?: string }> }>({
    systemPrompt: `You plan blog posts for Neno Technology, which helps companies with: agentic AI, LLM fine-tuning and deployment, hiring AI engineers, AI go-to-market, and security and cloud for AI.
Suggest 8 specific, practical blog topics for CTOs and engineering leaders. Each must be clearly different from every existing title listed. No hype words.
Return JSON: {"topics":[{"title":"...","category":"one of: ${NENO_CATEGORIES.join(" | ")}","notes":"one sentence on the angle"}]}`,
    userPrompt: `Existing titles (avoid anything similar):\n${existing.slice(0, 300).map((t) => `- ${t}`).join("\n") || "(none)"}`,
  });
  const picked: Array<{ title: string; category: string; notes: string }> = [];
  for (const t of raw?.topics || []) {
    const title = String(t.title || "").trim();
    if (!title || [...existing, ...picked.map((p) => p.title)].some((e) => isSimilar(e, title))) continue;
    const category = NENO_CATEGORIES.find((c) => c.toLowerCase() === String(t.category || "").toLowerCase()) || NENO_CATEGORIES[0];
    picked.push({ title: title.slice(0, 200), category, notes: String(t.notes || "").slice(0, 500) });
    if (picked.length === 5) break;
  }
  const saved: AutoBlogTopic[] = [];
  for (const p of picked) saved.push(await AutoBlogService.addTopic(workspaceId, { ...p, status: "suggested", source: "llm" }));
  return saved;
}

// ---------------------------------------------------------------- the run

/** Stock cover for an existing draft (best-scored unused photo), else an AI photo (a diagram when the image quota is hit). Saved as a new version. */
async function applyStockCover(contentId: string, title: string, warnings: string[], imageLimited = false): Promise<void> {
  const version = await VersionService.getLatest(contentId);
  if (!version) throw new Error("Draft version missing after generation");
  const post = { title, article: version.content, workspaceId: AUTO_BLOG_WORKSPACE };
  let cover: BlogVisual | null = null;
  try {
    const { candidates } = await findStockCandidates(post, contentId);
    for (const c of candidates.slice(0, 3)) {
      cover = await selectStockPhoto(c.provider, c.id, AUTO_BLOG_WORKSPACE, contentId).catch(() => null);
      if (cover) break;
    }
    if (!cover) warnings.push("Cover: no suitable stock photo found.");
  } catch (err) {
    warnings.push(`Cover: stock search failed (${err instanceof Error ? err.message : err}).`);
  }
  // A stock fallback is reported but not a failure: only a missing cover blocks auto-publish.
  if (!cover) {
    cover = await makeCover(post, imageLimited ? "diagram" : "photo", []); // falls back to the other type once
    warnings.push(cover ? `Used ${cover.kind === "photo" ? "an AI photo" : `a ${cover.kind}`} instead.` : "Cover: no cover could be generated.");
    if (!cover) return;
  }
  await MediaService.create({
    workspaceId: AUTO_BLOG_WORKSPACE,
    contentId,
    type: "featured_image",
    title: `${title} — Cover (${cover.kind})`,
    prompt: cover.caption || cover.alt,
    altText: cover.alt,
    aspectRatio: "16:9",
    style: "editorial_photo",
    storageKey: `generated/${contentId}_${cover.hash.slice(0, 12)}.webp`,
    publicUrl: cover.dataUri,
    fileSize: Math.round((cover.dataUri.length * 3) / 4),
    mimeType: cover.dataUri.startsWith("data:") ? "image/webp" : "image/jpeg",
    metadata: cover.stock ? { stockKey: stockKey(cover.stock.provider, cover.stock.id), credit: cover.credit } : undefined,
  });
  const meta = { ...((version.seo_metadata || {}) as Record<string, unknown>), ...coverMetadata(cover) };
  await VersionService.createVersion({ contentId, content: version.content, seoMetadata: meta, createdBy: AUTO_BLOG_USER });
}

/** Same steps as POST /api/content/[id]/publish-website, using the unchanged WebsiteSyncService. */
async function publishToWebsite(contentId: string): Promise<void> {
  const dbItem = await ContentService.getById(AUTO_BLOG_WORKSPACE, contentId);
  const dbVersion = await VersionService.getLatest(contentId);
  if (!dbItem || !dbVersion) throw new Error("Draft not found for publishing");
  const item: ContentItem = {
    id: dbItem.id,
    workspaceId: dbItem.workspace_id,
    type: dbItem.type,
    title: dbItem.title,
    slug: dbItem.slug,
    status: "approved",
    category: dbItem.category,
    excerpt: dbItem.excerpt,
    currentVersionId: dbItem.current_version_id,
    createdBy: dbItem.created_by,
    createdAt: new Date(dbItem.created_at).toISOString(),
    updatedAt: new Date(dbItem.updated_at).toISOString(),
  };
  const version: ContentVersion = {
    id: dbVersion.id,
    contentId: dbVersion.content_id,
    versionNumber: dbVersion.version_number,
    content: dbVersion.content,
    seoMetadata: (dbVersion.seo_metadata || {}) as ContentVersion["seoMetadata"],
    generationRunId: dbVersion.generation_run_id,
    createdBy: dbVersion.created_by,
    createdAt: new Date(dbVersion.created_at).toISOString(),
  };
  await ContentService.updateStatus(AUTO_BLOG_WORKSPACE, contentId, "approved");
  try {
    const author = (await dataStore.findUserById(AUTO_BLOG_USER))?.name;
    await WebsiteSyncService.publishBlog(item, version, AUTO_BLOG_WORKSPACE, author);
    await ContentService.updateSyncState(AUTO_BLOG_WORKSPACE, contentId, { website_synced_at: new Date(), website_sync_error: null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await ContentService.updateSyncState(AUTO_BLOG_WORKSPACE, contentId, { website_synced_at: null, website_sync_error: msg }).catch(() => {});
    await ContentService.updateStatus(AUTO_BLOG_WORKSPACE, contentId, "in_review").catch(() => {});
    throw err;
  }
}


interface BatchContext {
  titles: string[]; // posts already made in this batch: no similar title again
  categories: string[]; // rotate categories inside the batch
}

const newResult = (trigger: AutoBlogResult["trigger"]): AutoBlogResult => ({
  trigger, startedAt: new Date(), durationMs: 0, mode: null, status: "skipped",
  topic: null, category: null, contentId: null, title: null, coverUri: null, reason: null, error: null,
  notifyEmail: null, notify: false, reviewUrl: null,
});

/**
 * One post: pick a topic, run the full pipeline, then draft or publish. Fills `r` and never throws,
 * so one failed post never stops the rest of a batch.
 */
async function makeOnePost(settings: AutoBlogSettings, r: AutoBlogResult, limits: CoverLimits, batch?: BatchContext): Promise<void> {
  const startedAt = Date.now();
  r.mode = settings.mode;
  r.notifyEmail = settings.notify_email;
  try {
    // Settings rows from before migration 004 have no topic_source: same default as the column.
    const topicSource = settings.topic_source || "queue_then_live";
    let topic: AutoBlogTopic | null = null;
    let live: LiveTopicPick | null = null;
    let queueReason = "";
    if (topicSource !== "live") {
      let topics = await AutoBlogService.listTopics(AUTO_BLOG_WORKSPACE);
      // With live trends as the fallback there's no need to generate queue suggestions.
      if (topicSource === "queue" && !topics.some((t) => t.status === "queued" || t.status === "suggested")) {
        console.log("[auto-blog] queue empty, asking the LLM for 5 topic suggestions");
        await suggestTopics(AUTO_BLOG_WORKSPACE);
        topics = await AutoBlogService.listTopics(AUTO_BLOG_WORKSPACE);
      }
      topic = pickTopic(topics, settings.last_category, settings.use_suggested, batch);
      if (!topic) {
        queueReason = topics.some((t) => t.status !== "used")
          ? `No usable queue topic: ${settings.use_suggested ? "" : "suggested topics are not enabled, and "}the queued topics (if any) are in "${settings.last_category}", the previous post's category${batch?.titles.length ? ", or too similar to a post already made today" : ""}.`
          : "Topic queue is empty.";
      }
    }
    if (!topic && topicSource !== "queue") {
      if (queueReason) console.log(`[auto-blog] ${queueReason} Trying live trends.`);
      const res = await pickLiveTopic(AUTO_BLOG_WORKSPACE, settings.last_category, batch?.categories);
      live = res.pick;
      if (!live) queueReason = [queueReason, `Live trends: ${res.reason}`].filter(Boolean).join(" ");
    }
    const chosen = topic || live;
    if (!chosen) {
      r.notify = true;
      done(r, `${queueReason} Add a topic on the Automation page${topicSource === "queue" && !settings.use_suggested ? " or enable suggested topics" : ""}.`);
      return;
    }
    r.topic = live ? `${chosen.title} (live trend: ${live.trend.title})` : chosen.title;
    r.category = chosen.category;

    const wanted = chooseCoverType(settings.cover_preference, chosen);
    const coverType = coverWithLimits(wanted, limits);
    const coverNote = coverType !== wanted ? `Cover: a ${coverType} instead of ${wanted === "photo" ? "an AI photo" : "a stock photo"} (quota or provider unavailable).` : "";
    const brand = await dataStore.getBrandSettings(AUTO_BLOG_WORKSPACE);
    console.log(`[auto-blog] generating "${chosen.title}" (${chosen.category}), cover: ${coverType}${live ? ", grounded on live trend" : ""}`);
    const gen = await runBlogGenerationPipeline({
      workspaceId: AUTO_BLOG_WORKSPACE,
      userId: AUTO_BLOG_USER,
      topic: chosen.notes ? `${chosen.title}. Angle: ${chosen.notes}` : chosen.title,
      audience: brand?.audience || "CTOs, engineering leaders and senior engineers",
      tone: brand?.tone || "Authoritative, practical",
      desiredLength: "medium",
      category: chosen.category,
      grounding: live?.grounding,
      researchPreference: true,
      autoGenerateImage: true,
      coverType: coverType === "stock" ? "none" : coverType,
      strict: true,
    });
    r.contentId = gen.contentId;
    r.title = gen.result.title;
    r.reviewUrl = `${APP_URL}/content/${gen.contentId}?review=1`;
    r.notify = true;
    // A live trend is saved only once its post exists, so a failed run leaves no stray row in the queue.
    const usedId = topic
      ? topic.id
      : (await AutoBlogService.addTopic(AUTO_BLOG_WORKSPACE, {
          title: live!.title, category: live!.category, notes: live!.notes, source: "live",
          trendHeadline: live!.trend.title, sourceUrls: live!.grounding.sources.map((s) => s.url),
        })).id;
    await AutoBlogService.markTopicUsed(usedId, gen.contentId);
    await AutoBlogService.updateSettings(AUTO_BLOG_WORKSPACE, { last_post_at: r.startedAt, last_category: chosen.category });

    const extraWarnings: string[] = coverNote ? [coverNote] : [];
    if (coverType === "stock") await applyStockCover(gen.contentId, gen.result.title, extraWarnings, limits.imageLimited);

    const meta = ((await VersionService.getLatest(gen.contentId))?.seo_metadata || {}) as Record<string, unknown>;
    r.coverUri = typeof meta.coverImage === "string" ? meta.coverImage : null;
    const banned = (meta.bannedPhrases as string[]) || [];
    const visualWarnings = [...((meta.visualWarnings as string[]) || []), ...extraWarnings.filter((w) => w.includes("no cover"))];
    const problems = [
      ...(banned.length ? [`banned phrases remain: ${banned.join(", ")}`] : []),
      ...(r.coverUri ? [] : ["no cover image"]),
      ...visualWarnings,
    ];

    if (settings.mode === "publish" && problems.length === 0) {
      try {
        await publishToWebsite(gen.contentId);
        r.status = "published";
        r.reason = extraWarnings.join(" ") || null;
        return;
      } catch (err) {
        problems.push(`website publish failed: ${err instanceof Error ? err.message : err}`);
      }
    }
    await ContentService.updateStatus(AUTO_BLOG_WORKSPACE, gen.contentId, "in_review");
    r.status = "draft";
    r.reason = settings.mode === "publish"
      ? `Ready for review. Not auto-published because: ${problems.join("; ")}.`
      : ["Ready for review.", ...problems.map((p) => `Note: ${p}.`), ...extraWarnings.filter((w) => !w.includes("no cover"))].join(" ");
  } catch (err) {
    r.status = "failed";
    r.error = err instanceof Error ? err.message : String(err);
    r.notify = true;
    console.error("[auto-blog] post failed:", r.error);
  } finally {
    r.durationMs = Date.now() - startedAt;
    // A Gemini image 429 during this post: no more AI photos for the rest of the batch (and later runs, if 006 is applied).
    if (imageQuota.rateLimitedAt >= startedAt && !limits.imageLimited) {
      limits.imageLimited = true;
      console.warn("[auto-blog] Gemini image quota hit: using stock/diagram covers from now on");
      if (settings.posts_per_run !== undefined) {
        await AutoBlogService.updateSettings(AUTO_BLOG_WORKSPACE, { image_limited_until: new Date(Date.now() + 6 * 3_600_000) }).catch(() => {});
      }
    }
  }
}

async function batchContext(batchAt: Date): Promise<BatchContext> {
  const made = (await AutoBlogService.batchSlots(AUTO_BLOG_WORKSPACE, batchAt)).filter((s) => s.status === "done" && s.post_title);
  return { titles: made.map((s) => s.post_title!), categories: made.map((s) => s.post_category || "").filter(Boolean) };
}

/** One summary per batch day, once every slot of the batch has finished (done / failed / skipped). */
async function sendBatchSummaryIfComplete(settings: AutoBlogSettings): Promise<void> {
  if (!settings.last_batch_at) return;
  const batchAt = new Date(settings.last_batch_at);
  if (settings.last_digest_batch_at && new Date(settings.last_digest_batch_at).getTime() === batchAt.getTime()) return;
  const slots = await AutoBlogService.batchSlots(AUTO_BLOG_WORKSPACE, batchAt);
  if (!slots.length || slots.some((s) => s.status === "pending" || s.status === "running")) return;
  await notifyBatchSummary({
    batchAt,
    mode: settings.mode,
    notifyEmail: settings.notify_email,
    items: slots.map((s) => ({
      status: s.status,
      title: s.post_title,
      url: s.content_id ? `${APP_URL}/content/${s.content_id}?review=1` : null,
      note: s.note,
    })),
  });
  await AutoBlogService.updateSettings(AUTO_BLOG_WORKSPACE, { last_digest_batch_at: batchAt });
}

/** Overall result of a multi-slot run (each post already has its own history row). */
function summarize(r: AutoBlogResult, posts: AutoBlogResult[]): void {
  const made = posts.filter((p) => p.contentId);
  r.status = made.some((p) => p.status === "published") ? "published" : made.length ? "draft" : posts.every((p) => p.status === "failed") ? "failed" : "skipped";
  r.title = made.map((p) => p.title).join(" | ") || null;
  r.topic = posts.map((p) => p.topic).filter(Boolean).join(" | ") || null;
  r.contentId = made[0]?.contentId || null;
  r.reviewUrl = made[0]?.reviewUrl || null;
  const failed = posts.filter((p) => p.status === "failed");
  const skipped = posts.filter((p) => p.status === "skipped");
  r.reason = [`${made.length} of ${posts.length} posts made.`, ...skipped.map((p) => `Skipped: ${p.reason}`)].join(" ");
  r.error = failed.map((p) => p.error).join(" | ") || null;
  r.notify = false;
}

/**
 * Automated blog run (no UI dependency). Scheduled checks run every 15 minutes:
 * - "Every N days" with migration 006: on a due day, plans posts_per_run slots, then runs every due slot one at a time;
 * - "Every N days" before 006: one post at the first check after the preferred time;
 * - "Posts per week": the due slot of this week's random plan.
 * `force` (Run now / --force) makes one post now, outside any plan; it never skips the lock. Never throws.
 */
export async function runAutoBlog(opts: { trigger?: "scheduled" | "manual"; force?: boolean } = {}): Promise<AutoBlogResult> {
  const t0 = Date.now();
  const r = newResult(opts.trigger || "scheduled");
  let locked = false;
  try {
    let settings = await AutoBlogService.getSettings(AUTO_BLOG_WORKSPACE);
    r.mode = settings.mode;
    r.notifyEmail = settings.notify_email;
    const weekly = settings.schedule_type === "weekly";
    const batchMode = !weekly && settings.posts_per_run !== undefined; // migration 006 applied
    if (!opts.force && !settings.enabled) return done(r, "Automation is disabled.");

    let dayDue = false;
    if (!opts.force && !weekly) {
      const spread = batchMode && settings.spread_mode !== "all_at_once";
      const startTime = spread ? settings.window_start || "09:00" : settings.preferred_time;
      const last = batchMode ? settings.last_batch_at ?? settings.last_post_at : settings.last_post_at;
      dayDue = isDue(last, settings.interval_days, new Date(), startTime);
      const notDue = `Not due yet: last ${batchMode ? "batch" : "automated post"} ${last ? new Date(last).toISOString() : "never"}, every ${settings.interval_days} days from ${startTime} IST.`;
      if (batchMode) {
        if (!dayDue && !(await AutoBlogService.dueBatchSlots(AUTO_BLOG_WORKSPACE)).length) return done(r, notDue);
      } else {
        if (!dayDue) return done(r, notDue);
        // Checks run every 15 minutes: after a failure, wait 3 hours instead of failing (and emailing) at every check.
        const [lastRun] = await AutoBlogService.listRuns(AUTO_BLOG_WORKSPACE, 1);
        if (lastRun?.status === "failed" && lastRun.trigger === "scheduled" && Date.now() - new Date(lastRun.started_at).getTime() < 3 * 3_600_000) {
          return done(r, "Last scheduled run failed less than 3 hours ago; waiting before retrying.");
        }
      }
    }

    const lock = await AutoBlogService.acquireLock(AUTO_BLOG_WORKSPACE);
    if (!lock.acquired) return done(r, "Another automated run is in progress.");
    locked = true;
    if (lock.clearedStale) {
      console.warn("[auto-blog] cleared a stale lock (older than 30 minutes)");
      if (weekly || batchMode) await AutoBlogService.resetRunningSlots(AUTO_BLOG_WORKSPACE);
    }

    let slots: PlanRow[] = [];
    if (weekly && !opts.force) {
      const plan = (await AutoBlogService.ensureWeekPlan(settings)).filter((p) => p.kind !== "batch");
      const acts = resolveSlots(weeklyOf(settings), plan.map((p) => ({ ...p, slot_at: new Date(p.slot_at) })), new Date());
      for (const m of acts.moves) {
        await AutoBlogService.updateSlot(m.id, { slot_at: m.slotAt, note: "Moved: the PC was off at the planned time" });
        console.log(`[auto-blog] missed slot ${m.id} moved to ${m.slotAt.toISOString()}`);
      }
      for (const id of acts.skips) {
        await AutoBlogService.updateSlot(id, { status: "skipped", note: "Missed, and no free allowed day was left this week" });
        console.log(`[auto-blog] missed slot ${id} skipped`);
      }
      if (!acts.due) return done(r, "No planned slot is due.");
      slots = plan.filter((p) => p.id === acts.due!.id);
    }
    if (batchMode && !opts.force) {
      if (dayDue) {
        const { planned, dropped } = await AutoBlogService.createBatch(settings);
        console.log(`[auto-blog] day plan: ${planned} post(s) planned${dropped ? `, ${dropped} didn't fit in today's window` : ""}`);
      }
      slots = await AutoBlogService.dueBatchSlots(AUTO_BLOG_WORKSPACE);
      if (!slots.length) {
        await sendBatchSummaryIfComplete(await AutoBlogService.getSettings(AUTO_BLOG_WORKSPACE));
        return done(r, "No batch slot due yet.");
      }
    }
    if (!isAiConfigured()) throw new Error("No AI API key configured (GEMINI_API_KEY / OPENAI_API_KEY / OPENROUTER_API_KEY).");

    const limits = await checkLimits(settings.image_limited_until);
    for (const n of limits.notes) console.log(`[auto-blog] ${n}`);

    if (!slots.length) {
      // Run now, or "Every N days" before migration 006: one post; history + notification in `finally`.
      await makeOnePost(settings, r, limits);
      return r;
    }

    const posts: AutoBlogResult[] = [];
    for (const slot of slots) {
      // One at a time; the heartbeat keeps a long batch from looking like a crashed run.
      await AutoBlogService.touchLock(AUTO_BLOG_WORKSPACE);
      await AutoBlogService.updateSlot(slot.id, { status: "running" });
      console.log(`[auto-blog] running ${slot.kind === "batch" ? "batch" : "planned"} slot ${slot.id} (${new Date(slot.slot_at).toISOString()})`);
      settings = await AutoBlogService.getSettings(AUTO_BLOG_WORKSPACE); // last_category moves with every post
      const one = newResult(r.trigger);
      const batch = slot.kind === "batch" && slot.batch_at ? await batchContext(new Date(slot.batch_at)) : undefined;
      await makeOnePost(settings, one, limits, batch);
      await finishSlot(slot, one).catch((e) => console.error("[auto-blog] could not update the plan slot:", e.message));
      if (one.notify) {
        await AutoBlogService.recordRun(AUTO_BLOG_WORKSPACE, {
          trigger: one.trigger, started_at: one.startedAt, duration_ms: one.durationMs, mode: one.mode, status: one.status,
          topic: one.topic, content_id: one.contentId, title: one.title, reason: one.reason, error: one.error,
        }).catch((e) => console.error("[auto-blog] could not save run history:", e.message));
        // Batch posts are reported in one summary per day instead of one email each.
        if (slot.kind !== "batch") await notifyRun(one).catch((e) => console.error("[auto-blog] notification failed:", e.message));
      }
      posts.push(one);
    }
    if (batchMode) await sendBatchSummaryIfComplete(await AutoBlogService.getSettings(AUTO_BLOG_WORKSPACE));
    summarize(r, posts);
    return r;
  } catch (err) {
    r.status = "failed";
    r.error = err instanceof Error ? err.message : String(err);
    r.notify = true;
    console.error("[auto-blog] run failed:", r.error);
    return r;
  } finally {
    r.durationMs = Date.now() - t0;
    if (locked) await AutoBlogService.releaseLock(AUTO_BLOG_WORKSPACE).catch((e) => console.error("[auto-blog] lock release failed:", e.message));
    if (r.notify) {
      await AutoBlogService.recordRun(AUTO_BLOG_WORKSPACE, {
        trigger: r.trigger, started_at: r.startedAt, duration_ms: r.durationMs, mode: r.mode, status: r.status,
        topic: r.topic, content_id: r.contentId, title: r.title, reason: r.reason, error: r.error,
      }).catch((e) => console.error("[auto-blog] could not save run history:", e.message));
      await notifyRun(r).catch((e) => console.error("[auto-blog] notification failed:", e.message));
    }
  }
}

/**
 * Slot outcome: a post was made -> done; no topic -> skipped; failure -> pending again for the next check,
 * failed after 2 attempts for batch slots ("retry once") and 3 for weekly slots.
 */
export async function finishSlot(slot: PlanRow, r: AutoBlogResult): Promise<void> {
  if (r.contentId) return AutoBlogService.updateSlot(slot.id, { status: "done", content_id: r.contentId, note: r.status === "published" ? "Published" : "Draft ready for review" });
  if (r.status === "skipped") return AutoBlogService.updateSlot(slot.id, { status: "skipped", note: r.reason });
  const attempts = (slot.attempts || 0) + 1;
  const max = slot.kind === "batch" ? 2 : 3;
  await AutoBlogService.updateSlot(slot.id, { status: attempts >= max ? "failed" : "pending", attempts, note: `Attempt ${attempts}: ${r.error}` });
}

function done(r: AutoBlogResult, reason: string): AutoBlogResult {
  r.status = "skipped";
  r.reason = reason;
  return r;
}
