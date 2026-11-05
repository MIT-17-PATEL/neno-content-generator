import { imageQuota } from "@/lib/ai/blog-visuals";
import { stockProviders } from "@/lib/ai/stock-photos";

/** What covers can be made right now (checked once before a batch, updated after each post). */
export interface CoverLimits {
  imageLimited: boolean; // Gemini image quota hit (429): no AI photos
  stockAvailable: boolean; // a stock provider is configured and not rate-limited
  notes: string[];
}

/** Pure: the cover to actually make given the limits. AI photo -> stock -> diagram; stock -> diagram. */
export function coverWithLimits(type: "diagram" | "stock" | "photo", l: Pick<CoverLimits, "imageLimited" | "stockAvailable">): "diagram" | "stock" | "photo" {
  if (type === "photo" && l.imageLimited) return l.stockAvailable ? "stock" : "diagram";
  if (type === "stock" && !l.stockAvailable) return "diagram";
  return type;
}

/**
 * Pre-batch quota check. Gemini has no free quota endpoint, so the image limit comes from a 429 seen
 * earlier (this process, or saved in settings.image_limited_until). Pexels reports its remaining quota in headers.
 */
export async function checkLimits(imageLimitedUntil?: Date | string | null): Promise<CoverLimits> {
  const notes: string[] = [];
  const imageLimited =
    Boolean(imageLimitedUntil && new Date(imageLimitedUntil).getTime() > Date.now()) || Date.now() - imageQuota.rateLimitedAt < 6 * 3_600_000;
  if (imageLimited) notes.push("Gemini image quota was exhausted recently: AI-photo covers replaced by stock or diagrams.");

  const providers = stockProviders();
  let stockAvailable = providers.length > 0;
  if (!stockAvailable) notes.push("No stock photo provider configured (PEXELS_API_KEY empty): stock covers replaced by diagrams.");
  if (providers.includes("pexels")) {
    try {
      const res = await fetch("https://api.pexels.com/v1/search?query=office&per_page=1", {
        headers: { Authorization: process.env.PEXELS_API_KEY || "" },
        signal: AbortSignal.timeout(10_000),
      });
      const remaining = Number(res.headers.get("x-ratelimit-remaining") ?? "NaN");
      if (res.status === 429 || res.status === 401 || res.status === 403 || (Number.isFinite(remaining) && remaining < 10)) {
        stockAvailable = providers.length > 1; // Unsplash may still work
        notes.push(`Pexels unavailable (HTTP ${res.status}${Number.isFinite(remaining) ? `, ${remaining} requests left` : ""}).`);
      }
    } catch (err) {
      notes.push(`Pexels quota check failed (${err instanceof Error ? err.message : err}); trying stock anyway.`);
    }
  }
  return { imageLimited, stockAvailable, notes };
}
