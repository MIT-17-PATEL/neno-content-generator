/**
 * Universal Multi-Provider AI Client supporting:
 * 1. OpenRouter (e.g. google/gemma-4-26b-a4b-it:free, openrouter/free)
 * 2. Google Gemini API (AQ.*, AIza*)
 * 3. OpenAI / Groq / Anthropic compatible endpoints
 * Automatically handles multi-model failovers, robust JSON extraction, and rate-limit resilience.
 */

export interface AiCallParams {
  systemPrompt: string;
  userPrompt: string;
}

const OPENROUTER_CANDIDATE_MODELS = [
  process.env.AI_MODEL || "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "openrouter/free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "liquid/lfm-2.5-2.6b:free",
];

const GEMINI_CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-2.5-pro",
  "gemini-pro-latest",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.1-pro-preview",
];

export function getAiKey(): string | undefined {
  return (
    process.env.OPENROUTER_API_KEY ||
    process.env.AI_PROVIDER_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.OPENAI_API_KEY
  );
}

export function isAiConfigured(): boolean {
  const key = getAiKey();
  return Boolean(key && key.trim().length > 0);
}

export function getActiveAiModel(): string {
  const key = getAiKey();
  if (!key) return "studio-neural-v1 (Heuristic)";
  if (key.startsWith("sk-or-") || process.env.OPENROUTER_API_KEY) {
    return process.env.AI_MODEL || "google/gemma-4-26b-a4b-it:free (OpenRouter)";
  }
  if (key.startsWith("sk-")) return "gpt-4o";
  return "gemini-2.5-flash";
}

/** Robust JSON extractor that handles markdown codeblocks, reasoning text, and preambles */
export function extractStructuredJson<T = unknown>(raw: string): T | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(trimmed) as T;
  } catch {}

  // 2. Strip standard markdown code fences
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(stripped) as T;
  } catch {}

  // 3. Extract matching object substring { ... }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonSub = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonSub) as T;
    } catch {}
  }

  // 4. Extract matching array substring [ ... ]
  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const jsonSub = trimmed.slice(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(jsonSub) as T;
    } catch {}
  }

  return null;
}

/**
 * Call AI and parse the response into structured JSON.
 */
export async function callAiStructured<T = unknown>(params: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<T> {
  const key = getAiKey();
  if (!key) {
    throw new Error("No AI API key configured in environment.");
  }

  // 1. OpenRouter API (Keys starting with sk-or-)
  if (key.startsWith("sk-or-") || process.env.OPENROUTER_API_KEY) {
    let lastErr = "";
    for (const model of OPENROUTER_CANDIDATE_MODELS) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_WEBSITE_URL || "https://www.nenotechnology.com",
            "X-Title": "Neno Content Studio",
          },
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "system",
                content: `${params.systemPrompt}\n\nIMPORTANT: Output ONLY a valid JSON object matching the requested fields. Do not include introductory notes or reasoning outside the JSON.`,
              },
              { role: "user", content: params.userPrompt },
            ],
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "";
          const parsed = extractStructuredJson<T>(content);
          if (parsed) {
            return parsed;
          }
          console.warn(`[OpenRouter] Model ${model} returned unparseable text. Trying next model...`);
        } else {
          const errBody = await response.json().catch(() => ({}));
          lastErr = errBody?.error?.message || `HTTP ${response.status}`;
          console.warn(`[OpenRouter] Model ${model} returned ${response.status}: ${lastErr}. Trying next candidate...`);
        }
      } catch (err) {
        console.warn(`[OpenRouter] Error invoking ${model}:`, err);
      }
    }
    throw new Error(`OpenRouter AI error: ${lastErr || "Failed to generate structured response"}`);
  }

  // 2. Standard OpenAI format (sk-)
  if (key.startsWith("sk-")) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API responded with status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = extractStructuredJson<T>(content);
    if (parsed) return parsed;
    throw new Error("Failed to parse OpenAI JSON response");
  }

  // 3. Google Gemini API (AQ.*, AIza*, or native Gemini key)
  let lastGeminiError = "";
  for (const model of GEMINI_CANDIDATE_MODELS) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${params.systemPrompt}\n\nIMPORTANT: Return ONLY valid, parseable JSON matching the required schema.\n\n${params.userPrompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
          const parsed = extractStructuredJson<T>(rawText);
          if (parsed) return parsed;
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        lastGeminiError = errJson?.error?.message || `Status ${response.status}`;
      }
    } catch (err) {
      console.warn(`Error invoking Gemini model ${model}:`, err);
    }
  }

  throw new Error(`Google Gemini API error across candidate models: ${lastGeminiError || "Failed to generate structured response"}`);
}

/**
 * Call AI for unstructured / text generation.
 */
export async function callAiText(params: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  const key = getAiKey();
  if (!key) {
    throw new Error("No AI API key configured in environment.");
  }

  // 1. OpenRouter
  if (key.startsWith("sk-or-") || process.env.OPENROUTER_API_KEY) {
    for (const model of OPENROUTER_CANDIDATE_MODELS) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_WEBSITE_URL || "https://www.nenotechnology.com",
            "X-Title": "Neno Content Studio",
          },
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: params.systemPrompt },
              { role: "user", content: params.userPrompt },
            ],
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return data.choices?.[0]?.message?.content || "";
        }
      } catch {
        // Try next candidate
      }
    }
  }

  // 2. OpenAI
  if (key.startsWith("sk-")) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    }
  }

  // 3. Google Gemini API
  for (const model of GEMINI_CANDIDATE_MODELS) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${params.systemPrompt}\n\n${params.userPrompt}` }],
            },
          ],
          generationConfig: { temperature: 0.7 },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) return rawText;
      }
    } catch {
      // Continue to next model
    }
  }

  throw new Error("AI text generation failed across all available providers.");
}
