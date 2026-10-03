/**
 * Universal AI Client supporting Google Gemini and OpenAI.
 * Automatically handles multi-model failovers, schema formatting, and fallback resilience.
 */

export interface AiCallParams {
  systemPrompt: string;
  userPrompt: string;
}

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
    process.env.GEMINI_API_KEY ||
    process.env.AI_PROVIDER_API_KEY ||
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
  if (key.startsWith("sk-")) return "gpt-4o";
  return "gemini-2.5-flash";
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

  // 1. If OpenAI key format (starts with sk-)
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
    return JSON.parse(content) as T;
  }

  // 2. Google Gemini API (AQ.*, AIza*, or custom Gemini key)
  // Try available candidate models with automatic failover
  let lastError = "";

  for (const model of GEMINI_CANDIDATE_MODELS) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${params.systemPrompt}\n\nIMPORTANT: Return ONLY valid, parseable JSON matching the required schema. No markdown codeblock wrappings if possible.\n\n${params.userPrompt}`,
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
          const cleaned = rawText
            .trim()
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "");

          return JSON.parse(cleaned) as T;
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        lastError = errJson?.error?.message || `Status ${response.status}`;
        console.warn(`Gemini model ${model} returned ${response.status}: ${lastError}. Trying next candidate...`);
      }
    } catch (err) {
      console.warn(`Error invoking Gemini model ${model}:`, err);
    }
  }

  throw new Error(`Google Gemini API error across candidate models: ${lastError || "Failed to generate structured response"}`);
}

/**
 * Call AI for unstructured / text generation (e.g., section revisions, completions).
 */
export async function callAiText(params: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  const key = getAiKey();
  if (!key) {
    throw new Error("No AI API key configured in environment.");
  }

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

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API responded with status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  // Google Gemini API with candidate model failover
  for (const model of GEMINI_CANDIDATE_MODELS) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${params.systemPrompt}\n\n${params.userPrompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
          },
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

  throw new Error("Google Gemini API call failed across candidate models.");
}
