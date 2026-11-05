import crypto from "node:crypto";
import { callAiStructured, extractStructuredJson } from "@/lib/ai/ai-client";
import { ImageGenerator } from "@/lib/ai/image-generator";
import { MediaService } from "@/services/media-service";
import { geminiKey, type BlogVisual, type PostForVisuals } from "@/lib/ai/blog-visuals";

/**
 * Licensed stock photos only (Pexels API, optional Unsplash API) — never scraped.
 * Pexels: image is downloaded, compressed and uploaded to our S3 by the website (same as other covers).
 * Unsplash: per API guidelines the cover stays a hotlinked images.unsplash.com URL, the download endpoint
 * is triggered on selection, and attribution links carry utm params.
 */

export type StockProvider = "pexels" | "unsplash";

export interface StockCandidate {
  provider: StockProvider;
  id: string;
  width: number;
  height: number;
  thumbUrl: string; // small preview, hotlinked from the provider CDN
  photographer: string;
  photographerUrl: string;
  photoUrl: string;
  alt: string;
  score?: number;
  reason?: string;
}

export interface StockCredit {
  provider: StockProvider;
  photographer: string;
  photographerUrl: string;
  photoUrl: string;
  text: string;
}

const MIN_WIDTH = 1600;
const CANDIDATES_TO_SCORE = 10;
const RESULTS_SHOWN = 6;

export const stockKey = (provider: string, id: string) => `${provider}:${id}`;
export const stockProviders = (): StockProvider[] =>
  [process.env.PEXELS_API_KEY?.trim() && "pexels", process.env.UNSPLASH_ACCESS_KEY?.trim() && "unsplash"].filter(Boolean) as StockProvider[];

// ---------------------------------------------------------------- pure helpers (unit-tested)

const ABSTRACT = new Set(["ai", "a.i.", "data", "technology", "tech", "digital", "innovation", "future", "concept", "abstract", "cloud", "network", "software", "artificial", "intelligence", "machine", "learning", "cyber", "virtual", "the", "a", "an", "and", "of", "with", "in", "on", "for"]);

/** A usable query names a real scene: at least 2 words that are not abstract filler. */
export function isConcreteQuery(q: string): boolean {
  const words = q.toLowerCase().split(/[^a-z0-9.]+/).filter(Boolean);
  return words.filter((w) => !ABSTRACT.has(w)).length >= 2;
}

/** Landscape, >= 1600px wide, not used by another post, no duplicates; round-robin across queries. */
export function pickCandidates(perQuery: StockCandidate[][], used: Set<string>, max = CANDIDATES_TO_SCORE): StockCandidate[] {
  const ok = (c: StockCandidate) => c.width >= MIN_WIDTH && c.width > c.height && !used.has(stockKey(c.provider, c.id));
  const lists = perQuery.map((l) => l.filter(ok));
  const out: StockCandidate[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < max && lists.some((l) => i < l.length); i++) {
    for (const l of lists) {
      const c = l[i];
      if (c && !seen.has(stockKey(c.provider, c.id)) && out.length < max) {
        seen.add(stockKey(c.provider, c.id));
        out.push(c);
      }
    }
  }
  return out;
}

/** Applies vision scores: drops clichés and low scores, best first. Unscored candidates keep provider order. */
export function applyScores(cands: StockCandidate[], scores: Array<{ i: number; score: number; cliche?: boolean; reason?: string }> | null): StockCandidate[] {
  if (!scores) return cands.slice(0, RESULTS_SHOWN);
  const byIndex = new Map(scores.map((s) => [s.i, s]));
  return cands
    .map((c, i) => ({ ...c, score: Number(byIndex.get(i)?.score) || 0, reason: byIndex.get(i)?.reason, cliche: byIndex.get(i)?.cliche === true }))
    .filter((c) => !c.cliche && c.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, RESULTS_SHOWN)
    .map(({ cliche: _cliche, ...c }) => c);
}

const UTM = `utm_source=${encodeURIComponent(process.env.UNSPLASH_APP_NAME || "neno_content_engine")}&utm_medium=referral`;
export const withUtm = (url: string) => `${url}${url.includes("?") ? "&" : "?"}${UTM}`;

export function creditFor(c: Pick<StockCandidate, "provider" | "photographer" | "photographerUrl" | "photoUrl">): StockCredit {
  const site = c.provider === "pexels" ? "Pexels" : "Unsplash";
  return {
    provider: c.provider,
    photographer: c.photographer,
    photographerUrl: c.provider === "unsplash" ? withUtm(c.photographerUrl) : c.photographerUrl,
    photoUrl: c.provider === "unsplash" ? withUtm(c.photoUrl) : c.photoUrl,
    text: `Photo by ${c.photographer} on ${site}`,
  };
}

// ---------------------------------------------------------------- provider APIs

type PexelsPhoto = { id: number; width: number; height: number; url: string; photographer: string; photographer_url: string; alt?: string; src: Record<string, string> };
type UnsplashPhoto = { id: string; width: number; height: number; alt_description?: string; description?: string; urls: Record<string, string>; links: { html: string; download_location: string }; user: { name: string; links: { html: string } } };

const fromPexels = (p: PexelsPhoto): StockCandidate => ({
  provider: "pexels", id: String(p.id), width: p.width, height: p.height, thumbUrl: p.src.medium || p.src.small,
  photographer: p.photographer, photographerUrl: p.photographer_url, photoUrl: p.url, alt: p.alt || "",
});
const fromUnsplash = (p: UnsplashPhoto): StockCandidate => ({
  provider: "unsplash", id: p.id, width: p.width, height: p.height, thumbUrl: p.urls.small,
  photographer: p.user.name, photographerUrl: p.user.links.html, photoUrl: p.links.html, alt: p.alt_description || p.description || "",
});

async function apiGet<T>(provider: StockProvider, path: string): Promise<T> {
  const base = provider === "pexels" ? "https://api.pexels.com/v1" : "https://api.unsplash.com";
  const auth = provider === "pexels" ? process.env.PEXELS_API_KEY!.trim() : `Client-ID ${process.env.UNSPLASH_ACCESS_KEY!.trim()}`;
  const res = await fetch(`${base}${path}`, { headers: { Authorization: auth, "Accept-Version": "v1" }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${provider} API HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function search(provider: StockProvider, query: string): Promise<StockCandidate[]> {
  const q = encodeURIComponent(query);
  if (provider === "pexels") {
    const r = await apiGet<{ photos: PexelsPhoto[] }>("pexels", `/search?query=${q}&orientation=landscape&size=large&per_page=15`);
    return (r.photos || []).map(fromPexels);
  }
  const r = await apiGet<{ results: UnsplashPhoto[] }>("unsplash", `/search/photos?query=${q}&orientation=landscape&per_page=10&content_filter=high`);
  return (r.results || []).map(fromUnsplash);
}

// ---------------------------------------------------------------- LLM steps

export async function suggestQueries(post: PostForVisuals): Promise<string[]> {
  const fallback = ["software engineers discussing at office desk", "developer typing code on laptop", "team meeting around whiteboard"];
  try {
    const raw = await callAiStructured<{ queries?: string[] }>({
      systemPrompt: `You pick stock-photo search queries for a blog post cover. Return JSON only: {"queries": ["...", "...", "..."]}.
Each query is 3-7 words describing a real, photographable scene: people, places, objects or screens (e.g. "engineers reviewing dashboard on monitor", "server racks in data center aisle", "whiteboard with system sketch").
Never use abstract topics, and never use words like "AI", "data", "technology" or "digital" on their own.`,
      userPrompt: `TITLE: ${post.title}\n\n${post.article.slice(0, 5000)}`,
    });
    const qs = (raw?.queries || []).map((q) => String(q).trim()).filter(isConcreteQuery).slice(0, 3);
    return qs.length ? qs : fallback;
  } catch {
    return fallback;
  }
}

/** Scores candidates 1–10 with a vision model; null when no vision model is available (results stay unscored). */
async function scoreWithVision(post: PostForVisuals, cands: StockCandidate[]): Promise<Array<{ i: number; score: number; cliche?: boolean; reason?: string }> | null> {
  const key = geminiKey();
  if (!key || !cands.length) return null;
  try {
    // Thumbnails are fetched transiently for scoring only; they are not stored or displayed from our servers.
    const images = await Promise.all(cands.map(async (c) => {
      const r = await fetch(c.thumbUrl, { signal: AbortSignal.timeout(10000) });
      return { mime: r.headers.get("content-type")?.split(";")[0] || "image/jpeg", data: Buffer.from(await r.arrayBuffer()).toString("base64") };
    }));
    const model = process.env.VISION_MODEL || "gemini-2.5-flash";
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        contents: [{ parts: [
          { text: `You choose a cover photo for this engineering blog post.\nTITLE: ${post.title}\nSUMMARY: ${post.article.slice(0, 1500)}\n\nScore each image 1-10 for how well it fits the post as a realistic editorial cover. Set "cliche": true for matrix code, robots, glowing brains, holograms, binary numbers, circuit-board overlays or similar sci-fi tech clichés. Return JSON only: [{"i": 0, "score": 7, "cliche": false, "reason": "short"}] covering every image.` },
          ...images.flatMap((img, i) => [{ text: `Image ${i}:` }, { inlineData: { mimeType: img.mime, data: img.data } }]),
        ] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    });
    if (!res.ok) throw new Error(`vision HTTP ${res.status}`);
    const data = await res.json();
    const parsed = extractStructuredJson<Array<{ i: number; score: number; cliche?: boolean; reason?: string }>>(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    console.warn("[stock-photos] vision scoring failed, showing unscored results:", err);
    return null;
  }
}

/** Provider + photo IDs used as covers by other posts (from the cover media records). */
export async function usedStockKeys(workspaceId: string, exceptContentId?: string): Promise<Set<string>> {
  const assets = await MediaService.listByWorkspace(workspaceId, "featured_image").catch(() => []);
  return new Set(
    assets.filter((a) => a.contentId !== exceptContentId && a.metadata?.stockKey).map((a) => String(a.metadata!.stockKey))
  );
}

export async function findStockCandidates(post: PostForVisuals, contentId: string, query?: string) {
  const providers = stockProviders();
  if (!providers.length) throw new Error("No stock photo provider configured. Set PEXELS_API_KEY (and optionally UNSPLASH_ACCESS_KEY).");
  const warnings: string[] = [];
  const queries = query?.trim() ? [query.trim()] : await suggestQueries(post);
  const perQuery = await Promise.all(queries.map(async (q) =>
    (await Promise.all(providers.map((p) => search(p, q).catch((err) => { warnings.push(`${p}: ${err.message}`); return []; })))).flat()
  ));
  const cands = pickCandidates(perQuery, await usedStockKeys(post.workspaceId, contentId));
  const scores = await scoreWithVision(post, cands);
  if (!scores && cands.length) warnings.push("Results are not relevance-scored (no vision model available).");
  return { queries, candidates: applyScores(cands, scores).map((c) => ({ ...c, credit: creditFor(c) })), warnings };
}

/** Turns a picked candidate into a cover. Details are re-fetched from the provider by ID (client URLs are never trusted). */
export async function selectStockPhoto(provider: StockProvider, id: string, workspaceId: string, contentId: string): Promise<BlogVisual> {
  if (!stockProviders().includes(provider)) throw new Error(`${provider} is not configured`);
  if ((await usedStockKeys(workspaceId, contentId)).has(stockKey(provider, id))) {
    throw new Error("This photo is already the cover of another post.");
  }
  if (provider === "pexels") {
    const p = await apiGet<PexelsPhoto>("pexels", `/photos/${encodeURIComponent(id)}`);
    const img = await fetch(`${p.src.original}?auto=compress&cs=tinysrgb&w=1600`, { signal: AbortSignal.timeout(30000) });
    if (!img.ok) throw new Error(`Pexels download HTTP ${img.status}`);
    const raw = `data:${img.headers.get("content-type")?.split(";")[0] || "image/jpeg"};base64,${Buffer.from(await img.arrayBuffer()).toString("base64")}`;
    const { thumbFull } = await ImageGenerator.compressCover(raw, `pexels-${id}`);
    const c = fromPexels(p);
    return { kind: "stock", dataUri: thumbFull, alt: c.alt || `Photo by ${c.photographer}`, hash: sha(thumbFull), credit: creditFor(c), stock: { provider, id: c.id } };
  }
  const p = await apiGet<UnsplashPhoto>("unsplash", `/photos/${encodeURIComponent(id)}`);
  // Unsplash requires triggering the download endpoint when a photo is used.
  await apiGet("unsplash", p.links.download_location.replace("https://api.unsplash.com", ""));
  const url = `${p.urls.raw}${p.urls.raw.includes("?") ? "&" : "?"}w=1600&q=80&fm=jpg&fit=crop`;
  const c = fromUnsplash(p);
  return { kind: "stock", dataUri: url, alt: c.alt || `Photo by ${c.photographer}`, hash: sha(url), credit: creditFor(c), stock: { provider, id: c.id } };
}

const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
