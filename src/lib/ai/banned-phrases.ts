// Pure (no server imports) so the review screen can re-check the draft live in the browser.

export const BANNED_PHRASES = [
  "delve", "dive deep", "deep dive", "in today's fast-paced world", "ever-evolving", "landscape", "realm",
  "tapestry", "unlock", "unleash", "leverage (as a verb)", "harness", "seamless", "seamlessly", "robust",
  "cutting-edge", "game-changer", "game-changing", "revolutionize", "paradigm", "synergy", "empower", "elevate",
  "navigate the complexities", "it's important to note", "it's worth noting", "in conclusion", "furthermore",
  "moreover", "ultimately", "a testament to", "plays a crucial role", "plays a pivotal role", "not just X but Y",
  "whether you're X or Y", "let's explore", "embark", "journey", "transformative", "foster",
];

export const BANNED_TEXT = `${BANNED_PHRASES.join(", ")}.
Also avoid: chains of em-dashes, rhetorical-question openers, emoji, exclamation marks.`;

// Typographic apostrophes are normalised before matching so "it’s worth noting" is caught too.
const RULES: Array<{ label: string; re: RegExp }> = [
  ...BANNED_PHRASES.filter((p) => !/\(| X /.test(p)).map((p) => ({
    label: p,
    re: new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
  })),
  { label: "leverage (as a verb)", re: /\bleverag(?:es|ed|ing)\b|\b(?:to|we|can|will|you|they|should|could|must|and|teams?) leverage\b/i },
  { label: "not just X but Y", re: /\bnot just\b[^.\n]{1,80}?\bbut\b/i },
  { label: "whether you're X or Y", re: /\bwhether you're\b[^.\n]{1,80}?\bor\b/i },
  { label: "chain of em-dashes", re: /—[^.\n—]*—[^.\n—]*—/ },
  { label: "exclamation mark", re: /\w!(?:\s|$)/ },
  { label: "emoji", re: /\p{Extended_Pictographic}/u },
];

/** Returns the banned phrases / style violations found in prose (code blocks and inline code are ignored). */
export function findBannedPhrases(markdown: string): string[] {
  const prose = (markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/[‘’]/g, "'");
  const found = RULES.filter((r) => r.re.test(prose)).map((r) => r.label);
  const firstPara = prose.replace(/^\s*#.*$/gm, "").trim().split(/\n\s*\n/)[0] || "";
  if (/^[^.!\n]{0,200}\?/.test(firstPara.trim())) found.push("rhetorical-question opener");
  return found;
}
