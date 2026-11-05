// Pure: title similarity shared by topic suggestions and the live-trend picker.
const STOP = new Set(["the", "and", "for", "with", "how", "why", "what", "your", "from", "into", "that", "this", "are", "you", "a", "an", "of", "to", "in", "on", "ai"]);
const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));

/** Rough title similarity: >= 50% word overlap (Jaccard) counts as the same topic. */
export function isSimilar(a: string, b: string): boolean {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return false;
  const shared = Array.from(A).filter((w) => B.has(w)).length;
  return shared / (A.size + B.size - shared) >= 0.5;
}
