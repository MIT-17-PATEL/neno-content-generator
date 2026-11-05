import sharp from "sharp";
import { createSuite, assert, assertEquals } from "./test-utils";
import { findBannedPhrases } from "../src/lib/ai/humanize";
import { generateSlug, SLUG_PATTERN } from "../src/lib/utils";
import {
  cleanMermaid,
  comparisonSvg,
  countMermaidNodes,
  fontFaceCss,
  normalizePlan,
  renderMermaid,
  renderSvg,
  sectionText,
} from "../src/lib/ai/blog-visuals";

export const { suite, test } = createSuite("Blog Writing Quality & Visuals");

test("slug rule: suggestions from titles are valid; bad slugs are rejected", () => {
  for (const t of ["Why We Moved Our RAG Index to pgvector (and Back)", "  Kafka → SQS: 6 months later!  ", "Node_20 vs Bun 1.1"]) {
    const s = generateSlug(t);
    assert(SLUG_PATTERN.test(s), `"${s}" from "${t}" should be valid`);
  }
  for (const bad of ["Upper-Case", "double--hyphen", "-leading", "trailing-", "has space", "under_score"]) {
    assert(!SLUG_PATTERN.test(bad), `"${bad}" should be rejected`);
  }
});

test("flags banned phrases case-insensitively, including curly apostrophes", () => {
  const found = findBannedPhrases("We Delve into it. It’s worth noting the landscape is Seamless.");
  for (const p of ["delve", "it's worth noting", "landscape", "seamless"]) assert(found.includes(p), `missing ${p}`);
});

test("pattern rules: leverage as a verb, not just X but Y, exclamation, emoji, question opener", () => {
  const found = findBannedPhrases("Why does this keep failing?\n\nWe leveraged Redis! It is not just fast but cheap 🚀");
  for (const p of ["leverage (as a verb)", "not just X but Y", "exclamation mark", "emoji", "rhetorical-question opener"]) {
    assert(found.includes(p), `missing ${p}`);
  }
});

test("clean engineering prose and code blocks are not flagged", () => {
  const md = "Our p95 went from 420ms to 60ms after we moved the queue.\n\n```js\nconst landscape = robust(); // leverage!\n```\n\nThe leverage ratio was fine.";
  assertEquals(findBannedPhrases(md).join(","), "");
});

test("plan normalisation keeps only real headings, max 2 inline, defaults to diagram", () => {
  const article = "## Why we moved off Kafka\ntext\n## How the new pipeline works\ntext";
  const plan = normalizePlan({
    cover: { type: "weird" },
    inline: [
      { type: "flow", after_heading: "how the new pipeline works", caption: "Pipeline" },
      { type: "flow", after_heading: "Not a heading", caption: "x" },
      { type: "comparison", after_heading: "Why we moved off Kafka", caption: "Kafka vs SQS" },
      { type: "architecture", after_heading: "Why we moved off Kafka", caption: "third" },
    ],
  }, article);
  assertEquals(plan.cover.type, "diagram");
  assertEquals(plan.inline.length, 2);
  assertEquals(plan.inline[0].after_heading, "How the new pipeline works");
  assert(sectionText(article, "Why we moved off Kafka").includes("text"), "section text");
});

test("mermaid cleanup strips directives and rejects non-flowcharts", () => {
  const code = cleanMermaid('```mermaid\n%%{init: {"theme":"dark"}}%%\nflowchart LR\n A["API"] --> B["Queue"]\n click A "http://x"\n B --> C["Worker"]\n```');
  assert(code !== null && !code.includes("click") && !code.includes("%%"), "directives removed");
  assertEquals(countMermaidNodes(code!), 3);
  assertEquals(cleanMermaid("sequenceDiagram\n A->>B: hi"), null);
});

test("comparison card renders to a 1600px wide PNG sized to its content", async () => {
  const svg = comparisonSvg({ title: "pgvector vs Pinecone", columns: [
    { heading: "pgvector", points: ["Inside existing Postgres", "No extra bill"] },
    { heading: "Pinecone", points: ["Managed scaling", "Extra network hop"] },
  ] });
  assert(!/segoe|arial/i.test(svg), "no system fonts referenced");
  const meta = await sharp(await renderSvg(svg)).metadata();
  assertEquals(meta.width, 1600);
  assert(meta.height! > 300 && meta.height! < 900, `height ${meta.height} should fit two short points`);
});

test("bundled fonts: Plus Jakarta Sans 500/700 and Inter 400/700 inlined as woff2", () => {
  const css = fontFaceCss();
  assertEquals((css.match(/@font-face/g) || []).length, 4);
  assert(css.includes("'Plus Jakarta Sans'") && css.includes("'Inter'") && css.includes("data:font/woff2;base64,"), "font faces");
  assert(!/https?:\/\//.test(css), "no network font URLs");
});

test("mermaid renders a themed 1600px PNG + standalone SVG with embedded fonts, rejects invalid syntax", async () => {
  const { png, svg } = await renderMermaid('flowchart LR\n A["Content Engine"] --> B["Website API"]\n B --> C["Lambda"]');
  assertEquals((await sharp(png).metadata()).width, 1600);
  assert(svg.includes("<svg") && svg.includes("Website API"), "svg contains labels");
  assert(svg.includes("@font-face") && !/segoe/i.test(svg), "svg embeds bundled fonts only");
  let rejected = false;
  try { await renderMermaid("flowchart LR\n A[[[ --> "); } catch { rejected = true; }
  assert(rejected, "invalid mermaid should throw");
});

test("on Vercel without Chrome, diagrams are skipped immediately (no LLM call, no render)", async () => {
  const { diagramsAvailable, makeDiagram } = await import("../src/lib/ai/blog-visuals");
  const prev = { VERCEL: process.env.VERCEL, PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH };
  process.env.VERCEL = "1";
  delete process.env.PUPPETEER_EXECUTABLE_PATH;
  try {
    assertEquals(diagramsAvailable(), false);
    const t = Date.now();
    assertEquals(await makeDiagram("API --> Worker", "flow"), null);
    assert(Date.now() - t < 50, "should return without network or browser work");
  } finally {
    if (prev.VERCEL === undefined) delete process.env.VERCEL; else process.env.VERCEL = prev.VERCEL;
    if (prev.PUPPETEER_EXECUTABLE_PATH !== undefined) process.env.PUPPETEER_EXECUTABLE_PATH = prev.PUPPETEER_EXECUTABLE_PATH;
  }
});
