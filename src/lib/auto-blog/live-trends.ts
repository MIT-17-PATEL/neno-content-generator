import { callAiStructured } from "@/lib/ai/ai-client";
import { BANNED_TEXT, findBannedPhrases } from "@/lib/ai/banned-phrases";
import type { GroundingSources } from "@/lib/ai/blog-generator";
import { LiveTrendItem, TrendingTopicsService } from "@/services/trending-topics-service";
import { AutoBlogService } from "@/services/auto-blog-service";
import { NENO_CATEGORIES } from "@/lib/auto-blog/categories";
import { isSimilar } from "@/lib/auto-blog/similar";

/**
 * Live-trend topics for blog automation: the "Pull Live Trends" feeds -> shortlist of ~15 -> LLM relevance score
 * (keep 7+) -> practitioner-angle rewrite -> dedup (posts + topics used in 60 days) -> category rotation.
 */

export const NENO_SERVICES = [
  "agentic AI development", "AI product development", "LLM fine-tuning and deployment", "RAG and knowledge systems",
  "AI for enterprise software", "cloud and security for AI workloads", "hiring AI/ML engineers and forward-deployed engineers", "AI GTM",
];

// Deterministic net under the LLM's judgement: these never become posts.
export const OFF_TOPIC_RE = /\b(nasa|spacex|rocket|satellite|mars|lunar|moon landing|asteroid|telescope|crypto(currency)?|bitcoin|ethereum|btc|dogecoin|token price|election|president|congress|senate|parliament|minister|trump|biden|celebrity|celebrities|hollywood|gaming|video ?games?|playstation|xbox|nintendo|steam deck|iphone|smartphone|smartwatch|headphones|gadget)\b/i;
const AI_HINT_RE = /\b(ai|llms?|gpt|claude|gemini|llama|models?|agents?|agentic|rag|inference|fine-?tun\w*|ml|machine learning|openai|anthropic|vector|embeddings?|mcp|copilot|kubernetes|cloud|security|vulnerab\w*|gpus?|nvidia|developers?|engineers?|hiring)\b/i;
// The writing prompt's banned words that matter most in headlines ("unlock" alone doesn't catch "unlocking").
const TITLE_BANNED_RE = /navigat|labyrinth|unlock|unleash|game.?chang|revolutioni|deep dive|delve|landscape|realm|seamless/i;

export interface ScoredTrend { item: LiveTrendItem; score: number; reason: string }
export interface LiveTopicPick {
  title: string;
  category: string;
  notes: string;
  relevance: number;
  trend: LiveTrendItem;
  grounding: GroundingSources;
}

const MAX_AGE_MS = 7 * 86_400_000;

/** ~15 candidates: last 7 days only, cleaned, no meta/off-topic posts, AI/software-looking headlines first, then by popularity. */
export function shortlistTrends(items: LiveTrendItem[], n = 15, now = Date.now()): LiveTrendItem[] {
  return items
    .map((it) => ({ ...it, title: TrendingTopicsService.cleanHeadline(it.title) }))
    // The HN "points>50" feed is all-time; old stories are not trends and would ground posts on stale news.
    .filter((it) => !it.publishedAt || now - Date.parse(it.publishedAt) <= MAX_AGE_MS)
    .filter((it) => it.title.length > 18 && !TrendingTopicsService.isMetaPost(it.title) && !OFF_TOPIC_RE.test(it.title))
    .sort((a, b) => Number(AI_HINT_RE.test(b.title)) - Number(AI_HINT_RE.test(a.title)) || b.score - a.score)
    .slice(0, n);
}

export function titleIsClean(title: string): boolean {
  return !TITLE_BANNED_RE.test(title) && findBannedPhrases(title).length === 0 && !/[!?]$/.test(title.trim());
}

/** One LLM call: relevance 1-10 to Neno's services for each shortlisted trend. Unscored items count as 0. */
export async function scoreTrends(items: LiveTrendItem[]): Promise<ScoredTrend[]> {
  if (!items.length) return [];
  const res = await callAiStructured<{ scores?: Array<{ i?: number; score?: number; reason?: string }> }>({
    systemPrompt: `You decide which current tech stories Neno Technology should write about. Neno's services: ${NENO_SERVICES.join("; ")}.
Score each story 1-10 for how directly it relates to building, deploying, securing or staffing AI/software systems in those areas.
9-10: directly about one of the services (e.g. a new agent framework, an LLM deployment incident, a fine-tuning method, AI hiring market data).
7-8: clearly useful to teams doing that work.
1-3: space, consumer gadgets, crypto prices, politics, celebrities, gaming, or general science not about building AI/software systems.
Return JSON: {"scores":[{"i":0,"score":7,"reason":"short reason"}]} with one entry per story.`,
    userPrompt: items.map((it, i) => `${i}. ${it.title}${it.summary ? ` — ${it.summary.slice(0, 200)}` : ""} (${it.feed})`).join("\n"),
  });
  const byIndex = new Map((res?.scores || []).map((s) => [Number(s.i), s]));
  return items.map((item, i) => ({
    item,
    score: Math.max(0, Math.min(10, Number(byIndex.get(i)?.score) || 0)),
    reason: String(byIndex.get(i)?.reason || ""),
  }));
}

/** One LLM call: practitioner-angle title + Neno category + angle for each kept trend. */
async function rewriteTrends(trends: ScoredTrend[]): Promise<Array<{ i: number; title: string; category: string; angle: string }>> {
  const res = await callAiStructured<{ topics?: Array<{ i?: number; title?: string; category?: string; angle?: string }> }>({
    systemPrompt: `You turn current tech stories into blog post titles for Neno Technology (${NENO_SERVICES.join("; ")}).
For each story write ONE practitioner-angle title that ties the news to what engineering teams building with AI should do or know, e.g. "What X means for teams deploying agents in production" or "X shipped: what changes for your RAG pipeline". Keep the real product/company name from the story. Under 90 characters. Plain words, no hype, no question or exclamation marks.
Never use these words or phrases: navigating, navigate, labyrinth, unlocking, unlock, ${BANNED_TEXT}
category must be exactly one of: ${NENO_CATEGORIES.join(" | ")}.
angle: one sentence on the practical angle the post should take.
Return JSON: {"topics":[{"i":0,"title":"...","category":"...","angle":"..."}]}`,
    userPrompt: trends.map((t, i) => `${i}. ${t.item.title}${t.item.summary ? ` — ${t.item.summary.slice(0, 300)}` : ""}`).join("\n"),
  });
  return (res?.topics || [])
    .map((t) => ({
      i: Number(t.i),
      title: String(t.title || "").trim().replace(/^["']|["']$/g, ""),
      category: NENO_CATEGORIES.find((c) => c.toLowerCase() === String(t.category || "").toLowerCase()) || "",
      angle: String(t.angle || "").trim(),
    }))
    .filter((t) => Number.isInteger(t.i) && t.i >= 0 && t.i < trends.length && t.title && t.category);
}

/** Only public http(s) hosts: trend URLs come from the internet and must not reach this PC's network. */
export function isPublicHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = u.hostname.toLowerCase();
    return !(h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^[\d.]+$/.test(h) || h.includes(":"));
  } catch {
    return false;
  }
}

/** Readable text of the source page (first ~4000 chars) to ground the post; undefined if it can't be fetched. */
export async function fetchExcerpt(url: string): Promise<string | undefined> {
  if (!isPublicHttpUrl(url)) return undefined;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "NenoContentEngine/1.0" }, redirect: "follow", signal: AbortSignal.timeout(10_000) });
    if (!res.ok || !(res.headers.get("content-type") || "").includes("text/html")) return undefined;
    const page = (await res.text()).slice(0, 1_500_000).replace(/<!--[\s\S]*?-->/g, " ");
    // The article body when the page marks it, so site navigation doesn't crowd out the facts.
    const html = page.match(/<article\b[\s\S]*<\/article>/i)?.[0] || page.match(/<main\b[\s\S]*<\/main>/i)?.[0] || page;
    const text = html
      .replace(/<(script|style|noscript|svg|nav|footer|header|aside|form)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
    return text.length > 200 ? text.slice(0, 4000) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Picks one live trend for the next post. Throws when the trend feeds are unreachable (the run then fails and notifies);
 * returns { pick: null, reason } when nothing qualifies.
 */
export async function pickLiveTopic(workspaceId: string, lastCategory: string | null, avoidCategories: string[] = []): Promise<{ pick: LiveTopicPick | null; reason: string }> {
  const items = await TrendingTopicsService.fetchLiveTrendItems();
  if (!items.length) throw new Error("Live trends unreachable: Hacker News and Dev.to returned no stories.");
  const shortlist = shortlistTrends(items, 15);
  const all = await scoreTrends(shortlist);
  for (const s of all) console.log(`[auto-blog]   ${String(s.score).padStart(2)}/10  ${s.item.title}  — ${s.reason}`);
  const scored = all.filter((s) => s.score >= 7).sort((a, b) => b.score - a.score);
  console.log(`[auto-blog] live trends: ${items.length} fetched, ${shortlist.length} shortlisted, ${scored.length} scored 7+`);
  if (!scored.length) return { pick: null, reason: `None of the ${shortlist.length} current trends scored 7+ for relevance to Neno's services.` };

  const existing = await AutoBlogService.recentTitlesForLiveDedup(workspaceId, 60);
  const fresh = scored.filter((s) => !existing.some((e) => isSimilar(e, s.item.title))).slice(0, 5);
  if (!fresh.length) return { pick: null, reason: "Every relevant trend is similar to an existing post or a topic used in the last 60 days." };

  const last = (lastCategory || "").trim().toLowerCase();
  const rewritten = await rewriteTrends(fresh);
  const options = rewritten
    .map((r) => ({ ...r, scored: fresh[r.i] }))
    .filter((r) => titleIsClean(r.title) && !existing.some((e) => isSimilar(e, r.title)))
    .sort((a, b) => b.scored.score - a.scored.score);
  // Categories not used yet in today's batch first, then any but the previous post's.
  const usedToday = new Set(avoidCategories.map((c) => c.toLowerCase()));
  const rotating = options.filter((r) => r.category.toLowerCase() !== last);
  const choice = rotating.find((r) => !usedToday.has(r.category.toLowerCase())) || rotating[0];
  if (!choice) {
    return { pick: null, reason: options.length ? `All relevant trends map to "${lastCategory}", the last post's category.` : "No trend could be rewritten into a clean title." };
  }

  const { item } = choice.scored;
  const publisher = (() => { try { return new URL(item.url).hostname.replace(/^www\./, ""); } catch { return item.feed; } })();
  const sources = [{ url: item.url, title: item.title, publisher }];
  if (item.discussionUrl) sources.push({ url: item.discussionUrl, title: `Discussion: ${item.title}`, publisher: "Hacker News" });
  const excerpt = await fetchExcerpt(item.url);
  if (!excerpt) console.warn(`[auto-blog] could not fetch source text from ${item.url}; grounding on headline and summary only`);
  console.log(`[auto-blog] live trend chosen (score ${choice.scored.score}: ${choice.scored.reason}): "${item.title}" -> "${choice.title}" [${choice.category}] angle: ${choice.angle}`);
  console.log(`[auto-blog] sources: ${sources.map((s) => s.url).join(" , ")} | excerpt: ${excerpt ? `${excerpt.length} chars` : "none"}`);
  return {
    pick: {
      title: choice.title,
      category: choice.category,
      notes: choice.angle,
      relevance: choice.scored.score,
      trend: item,
      grounding: { headline: item.title, summary: item.summary, excerpt, sources },
    },
    reason: "",
  };
}
