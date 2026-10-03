/**
 * AI Content Studio — Untrusted Input Sanitizer & Prompt Injection Defense
 * Ensures external web content and research snippets cannot override LLM instructions.
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s+prompt\s+override/i,
  /you\s+are\s+now\s+in\s+(developer|unrestricted|god)\s+mode/i,
  /disregard\s+the\s+above/i,
  /forget\s+everything\s+you\s+were\s+told/i,
  /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
  /javascript:/gi,
  /onload\s*=/gi,
  /onerror\s*=/gi,
];

export interface SanitizationResult {
  sanitizedText: string;
  flagged: boolean;
  warnings: string[];
}

export function sanitizeUntrustedInput(rawInput: string, maxLength = 8000): SanitizationResult {
  if (!rawInput) {
    return { sanitizedText: "", flagged: false, warnings: [] };
  }

  let text = rawInput.trim();
  const warnings: string[] = [];
  let flagged = false;

  // 1. Enforce length boundary
  if (text.length > maxLength) {
    text = text.slice(0, maxLength);
    warnings.push(`Input truncated to safe limit of ${maxLength} characters.`);
  }

  // 2. Detect & neutralize prompt injection triggers
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      flagged = true;
      warnings.push(`Potential prompt injection or script pattern detected and neutralized.`);
      text = text.replace(pattern, "[UNTRUSTED_CONTENT_FILTERED]");
    }
  }

  // 3. Normalize whitespace and strip control characters
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return {
    sanitizedText: text,
    flagged,
    warnings,
  };
}

/**
 * Wraps untrusted text in rigid isolation boundaries for LLM ingestion
 */
export function wrapInSafetyBoundary(sanitizedContent: string, sourceLabel = "External Web Content"): string {
  return `<<<UNTRUSTED_SOURCE_BOUNDARY: ${sourceLabel}>>>\n${sanitizedContent}\n<<<END_UNTRUSTED_SOURCE_BOUNDARY>>>`;
}
