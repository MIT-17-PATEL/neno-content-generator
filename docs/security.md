# AI Content Studio — Security & Privacy Architecture

## Core Security Rules
1. **Server-Side Key Isolation**: All LLM API keys (`AI_PROVIDER_API_KEY`, `RESEARCH_PROVIDER_API_KEY`, etc.) and object storage secrets are strictly accessible in server runtime environments. Never expose them to Next.js client bundles or public assets.
2. **Workspace Isolation & Multi-Tenancy**: Every database query on content, media, runs, and settings must enforce the active `workspace_id`. Cross-workspace data leakage is strictly forbidden.
3. **External Untrusted Input Sanitization**: Content retrieved by the Research Agent from external URLs is treated as untrusted text. Delimiters and rigid formatting boundaries prevent malicious prompt injections.
4. **Input Validation**: All client payloads are validated using strict Zod schemas with length limits and sanitized characters.
5. **Human Approval Safeguard**: Automatic unreviewed public publishing is prohibited. Content transitions from `draft` ➔ `generating` ➔ `in_review` ➔ `approved` before any export.
