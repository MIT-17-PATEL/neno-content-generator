# AI Content Studio — Security & Privacy

## Application Security
- HTTPS everywhere
- Secure authentication
- Server-side secrets
- Least-privilege access
- Workspace isolation
- Role-based authorization

## AI Security
- Treat retrieved web content as untrusted input.
- Protect against prompt injection in external sources.
- Never allow research content to override system instructions.
- Validate structured AI output.
- Limit tools available to each agent.
- Log tool usage.

## Data Security
- Encrypt data in transit.
- Use encrypted managed database/storage.
- Avoid storing secrets in content.
- Define retention policies.
- Provide deletion controls.

## File Security
- Validate MIME type and extension.
- Validate file size.
- Inspect file signatures where practical.
- Generate safe storage keys.
- Prevent path traversal.

## Publishing Security
MVP should require explicit human approval before external publishing.

## Auditability
Record:
- User
- Workspace
- Action
- Timestamp
- Generation run
- Version
- Publishing/export action
