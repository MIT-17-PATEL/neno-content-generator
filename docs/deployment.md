# AI Content Studio — Deployment Guide

## Hosting Architecture
- **Web App / API**: Next.js (Vercel or AWS Node.js runtime)
- **Database**: Managed PostgreSQL (e.g. Neon, Supabase, RDS)
- **Object Storage**: AWS S3 or S3-compatible bucket (Cloudflare R2)

## Environment Separation
- **Development**: Local environment with `.env.local`
- **Staging**: Staging database & bucket with staging API keys
- **Production**: High-availability PostgreSQL connection pooling, CDN caching for media assets, production secrets.

## Build & Validation Gate
Before any deployment, the CI/CD pipeline runs:
```bash
npm run lint
npx tsc --noEmit
npm run build
```
