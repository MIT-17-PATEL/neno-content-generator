import sharp from "sharp";
import { createSuite, assert, assertEquals } from "./test-utils";
import { ImageGenerator } from "../src/lib/ai/image-generator";

export const { suite, test } = createSuite("Cover Image Compression");

const dataUriMeta = async (uri: string) => {
  const [, mime, b64] = /^data:([^;]+);base64,(.*)$/s.exec(uri)!;
  const buf = Buffer.from(b64, "base64");
  return { mime, bytes: buf.length, ...(await sharp(buf).metadata()) };
};

test("resizes a large JPEG to 1200px/400px WebP and shrinks it", async () => {
  // Noisy image so JPEG is realistically large (like DALL-E 1792x1024 covers)
  const raw = Buffer.alloc(1792 * 1024 * 3).map(() => Math.floor(Math.random() * 256));
  const jpeg = await sharp(raw, { raw: { width: 1792, height: 1024, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
  const src = `data:image/jpeg;base64,${jpeg.toString("base64")}`;

  const { thumb, thumbFull } = await ImageGenerator.compressCover(src, "test");
  const full = await dataUriMeta(thumbFull);
  const small = await dataUriMeta(thumb);

  assertEquals(full.mime, "image/webp");
  assertEquals(full.width, 1200);
  assertEquals(small.mime, "image/webp");
  assertEquals(small.width, 400);
  assert(full.bytes < jpeg.length, "thumbFull should be smaller than the original");
  assert(small.bytes < full.bytes, "thumb should be smaller than thumbFull");
});

test("does not upscale images narrower than the target", async () => {
  const png = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#123456" } }).png().toBuffer();
  const { thumbFull } = await ImageGenerator.compressCover(`data:image/png;base64,${png.toString("base64")}`);
  assertEquals((await dataUriMeta(thumbFull)).width, 300);
});

test("passes through URLs, empty values and undecodable data", async () => {
  const url = "https://example.com/a.png";
  assertEquals(await ImageGenerator.compressCover(url), { thumb: url, thumbFull: url });
  assertEquals(await ImageGenerator.compressCover(""), { thumb: "", thumbFull: "" });
  const bad = "data:image/jpeg;base64,bm90LWFuLWltYWdl";
  assertEquals(await ImageGenerator.compressCover(bad), { thumb: bad, thumbFull: bad });
});

test("reuses an already-compressed <=1200px WebP for thumbFull (no second lossy pass)", async () => {
  const webp = await sharp({ create: { width: 1200, height: 675, channels: 3, background: "#345678" } }).webp({ quality: 80 }).toBuffer();
  const src = `data:image/webp;base64,${webp.toString("base64")}`;
  const { thumb, thumbFull } = await ImageGenerator.compressCover(src);
  assertEquals(thumbFull, src);
  assertEquals((await dataUriMeta(thumb)).width, 400);
});

test("stores a DALL-E cover as compressed WebP data instead of the expiring URL", async () => {
  const png = await sharp({ create: { width: 1792, height: 1024, channels: 3, background: "#aa3300" } }).png().toBuffer();
  const realFetch = globalThis.fetch;
  const prevKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test";
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("api.openai.com/v1/images")) {
      return new Response(JSON.stringify({ data: [{ url: "https://dalle.test/cover.png" }] }), { status: 200 });
    }
    if (url === "https://dalle.test/cover.png") return new Response(png, { status: 200 });
    throw new Error(`unexpected fetch in test: ${url}`);
  }) as typeof fetch;
  try {
    const result = await ImageGenerator.generate({ topic: "Kubernetes autoscaling", aspectRatio: "16:9" });
    assert(result.publicUrl.startsWith("data:image/webp;base64,"), `expected WebP data, got ${result.publicUrl.slice(0, 40)}`);
    assertEquals((await dataUriMeta(result.publicUrl)).width, 1200);
    assert(result.storageKey.endsWith(".webp"), "storageKey should reflect WebP");
  } finally {
    globalThis.fetch = realFetch;
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevKey;
  }
});
