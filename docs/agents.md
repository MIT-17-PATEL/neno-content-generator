# AI Content Studio — Agent Architecture

## Agents & Responsibilities

### 1. Research Agent
- **Purpose**: Retrieves, extracts, and summarizes verified source facts and statistics.
- **Security Boundary**: Treats external data as untrusted input. Sanitizes against prompt injection.

### 2. Content Strategist
- **Purpose**: Formulates the narrative angle, section-by-section outline, heading hierarchy, and example recommendations.

### 3. Writer Agent
- **Purpose**: Generates full-length markdown copy aligning with brand voice, tone, and prohibited/preferred terminology.

### 4. SEO Agent
- **Purpose**: Produces primary/secondary keywords, optimized meta title (<60 chars), meta description (<160 chars), URL slug, and internal linking opportunities.

### 5. Image Agent
- **Purpose**: Designs a cohesive visual brief, alt text, and specialized prompts for text-to-image foundation models.

### 6. QA Agent
- **Purpose**: Evaluates draft for logical coherence, factual consistency with research, readability score, brand guideline adherence, and structural repetition.

## Orchestration Flow
```
[User Input]
     ↓
[Research Agent] ─── (Sources Saved)
     ↓
[Strategist Agent] ── (Outline Saved)
     ↓
[Writer Agent] ───── (Draft Saved)
     ↓
[SEO Agent] ──────── (SEO Meta Saved)
     ↓
[QA Agent] ───────── (Score & Issues Saved)
     ↓
[Image Agent] ────── (Visual Brief Saved)
     ↓
[Status: In Review] ➔ Human Editor
```
