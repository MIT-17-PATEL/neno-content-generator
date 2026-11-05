import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Page } from "puppeteer";
import { callAiStructured, callAiText } from "@/lib/ai/ai-client";
import { ImageGenerator } from "@/lib/ai/image-generator";
import { MediaService } from "@/services/media-service";

/**
 * Topic-based blog visuals: an LLM plans a cover (diagram or photo) plus up to 2 inline visuals,
 * diagrams are drawn from the post's actual components with Mermaid in the Neno theme, comparisons
 * become themed card graphics, photos come from the Gemini image model with an editorial prompt.
 * Covers are returned as compressed WebP data URIs, the same form the website publish route uploads to S3.
 */

export type CoverType = "diagram" | "photo";
export type InlineType = "architecture" | "flow" | "comparison";

export interface BlogVisual {
  kind: "diagram" | "comparison" | "photo" | "upload" | "stock";
  dataUri: string; // data URI, or a hotlinked https URL for Unsplash stock photos
  credit?: { provider: string; photographer: string; photographerUrl: string; photoUrl: string; text: string };
  stock?: { provider: string; id: string };
  svg?: string;
  mermaid?: string;
  alt: string;
  caption?: string;
  afterHeading?: string;
  inlineType?: InlineType;
  hash: string;
}

export interface VisualPlan {
  cover: { type: CoverType; reason: string; scene?: string };
  inline: Array<{ type: InlineType; after_heading: string; caption: string }>;
}

export interface PostForVisuals {
  title: string;
  article: string;
  workspaceId: string;
  scene?: string;
}

const THEME = { bg: "#0B1020", card: "#141B34", text: "#FFFFFF", muted: "#B8C0E0", accent: "#6C7BFF" };
// Only bundled fonts (no system fonts), so visuals render identically on any machine, offline.
const HEADING_FONT = "'Plus Jakarta Sans', Inter, sans-serif";
const BODY_FONT = "Inter, 'Plus Jakarta Sans', sans-serif";
const BUNDLED_FONTS: Array<[family: string, weight: number, file: string]> = [
  ["Plus Jakarta Sans", 500, "@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-500-normal.woff2"],
  ["Plus Jakarta Sans", 700, "@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff2"],
  ["Inter", 400, "@fontsource/inter/files/inter-latin-400-normal.woff2"],
  ["Inter", 700, "@fontsource/inter/files/inter-latin-700-normal.woff2"],
];

let fontCssCache = "";
/** @font-face rules with the bundled woff2 files inlined as data URIs (no network, no system fonts). */
export function fontFaceCss(): string {
  if (!fontCssCache) {
    fontCssCache = BUNDLED_FONTS.map(([family, weight, file]) => {
      const b64 = fs.readFileSync(path.join(process.cwd(), "node_modules", file)).toString("base64");
      return `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
    }).join("\n");
  }
  return fontCssCache;
}

/**
 * Diagrams and comparison cards need a full headless Chrome, which Vercel functions don't have (and the
 * mermaid/font files read from node_modules aren't traced into the bundle). Detect it up front so we fall
 * back to photos immediately instead of spending LLM calls on renders that can't work.
 */
export const diagramsAvailable = () => !process.env.VERCEL || Boolean(process.env.PUPPETEER_EXECUTABLE_PATH);
const NO_DIAGRAMS_WARNING = "Diagrams can't be rendered on Vercel (no headless Chrome); a photo was used instead.";

/** Opens a headless Chrome page with the bundled fonts loaded and ready before anything is laid out. */
async function withFontPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
    await page.setContent(`<!doctype html><html><head><style>${fontFaceCss()}
html,body{margin:0;background:${THEME.bg};}</style></head><body><div id="c"></div></body></html>`);
    await page.evaluate(async (fonts: Array<[string, number]>) => {
      await Promise.all(fonts.map(([family, weight]) => document.fonts.load(`${weight} 20px "${family}"`)));
      await document.fonts.ready;
    }, BUNDLED_FONTS.map(([f, w]) => [f, w] as [string, number]));
    return await fn(page);
  } finally {
    await browser.close();
  }
}

/** Screenshot of the #c svg, padded and scaled to 1600px wide. */
async function screenshotSvg(page: Page, pad: number): Promise<Buffer> {
  const el = await page.$("#c svg");
  if (!el) throw new Error("svg not rendered");
  const shot = Buffer.from(await el.screenshot({ type: "png", omitBackground: false }));
  const sharp = (await import("sharp")).default;
  const padded = pad
    ? await sharp(shot).extend({ top: pad, bottom: pad, left: pad, right: pad, background: THEME.bg }).toBuffer()
    : shot;
  return sharp(padded).resize({ width: 1600 }).png().toBuffer();
}

/** Puts the bundled @font-face rules inside a standalone SVG so the file renders the same anywhere. */
const embedFonts = (svg: string) =>
  svg.replace(/<svg\b[^>]*>/, (open) => `${open}<style>${fontFaceCss()}\nsvg{background-color:${THEME.bg};}</style>`);

/** Rasterises a standalone SVG (e.g. the comparison card) in Chrome with the bundled fonts. */
export async function renderSvg(svg: string): Promise<Buffer> {
  return withFontPage(async (page) => {
    await page.evaluate((markup: string) => { document.getElementById("c")!.innerHTML = markup; }, svg);
    return screenshotSvg(page, 0);
  });
}

export const IMAGE_PROMPT_PREFIX =
  "Editorial photograph, natural light, shot on a 35mm camera, slightly imperfect framing, real office or developer setting in India, muted realistic colors, shallow depth of field. No text, no logos, no glowing effects, no robots, no holograms, no matrix code, no futuristic UI. Subject: ";

const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const clip = (s: string, n = 12000) => (s.length > n ? `${s.slice(0, n)}\n…` : s);
export const headingsOf = (md: string) =>
  [...md.matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => m[1].trim());
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Text of the section under a heading (until the next heading of the same or higher level). */
export function sectionText(md: string, heading: string): string {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => /^#{2,3}\s/.test(l) && norm(l.replace(/^#+/, "")) === norm(heading));
  if (start < 0) return "";
  const level = (lines[start].match(/^#+/) || ["##"])[0].length;
  const end = lines.findIndex((l, i) => i > start && new RegExp(`^#{2,${level}}\\s`).test(l));
  return lines.slice(start, end < 0 ? undefined : end).join("\n");
}

// ---------------------------------------------------------------- planning

export function normalizePlan(raw: unknown, article: string): VisualPlan {
  const r = (raw || {}) as { cover?: Record<string, unknown>; inline?: unknown[] };
  const coverType: CoverType = r.cover?.type === "photo" ? "photo" : "diagram";
  const headings = headingsOf(article);
  const inline = (Array.isArray(r.inline) ? r.inline : [])
    .map((v) => v as Record<string, unknown>)
    .filter((v) => ["architecture", "flow", "comparison"].includes(String(v.type)))
    .map((v) => ({
      type: v.type as InlineType,
      after_heading: headings.find((h) => norm(h) === norm(String(v.after_heading || ""))) || "",
      caption: String(v.caption || "").trim(),
    }))
    .filter((v) => v.after_heading && v.caption)
    .slice(0, 2);
  return {
    cover: { type: coverType, reason: String(r.cover?.reason || ""), scene: r.cover?.scene ? String(r.cover.scene) : undefined },
    inline,
  };
}

export async function planVisuals(post: PostForVisuals): Promise<VisualPlan> {
  try {
    const raw = await callAiStructured({
      systemPrompt: `You plan visuals for an engineering blog post. Read the post and return JSON only:
{ "cover": {"type": "diagram" | "photo", "reason": "...", "scene": "for photo only: one concrete, specific real-world scene from this post (people, place, objects), no text or screens with UI"},
  "inline": [{"type": "architecture" | "flow" | "comparison", "after_heading": "exact heading text from the post", "caption": "..."}] }
Rules: use "diagram" for posts explaining a system, architecture, pipeline or process; use "photo" for trends, strategy, people or business topics.
Add inline visuals (at most 2) only where a section explains components, steps or a comparison. "after_heading" must be copied exactly from a ## or ### heading in the post. Captions are one plain sentence.`,
      userPrompt: `TITLE: ${post.title}\n\nPOST:\n${clip(post.article)}`,
    });
    return normalizePlan(raw, post.article);
  } catch (err) {
    console.warn("[blog-visuals] planning failed, defaulting to a diagram cover:", err);
    return normalizePlan({}, post.article);
  }
}

// ---------------------------------------------------------------- mermaid

/** Extracts Mermaid flowchart code and strips directives that could restyle or script the diagram. */
export function cleanMermaid(raw: string): string | null {
  const fenced = /```(?:mermaid)?\s*\n([\s\S]*?)```/i.exec(raw);
  const code = (fenced ? fenced[1] : raw)
    .split("\n")
    .filter((l) => !/^\s*(%%|click\s|style\s|classDef\s|class\s|linkStyle\s)/i.test(l))
    .join("\n")
    .trim();
  return /^(flowchart|graph)\s+(LR|RL|TB|TD|BT)\b/i.test(code) ? code : null;
}

/** Rough node count: distinct ids that start a node definition or an edge. */
export function countMermaidNodes(code: string): number {
  const ids = new Set<string>();
  for (const m of code.matchAll(/(?:^|-->|---|-\.->|==>|&)\s*([A-Za-z][\w]*)\s*(?=[[({>]|\s*(?:-->|---|-\.->|==>|&|$))/gm)) {
    if (!/^(flowchart|graph|subgraph|end|direction)$/i.test(m[1])) ids.add(m[1]);
  }
  return ids.size;
}

const MERMAID_CONFIG = {
  theme: "base",
  themeVariables: {
    background: THEME.bg,
    primaryColor: THEME.card,
    primaryTextColor: THEME.text,
    primaryBorderColor: THEME.accent,
    secondaryColor: "#1B2447",
    tertiaryColor: "#10172E",
    lineColor: THEME.accent,
    textColor: THEME.text,
    clusterBkg: "#10172E",
    clusterBorder: "#2A3566",
    edgeLabelBackground: THEME.bg,
    fontFamily: HEADING_FONT,
    fontSize: "18px",
  },
  themeCSS: `.node rect, .node .label-container { rx: 14px; ry: 14px; stroke-width: 2px; }
.cluster rect { rx: 16px; ry: 16px; }
.nodeLabel, .edgeLabel, .cluster-label, text { font-family: ${HEADING_FONT}; font-weight: 500; }`,
  flowchart: { curve: "basis", padding: 18, nodeSpacing: 50, rankSpacing: 60 },
  securityLevel: "strict",
};

/**
 * Renders Mermaid to PNG (1600px wide) and a standalone SVG in headless Chrome. Fonts are loaded before
 * layout so node boxes are measured with the real font. Throws when the syntax is invalid.
 */
export async function renderMermaid(code: string): Promise<{ png: Buffer; svg: string }> {
  return withFontPage(async (page) => {
    await page.addScriptTag({ path: path.join(process.cwd(), "node_modules", "mermaid", "dist", "mermaid.min.js") });
    const svg = await page.evaluate(async (definition: string, config: typeof MERMAID_CONFIG) => {
      type MermaidApi = { initialize(c: unknown): void; render(id: string, d: string): Promise<{ svg: string }> };
      const mermaid = (window as unknown as { mermaid: MermaidApi }).mermaid;
      mermaid.initialize({ startOnLoad: false, ...config });
      const out = await mermaid.render("neno-diagram", definition);
      document.getElementById("c")!.innerHTML = out.svg;
      return out.svg;
    }, code, MERMAID_CONFIG);
    return { png: await screenshotSvg(page, 64), svg: embedFonts(svg) };
  });
}

async function askMermaid(text: string, kind: "architecture" | "flow", simpler: string | null): Promise<string | null> {
  const raw = await callAiText({
    systemPrompt: `You draw diagrams for an engineering blog. Write Mermaid flowchart code that shows the ACTUAL components or steps described in the text — the real names used there, not generic boxes.
Rules: ${simpler ? "at most 6 nodes, `flowchart LR`, no subgraphs, labels of 1-3 plain words" : `at most 10 nodes, ${kind === "flow" ? "`flowchart LR`" : "`flowchart LR` or `flowchart TB`"}, labels of at most 4 words, subgraphs only if the text names real groups`}.
Node ids are letters/digits only; put every label in double quotes, e.g. A["API Gateway"] --> B["Worker"]. Edge labels optional, 1-3 words.
No styling, classDef, click, or %% directives. Return only the code in a \`\`\`mermaid block.`,
    userPrompt: `${simpler ? `The previous diagram failed (${simpler}). Make it simpler.\n\n` : ""}TEXT:\n${clip(text, 8000)}`,
    timeoutMs: 60000,
  });
  return cleanMermaid(raw);
}

/** Mermaid diagram for the text; one simpler retry; null when both attempts fail. */
export async function makeDiagram(text: string, kind: "architecture" | "flow"): Promise<{ png: Buffer; svg: string; mermaid: string } | null> {
  if (!diagramsAvailable()) return null;
  let problem: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const code = await askMermaid(text, kind, problem);
      if (!code) { problem = "it was not a valid flowchart"; continue; }
      if (countMermaidNodes(code) > 12) { problem = "too many nodes"; continue; }
      return { ...(await renderMermaid(code)), mermaid: code };
    } catch (err) {
      problem = `render error: ${String(err instanceof Error ? err.message : err).slice(0, 200)}`;
      console.warn("[blog-visuals] mermaid attempt failed:", problem);
    }
  }
  return null;
}

// ---------------------------------------------------------------- comparison cards

export interface ComparisonData { title: string; columns: Array<{ heading: string; points: string[] }> }

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/)) {
    if ((cur + " " + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = `${cur} ${w}`.trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

/** 2–4 column card graphic in the Neno theme, 1600px wide SVG; height fits the tallest card. */
export function comparisonSvg(data: ComparisonData): string {
  const cols = data.columns.slice(0, 4);
  const W = 1600, pad = 64, gap = 28, top = 180;
  const cw = (W - pad * 2 - gap * (cols.length - 1)) / cols.length;
  const chars = Math.floor(cw / 13);
  const layout = cols.map((c) => ({
    head: wrap(c.heading, Math.floor(cw / 17)).slice(0, 2),
    points: c.points.slice(0, 4).map((p) => wrap(p, chars).slice(0, 3)),
  }));
  const cardH = Math.max(...layout.map((l) => 40 + l.head.length * 36 + 24 + l.points.reduce((s, ls) => s + ls.length * 30 + 26, 0) + 24));
  const H = top + cardH + pad;
  const cards = layout.map((l, i) => {
    const x = pad + i * (cw + gap);
    const head = l.head
      .map((t, j) => `<text x="${x + 32}" y="${top + 56 + j * 36}" font-family="${HEADING_FONT}" font-size="30" font-weight="700" fill="${THEME.text}">${esc(t)}</text>`).join("");
    let y = top + 40 + l.head.length * 36 + 4;
    const pts = l.points.map((ls) => {
      const out = `<circle cx="${x + 38}" cy="${y + 26}" r="5" fill="${THEME.accent}"/>` +
        ls.map((t, j) => `<text x="${x + 56}" y="${y + 33 + j * 30}" font-size="23" fill="${THEME.muted}">${esc(t)}</text>`).join("");
      y += ls.length * 30 + 26;
      return out;
    }).join("");
    return `<rect x="${x}" y="${top}" width="${cw}" height="${cardH}" rx="20" fill="${THEME.card}" stroke="#2A3566" stroke-width="2"/>
<rect x="${x}" y="${top}" width="${cw}" height="6" rx="3" fill="${THEME.accent}"/>${head}${pts}`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${BODY_FONT}">
<rect width="${W}" height="${H}" fill="${THEME.bg}"/>
<text x="${pad}" y="118" font-family="${HEADING_FONT}" font-size="44" font-weight="700" fill="${THEME.text}">${esc(data.title.slice(0, 70))}</text>
${cards}
</svg>`;
}

export async function makeComparison(text: string): Promise<{ png: Buffer; svg: string } | null> {
  if (!diagramsAvailable()) return null;
  try {
    const raw = await callAiStructured<ComparisonData>({
      systemPrompt: `Extract the comparison made in this blog section as JSON only: {"title": "short title", "columns": [{"heading": "option name", "points": ["short fact", "..."]}]}.
2 to 4 columns, 2 to 4 points each, points under 9 words, only facts stated in the text.`,
      userPrompt: clip(text, 8000),
    });
    const cols = (raw?.columns || []).filter((c) => c?.heading && Array.isArray(c.points) && c.points.length);
    if (cols.length < 2) return null;
    const svg = comparisonSvg({ title: String(raw.title || ""), columns: cols.map((c) => ({ heading: String(c.heading), points: c.points.map(String) })) });
    return { svg: embedFonts(svg), png: await renderSvg(svg) };
  } catch (err) {
    console.warn("[blog-visuals] comparison failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------- photos (Gemini image model)

export function geminiKey(): string {
  const k = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.AI_PROVIDER_API_KEY || "";
  return /^(AIza|AQ\.)/.test(k.trim()) ? k.trim() : "";
}

/** Last Gemini image 429 (ms epoch). Lets callers (blog automation) switch to diagram/stock covers. */
export const imageQuota = { rateLimitedAt: 0 };
const IMAGE_BACKOFF_MS = 30 * 60_000;

export async function makePhoto(scene: string): Promise<Buffer | null> {
  const key = geminiKey();
  if (!key) {
    console.warn("[blog-visuals] no Gemini key (GEMINI_API_KEY) for photo generation");
    return null;
  }
  // After a 429, don't spend another 90s request on the same exhausted quota for a while.
  if (Date.now() - imageQuota.rateLimitedAt < IMAGE_BACKOFF_MS) return null;
  const model = process.env.IMAGE_MODEL || "gemini-2.5-flash-image";
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: IMAGE_PROMPT_PREFIX + scene }] }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9" } },
      }),
    });
    if (!res.ok) {
      if (res.status === 429) imageQuota.rateLimitedAt = Date.now();
      console.warn(`[blog-visuals] Gemini image HTTP ${res.status}:`, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    const part = (data.candidates?.[0]?.content?.parts || []).find((p: { inlineData?: { data?: string } }) => p.inlineData?.data);
    return part ? Buffer.from(part.inlineData.data, "base64") : null;
  } catch (err) {
    console.warn("[blog-visuals] Gemini image failed:", err);
    return null;
  }
}

async function sceneFor(post: PostForVisuals): Promise<string> {
  if (post.scene?.trim()) return post.scene.trim();
  const raw = await callAiText({
    systemPrompt: "Describe, in one sentence, a concrete real-world photo scene that fits this engineering blog post: specific people, place and objects in an Indian office or developer setting. No screens showing UI, no text, no futuristic elements. Return only the sentence.",
    userPrompt: `TITLE: ${post.title}\n\n${clip(post.article, 4000)}`,
  }).catch(() => "");
  return raw.trim().split("\n")[0] || `engineers at a desk discussing ${post.title}`;
}

// ---------------------------------------------------------------- assembly

const toWebp = async (png: Buffer, width: number) => {
  const sharp = (await import("sharp")).default;
  const out = await sharp(png).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  return `data:image/webp;base64,${out.toString("base64")}`;
};

/** Centers a diagram on a 1600x900 navy canvas so every cover is 16:9. */
async function coverCanvas(png: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const inner = await sharp(png).resize({ width: 1440, height: 760, fit: "inside" }).toBuffer();
  return sharp({ create: { width: 1600, height: 900, channels: 4, background: THEME.bg } })
    .composite([{ input: inner, gravity: "center" }])
    .png()
    .toBuffer();
}

/** Final cover data URI in the same compressed form publishing uses (<=1200px WebP). */
async function coverUri(png: Buffer, label: string): Promise<string> {
  return (await ImageGenerator.compressCover(`data:image/png;base64,${png.toString("base64")}`, label)).thumbFull;
}

export async function existingCoverHashes(workspaceId: string, exceptHash?: string): Promise<Set<string>> {
  const assets = await MediaService.listByWorkspace(workspaceId, "featured_image").catch(() => []);
  const hashes = new Set(assets.map((a) => sha(a.publicUrl || "")).filter(Boolean));
  if (exceptHash) hashes.delete(exceptHash);
  return hashes;
}

/** One cover of the requested type; falls back to the other type once. Rejects covers already used by another post. */
export async function makeCover(
  post: PostForVisuals,
  type: CoverType,
  warnings: string[],
  usedHashes?: Set<string>
): Promise<BlogVisual | null> {
  const used = usedHashes || (await existingCoverHashes(post.workspaceId));
  let order: CoverType[] = type === "diagram" ? ["diagram", "photo"] : ["photo", "diagram"];
  if (!diagramsAvailable()) {
    order = ["photo"];
    if (type === "diagram") warnings.push(NO_DIAGRAMS_WARNING);
  }
  for (const t of order) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let visual: BlogVisual | null = null;
      if (t === "diagram") {
        const d = await makeDiagram(post.article, "architecture");
        if (d) {
          const dataUri = await coverUri(await coverCanvas(d.png), "diagram-cover");
          visual = { kind: "diagram", dataUri, svg: d.svg, mermaid: d.mermaid, alt: `Diagram: ${post.title}`, hash: sha(dataUri) };
        }
      } else {
        const scene = await sceneFor(post);
        const p = await makePhoto(scene);
        if (p) {
          const dataUri = await coverUri(p, "photo-cover");
          visual = { kind: "photo", dataUri, alt: scene, caption: scene, hash: sha(dataUri) };
        }
      }
      if (!visual) break; // this type failed; try the other type
      if (!used.has(visual.hash)) {
        if (t !== type && diagramsAvailable()) warnings.push(`Cover: ${type} failed, used a ${t} instead.`);
        return visual;
      }
      warnings.push(`Cover: generated ${t} matched another post's cover, regenerating.`);
    }
  }
  warnings.push("Cover: no cover could be generated. Upload one or regenerate in the review step.");
  return null;
}

export async function makeInline(post: PostForVisuals, spec: VisualPlan["inline"][number], warnings: string[]): Promise<BlogVisual | null> {
  const text = sectionText(post.article, spec.after_heading) || post.article;
  const r = spec.type === "comparison" ? await makeComparison(text) : await makeDiagram(text, spec.type);
  if (!r) {
    warnings.push(`Inline visual after "${spec.after_heading}" could not be rendered.`);
    return null;
  }
  const dataUri = await toWebp(r.png, 1600);
  return {
    kind: spec.type === "comparison" ? "comparison" : "diagram",
    dataUri,
    svg: r.svg,
    mermaid: "mermaid" in r ? (r as { mermaid: string }).mermaid : undefined,
    alt: spec.caption,
    caption: spec.caption,
    afterHeading: spec.after_heading,
    inlineType: spec.type,
    hash: sha(dataUri),
  };
}

/** Cover from a user-supplied image (data URI). */
export async function coverFromUpload(dataUri: string, alt: string): Promise<BlogVisual> {
  const { thumbFull } = await ImageGenerator.compressCover(dataUri, "upload");
  return { kind: "upload", dataUri: thumbFull, alt, hash: sha(thumbFull) };
}

/** coverType "none": inline visuals only; the caller sets the cover itself (e.g. a stock photo once the draft exists). */
export async function generatePostVisuals(post: PostForVisuals, coverType?: CoverType | "none") {
  const warnings: string[] = [];
  const plan = await planVisuals(post);
  if (coverType && coverType !== "none") plan.cover.type = coverType;
  const [cover, ...inline] = await Promise.all([
    coverType === "none" ? null : makeCover({ ...post, scene: post.scene || plan.cover.scene }, plan.cover.type, warnings),
    ...plan.inline.map((s) => makeInline(post, s, warnings)),
  ]);
  return { plan, cover, inline: inline.filter((v): v is BlogVisual => Boolean(v)), warnings };
}

/** The seoMetadata fields the publish code already reads for the cover, plus the review-step fields. */
export function coverMetadata(cover: BlogVisual) {
  return {
    coverImage: cover.dataUri,
    ogImage: cover.dataUri,
    featuredImageUrl: cover.dataUri,
    featuredImageBrief: cover.dataUri,
    featuredImagePrompt: cover.kind === "photo" ? IMAGE_PROMPT_PREFIX + (cover.caption || "") : cover.mermaid || cover.alt,
    coverAlt: cover.alt,
    coverType: cover.kind,
    coverSvg: cover.svg,
    coverHash: cover.hash,
    // undefined clears a previous stock cover's credit when switching to a diagram / AI photo / upload
    coverCredit: cover.credit,
    coverStock: cover.stock,
  };
}
