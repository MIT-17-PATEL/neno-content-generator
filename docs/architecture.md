# AI Content Studio — System Architecture

## Overview
AI Content Studio is a standalone, multi-agent AI workspace for creating professional blogs, case studies, SEO metadata, and visual assets with research grounding and human-in-the-loop review.

## Architectural Layers

```
Client (Next.js React UI / Tailwind)
        ↓
App Router API Routes (Zod Validation + Auth Guard)
        ↓
Server Services & Workspaces Isolation Layer
        ↓
Multi-Agent Orchestrator Pipeline
  ├── Research Agent (Untrusted external data sanitization)
  ├── Content Strategist (Outlines & angles)
  ├── Writer Agent (Draft generation with brand tone)
  ├── SEO Agent (Keywords, meta descriptions, slugs)
  ├── QA Agent (Claim checking, readability, brand compliance)
  └── Image Agent (Prompt formulation & visual briefs)
        ↓
PostgreSQL Persistence & S3-Compatible Object Storage
```

## Key Isolation Principles
1. **Zero Coupling with Existing Websites**: Completely independent database, authentication, routes, and styling.
2. **Server-Side AI Secrets**: All LLM and API keys reside exclusively in server environments and are never bundled in client code.
3. **Multi-Stage Resiliency**: Failed stages in the agent pipeline can be retried independently without regenerating prior valid outputs.
4. **Human-in-the-Loop Mandate**: AI outputs remain in Draft or In-Review state until a human editor explicitly approves and exports.
