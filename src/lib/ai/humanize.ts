import { callAiText } from "@/lib/ai/ai-client";
import { BANNED_TEXT, findBannedPhrases } from "@/lib/ai/banned-phrases";

export { findBannedPhrases };

export const WRITING_PROMPT = `You are a senior engineer at Neno Technology writing for our company blog. Write like a practitioner explaining something to a smart colleague, not like a textbook or a marketing page.

VOICE
- Use "we" / "our team" where it fits. Share opinions and trade-offs; take a position.
- Plain words. Mix short and long sentences. Some paragraphs are a single sentence.
- Concrete over abstract: real tools, versions, numbers, error messages, costs, timelines.
- Include at least one specific example or mini case ("When we moved a client's RAG pipeline to…", "On a recent project…"). Never invent client names; keep examples anonymous and plausible.
- Admit limits: when something doesn't work, what it costs, when NOT to use it.

STRUCTURE
- Open with a specific situation, problem or claim — never a definition or a "today's world" opener.
- Headings that say something ("Why we stopped using X for Y"), never generic labels ("Introduction", "Conclusion", "Key Benefits").
- No conclusion section that repeats the article. End with a practical takeaway or an open question.
- Lists only for real lists (steps, options). Most of the article is prose.
- Length: 900–1,400 words unless told otherwise.
- Never use any phrase from the BANNED list.

BANNED
${BANNED_TEXT}`;

export const EDIT_PROMPT = `Edit this blog post so it reads like an experienced engineer wrote it. Keep the facts and overall structure. Remove every banned phrase, cut filler sentences, vary sentence length, replace vague claims with specific ones or delete them, make headings specific, and remove any closing summary. Return only the edited post.

BANNED
${BANNED_TEXT}`;

/** One edit pass. Returns the original when the model fails or returns something that is clearly not the post. */
export async function runEditPass(article: string, banned: string[] = []): Promise<string> {
  try {
    const raw = await callAiText({
      systemPrompt: EDIT_PROMPT,
      userPrompt: `${banned.length ? `These banned phrases/styles are still present, remove all of them: ${banned.join(", ")}.\n\n` : ""}POST:\n\n${article}`,
      timeoutMs: 120000,
    });
    const edited = raw.trim().replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i, "$1").trim();
    // A much shorter reply means the model summarised or refused instead of editing.
    return edited.length >= article.length * 0.5 ? edited : article;
  } catch (err) {
    console.warn("[humanize] edit pass failed, keeping draft:", err);
    return article;
  }
}

/** Edit pass, banned-phrase check, one more edit pass if needed. Returns the text plus anything still flagged. */
export async function humanizeArticle(draft: string): Promise<{ article: string; bannedPhrases: string[] }> {
  let article = await runEditPass(draft);
  let banned = findBannedPhrases(article);
  if (banned.length) {
    article = await runEditPass(article, banned);
    banned = findBannedPhrases(article);
  }
  return { article, bannedPhrases: banned };
}
