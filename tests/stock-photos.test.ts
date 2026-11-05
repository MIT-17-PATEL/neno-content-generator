import { createSuite, assert, assertEquals } from "./test-utils";
import { applyScores, creditFor, isConcreteQuery, pickCandidates, StockCandidate } from "../src/lib/ai/stock-photos";

export const { suite, test } = createSuite("Stock Photos");

const cand = (provider: "pexels" | "unsplash", id: string, width = 4000, height = 2600): StockCandidate => ({
  provider, id, width, height, thumbUrl: `https://img/${id}`, photographer: "Asha Rao",
  photographerUrl: "https://example.com/asha", photoUrl: `https://example.com/photo/${id}`, alt: "",
});

test("queries must describe a concrete scene, not abstract tech words", () => {
  assert(isConcreteQuery("engineers reviewing dashboard on monitor"), "concrete scene");
  assert(isConcreteQuery("server racks in data center aisle"), "data allowed with concrete words");
  for (const q of ["AI", "AI technology", "digital data", "artificial intelligence future", "machine learning"]) {
    assert(!isConcreteQuery(q), `"${q}" should be rejected`);
  }
});

test("candidates: landscape >= 1600px only, used-by-other-post excluded, deduped, round-robin, max 10", () => {
  const q1 = [cand("pexels", "1"), cand("pexels", "2", 1200, 800), cand("pexels", "3", 2000, 3000), cand("pexels", "4")];
  const q2 = [cand("pexels", "4"), cand("unsplash", "a"), cand("unsplash", "b")];
  const out = pickCandidates([q1, q2], new Set(["unsplash:a"]));
  assertEquals(out.map((c) => `${c.provider}:${c.id}`).join(","), "pexels:1,pexels:4,unsplash:b");
  const many = Array.from({ length: 30 }, (_, i) => cand("pexels", String(i)));
  assertEquals(pickCandidates([many], new Set()).length, 10);
});

test("vision scores: clichés and weak matches dropped, best first, top 6", () => {
  const cands = Array.from({ length: 9 }, (_, i) => cand("pexels", String(i)));
  const scores = cands.map((_, i) => ({ i, score: i, cliche: i === 8 }));
  const out = applyScores(cands, scores);
  assertEquals(out.map((c) => c.id).join(","), "7,6,5,4");
  assertEquals(applyScores(cands, null).length, 6); // no vision model: provider order, top 6
});

test("credit line per provider; Unsplash links carry utm referral params", () => {
  const p = creditFor(cand("pexels", "1"));
  assertEquals(p.text, "Photo by Asha Rao on Pexels");
  assertEquals(p.photoUrl, "https://example.com/photo/1");
  const u = creditFor(cand("unsplash", "x"));
  assertEquals(u.text, "Photo by Asha Rao on Unsplash");
  assert(u.photographerUrl.includes("utm_medium=referral") && u.photoUrl.includes("utm_source="), "utm params");
});
