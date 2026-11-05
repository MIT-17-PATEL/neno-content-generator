import { createSuite, assert, assertEquals } from "./test-utils";
import { chooseCoverType, isDue, isSimilar, pickTopic } from "../src/lib/auto-blog/run-auto-blog";
import type { AutoBlogTopic } from "../src/services/auto-blog-service";
import type { LiveTrendItem } from "../src/services/trending-topics-service";
import { isPublicHttpUrl, shortlistTrends, titleIsClean } from "../src/lib/auto-blog/live-trends";
import { sourcesSection } from "../src/lib/ai/blog-generator";
import { PlanSlot, WeeklySettings, pickCount, planDay, planWeek, resolveSlots, weekStartIST } from "../src/lib/auto-blog/weekly-plan";
import { coverWithLimits } from "../src/lib/auto-blog/limits";
import { batchSummaryText } from "../src/lib/auto-blog/notify";

export const { suite, test } = createSuite("Auto Blog");

const topic = (id: string, category: string, status: AutoBlogTopic["status"] = "queued", position = 0, source: AutoBlogTopic["source"] = "manual"): AutoBlogTopic => ({
  id, workspace_id: "ws", title: `Topic ${id}`, category, notes: null, status, source, position, content_id: null, used_at: null,
});

test("pickTopic: queue order, skips last category, used and live-trends topics", () => {
  const topics = [
    topic("used", "AI GTM", "used", 0),
    topic("a", "Agentic AI", "queued", 2),
    topic("b", "AI GTM", "queued", 3),
    topic("trend", "Security & Cloud for AI", "queued", 1, "live"),
  ];
  assertEquals(pickTopic(topics, null, false)?.id, "a");
  assertEquals(pickTopic(topics, "agentic ai", false)?.id, "b", "two consecutive posts never share a category");
  assertEquals(pickTopic([topic("a", "Agentic AI")], "Agentic AI", false), null);
});

test("pickTopic: suggested topics only when enabled, and after queued ones", () => {
  const topics = [topic("s", "AI GTM", "suggested", 0), topic("q", "Agentic AI", "queued", 5)];
  assertEquals(pickTopic(topics, null, true)?.id, "q");
  assertEquals(pickTopic(topics, "Agentic AI", true)?.id, "s");
  assertEquals(pickTopic(topics, "Agentic AI", false), null);
});

test("isDue: N calendar days (IST) after the last post, from the preferred time on", () => {
  const now = new Date("2026-11-10T10:00:00+05:30");
  assert(isDue(null, 3, now), "first run is due");
  assert(isDue(new Date("2026-11-07T10:05:00+05:30"), 3, now), "3 days minus 5 minutes counts as due");
  assert(!isDue(new Date("2026-11-08T10:00:00+05:30"), 3, now), "2 days is not due");
  assert(!isDue(null, 3, new Date("2026-11-10T09:45:00+05:30"), "10:00"), "15-minute check before the preferred time");
  assert(isDue(null, 3, new Date("2026-11-10T10:15:00+05:30"), "10:00"), "first check after the preferred time");
  assert(!isDue(new Date("2026-11-07T23:50:00+05:30"), 3, new Date("2026-11-09T23:55:00+05:30")), "IST calendar days, not 72h windows");
});

// ---------------------------------------------------------------- weekly plan

const seeded = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const WEEK: WeeklySettings = { posts_per_week: 3, random_count: false, posts_min: 2, posts_max: 4, window_start: "09:00", window_end: "19:00", allowed_days: [1, 2, 3, 4, 5, 6, 7] };
const istDay = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", weekday: "short" });
const istHM = (d: Date) => d.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });

test("weekStartIST: Monday 00:00 Asia/Kolkata, including just after midnight IST on Monday", () => {
  assertEquals(weekStartIST(new Date("2026-11-05T12:00:00+05:30")).toISOString(), "2026-11-01T18:30:00.000Z"); // Thu -> Mon 2 Nov IST
  assertEquals(weekStartIST(new Date("2026-11-09T00:10:00+05:30")).toISOString(), "2026-11-08T18:30:00.000Z"); // Mon 00:10 IST (Sun in UTC)
  assertEquals(weekStartIST(new Date("2026-11-08T23:59:00+05:30")).toISOString(), "2026-11-01T18:30:00.000Z"); // Sun 23:59 IST
});

test("planWeek: N different allowed days, times in the window on 5-minute steps", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const s = { ...WEEK, allowed_days: [1, 2, 3, 5, 6] };
    const slots = planWeek(s, { now: new Date("2026-11-09T00:30:00+05:30"), count: 3, rng: seeded(seed) });
    assertEquals(slots.length, 3);
    assertEquals(new Set(slots.map(istDay)).size, 3, "never two posts on one day");
    for (const d of slots) {
      assert(["Mon", "Tue", "Wed", "Fri", "Sat"].includes(istDay(d)), `allowed day (${istDay(d)})`);
      assert(istHM(d) >= "09:00" && istHM(d) <= "19:00", `in window (${istHM(d)})`);
      assertEquals(d.getUTCMinutes() % 5, 0, "rounded to 5 minutes");
    }
  }
});

test("planWeek: mid-week uses remaining days only, today only after now, skips taken days", () => {
  const now = new Date("2026-11-13T17:00:00+05:30"); // Fri 17:00
  for (let seed = 1; seed <= 30; seed++) {
    const slots = planWeek(WEEK, { now, count: 5, rng: seeded(seed) });
    assert(slots.length === 3, `only Fri, Sat, Sun left (got ${slots.length})`);
    assert(slots.every((d) => d.getTime() > now.getTime()), "nothing in the past");
  }
  const late = planWeek(WEEK, { now: new Date("2026-11-13T18:58:00+05:30"), count: 5, rng: seeded(3) });
  assertEquals(late.map(istDay).join(), "Sat,Sun", "today's window has closed");
  const taken = planWeek(WEEK, { now, count: 5, takenDays: new Set([5]), rng: seeded(4) }); // Saturday already has a post
  assertEquals(taken.map(istDay).join(), "Fri,Sun");
});

test("pickCount: fixed, or random within Min-Max", () => {
  assertEquals(pickCount(WEEK), 3);
  const counts = new Set(Array.from({ length: 200 }, (_, i) => pickCount({ ...WEEK, random_count: true, posts_min: 2, posts_max: 4 }, seeded(i + 1))));
  assertEquals(Array.from(counts).sort().join(), "2,3,4");
});

// ---------------------------------------------------------------- posts per run ("Every N days")

test("planDay spread: random 5-minute times in the window, at least 45 minutes apart", () => {
  const now = new Date("2026-11-10T08:00:00+05:30");
  for (let seed = 1; seed <= 50; seed++) {
    const { times, dropped } = planDay({ count: 5, spread: true, window_start: "09:00", window_end: "19:00" }, now, seeded(seed));
    assertEquals(times.length, 5);
    assertEquals(dropped, 0);
    for (let i = 0; i < times.length; i++) {
      assert(istHM(times[i]) >= "09:00" && istHM(times[i]) <= "19:00", `in window (${istHM(times[i])})`);
      assertEquals(times[i].getUTCMinutes() % 5, 0, "5-minute steps");
      if (i) assert(times[i].getTime() - times[i - 1].getTime() >= 45 * 60_000, "45+ minutes apart");
    }
    assertEquals(new Set(times.map(istDay)).size, 1, "all on the due day");
  }
});

test("planDay: late start fits fewer posts (rest dropped); all-at-once runs every post now", () => {
  const late = planDay({ count: 5, spread: true, window_start: "09:00", window_end: "19:00" }, new Date("2026-11-10T17:00:00+05:30"), seeded(2));
  assertEquals(`${late.times.length}+${late.dropped}`, "3+2", "17:05-19:00 fits 3 posts 45 minutes apart");
  assert(late.times.every((t) => istHM(t) >= "17:05"), "nothing before now");
  assertEquals(planDay({ count: 3, spread: true, window_start: "09:00", window_end: "19:00" }, new Date("2026-11-10T19:30:00+05:30")).dropped, 3);
  const now = new Date("2026-11-10T10:00:00+05:30");
  const all = planDay({ count: 4, spread: false, window_start: "09:00", window_end: "19:00" }, now);
  assertEquals(all.times.length, 4);
  assert(all.times.every((t) => t.getTime() === now.getTime()), "due immediately, run back to back");
  assertEquals(planDay({ count: 25, spread: false, window_start: "09:00", window_end: "19:00" }, now).times.length, 10, "max 10 per run");
});

test("pickTopic in a batch: no title similar to today's posts, unused categories first", () => {
  const topics = [
    { ...topic("dup", "AI GTM", "queued", 1), title: "Fine-tuning LLMs on private data" },
    { ...topic("same-cat", "Agentic AI", "queued", 2), title: "Evaluating coding agents" },
    { ...topic("fresh", "Security & Cloud for AI", "queued", 3), title: "Sandboxing agent tool calls" },
  ];
  const batch = { titles: ["Fine-tuning LLMs on your private data"], categories: ["Agentic AI", "LLM Fine-tuning & Deployment"] };
  assertEquals(pickTopic(topics, "LLM Fine-tuning & Deployment", false, batch)?.id, "fresh");
  assertEquals(pickTopic(topics.slice(0, 2), "LLM Fine-tuning & Deployment", false, batch)?.id, "same-cat", "falls back to a used category, never a similar title");
});

test("covers under quota limits: AI photo -> stock -> diagram, stock -> diagram", () => {
  assertEquals(coverWithLimits("photo", { imageLimited: true, stockAvailable: true }), "stock");
  assertEquals(coverWithLimits("photo", { imageLimited: true, stockAvailable: false }), "diagram");
  assertEquals(coverWithLimits("stock", { imageLimited: false, stockAvailable: false }), "diagram");
  assertEquals(coverWithLimits("photo", { imageLimited: false, stockAvailable: false }), "photo");
  assertEquals(coverWithLimits("diagram", { imageLimited: true, stockAvailable: false }), "diagram");
});

test("daily summary: counts made / failed / skipped", () => {
  const { subject, line } = batchSummaryText({
    batchAt: new Date("2026-11-09T18:30:00Z"), mode: "draft", notifyEmail: null,
    items: [
      { status: "done", title: "A", url: "u", note: null }, { status: "done", title: "B", url: "u", note: null },
      { status: "failed", title: null, url: null, note: "Attempt 2: timeout" }, { status: "skipped", title: null, url: null, note: "No usable topic" },
    ],
  });
  assertEquals(subject, "Neno Auto Blog 10 Nov: 2 of 4 posts made, 1 failed, 1 skipped");
  assertEquals(line, "2 of 4 posts made, 1 failed, 1 skipped (drafts for review).");
});

test("resolveSlots: today's past slot is due; an earlier day's moves to the next free day, else skipped", () => {
  const now = new Date("2026-11-11T12:00:00+05:30"); // Wed 12:00
  const at = (s: string) => new Date(s);
  const slots: PlanSlot[] = [
    { id: "mon", slot_at: at("2026-11-09T10:00:00+05:30"), status: "pending" }, // PC was off
    { id: "wed", slot_at: at("2026-11-11T11:30:00+05:30"), status: "pending" }, // due now
    { id: "thu", slot_at: at("2026-11-12T15:00:00+05:30"), status: "pending" },
    { id: "tue", slot_at: at("2026-11-10T10:00:00+05:30"), status: "done" },
  ];
  const a = resolveSlots(WEEK, slots, now, seeded(7));
  assertEquals(a.due?.id, "wed");
  assertEquals(a.moves.length, 1);
  assertEquals(istDay(a.moves[0].slotAt), "Fri", "Wed and Thu are taken, so Friday");
  assertEquals(a.skips.length, 0);

  const full = resolveSlots({ ...WEEK, allowed_days: [1, 3, 4] }, slots, now, seeded(7));
  assertEquals(full.skips.join(), "mon", "no free allowed day left this week");
  const oldWeek = resolveSlots(WEEK, [{ id: "old", slot_at: at("2026-11-06T10:00:00+05:30"), status: "pending" }], now, seeded(1));
  assertEquals(oldWeek.skips.join(), "old", "previous week's slot is skipped, not moved");
});

test("chooseCoverType: auto picks stock for strategy/team, diagram for technical; fixed types pass through", () => {
  assertEquals(chooseCoverType("auto", { title: "How to hire your first AI engineers", category: "Hiring AI Engineers", notes: null }), "stock");
  assertEquals(chooseCoverType("auto", { title: "AI GTM for B2B founders", category: "AI GTM", notes: null }), "stock");
  assertEquals(chooseCoverType("auto", { title: "How LoRA fine-tuning pipelines work", category: "LLM Fine-tuning & Deployment", notes: null }), "diagram");
  assertEquals(chooseCoverType("photo", { title: "anything", category: "Agentic AI", notes: null }), "photo");
  // live run 2026-11-05: a technical post got a stock cover because its angle note said "Teams building..."
  assertEquals(chooseCoverType("auto", { title: "Ripple-65B release and agentic coding performance", category: "Agentic AI", notes: "Teams building agentic AI should evaluate it." }), "diagram");
});

const trend = (title: string, score = 10): LiveTrendItem => ({ title, url: `https://example.com/${score}`, feed: "Hacker News", score });

test("live trends shortlist: drops off-topic and meta posts, AI headlines first, max n", () => {
  const items = [
    trend("SpaceX launches another batch of Starlink satellites", 900),
    trend("Bitcoin hits a new all-time high this week", 800),
    trend("Show HN: A tiny text editor written in Zig", 700),
    trend("Ask HN: What are you working on this month?", 600),
    trend("OpenAI ships a new agents SDK for production workflows", 50),
    trend("Fine-tuning Llama on a single GPU: what we learned", 40),
  ];
  const out = shortlistTrends(items, 3).map((t) => t.title);
  assertEquals(out.join(" | "), "OpenAI ships a new agents SDK for production workflows | Fine-tuning Llama on a single GPU: what we learned | A tiny text editor written in Zig");
  const now = Date.parse("2026-11-05T00:00:00Z");
  const dated = [
    { ...trend("OpenAI's board has fired its CEO after a review"), publishedAt: "2023-11-17T20:00:00Z" },
    { ...trend("New open-weight model tops agentic coding benchmarks"), publishedAt: "2026-11-03T08:00:00Z" },
  ];
  assertEquals(shortlistTrends(dated, 15, now).map((t) => t.title).join(), "New open-weight model tops agentic coding benchmarks", "older than 7 days dropped");
});

test("live trend titles: banned words (incl. navigating/labyrinth/unlocking) rejected", () => {
  assert(titleIsClean("What the new agents SDK means for teams deploying agents in production"), "clean title");
  for (const t of ["Navigating the new agents SDK", "The labyrinth of RAG evaluation", "Unlocking faster inference", "A deep dive into MCP", "Is RAG dead?"]) {
    assert(!titleIsClean(t), `"${t}" should be rejected`);
  }
});

test("source excerpts: only public http(s) URLs are fetched", () => {
  assert(isPublicHttpUrl("https://openai.com/index/new-agents-sdk"), "public https");
  for (const u of ["http://localhost:3001/api", "http://192.168.1.10/", "file:///C:/secrets.txt", "http://[::1]/", "http://router.local/", "not a url"]) {
    assert(!isPublicHttpUrl(u), `${u} should be blocked`);
  }
});

test("grounded posts end with a Sources list of the real URLs", () => {
  const section = sourcesSection({ headline: "x", sources: [{ url: "https://a.dev/post", title: "A [beta] launch", publisher: "a.dev" }] });
  assertEquals(section, "## Sources\n\n- [A beta launch](https://a.dev/post) (a.dev)");
});

test("isSimilar: near-duplicate titles match, different topics don't", () => {
  assert(isSimilar("Fine-tuning LLMs on private data", "Fine-tuning LLMs on your private data"), "near duplicate");
  assert(isSimilar("fine tuning llms private data", "Fine-Tuning LLMs: Private Data"), "slug vs title");
  assert(!isSimilar("Securing agent tool calls in production", "Hiring your first ML platform engineer"), "different");
});
