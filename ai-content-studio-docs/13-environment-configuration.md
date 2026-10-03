# AI Content Studio — Environment Configuration

## Example Variables

```env
DATABASE_URL=
AUTH_SECRET=
AI_PROVIDER_API_KEY=
RESEARCH_PROVIDER_API_KEY=
IMAGE_PROVIDER_API_KEY=
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
APP_URL=
```

## Rules
- Never commit `.env` files.
- Use platform secret management in production.
- Separate development/staging/production credentials.
- Rotate compromised keys immediately.
- Never expose server-side keys to browser bundles.

## Environments
- Local development
- Staging
- Production

## Recommended Production Separation
Use separate database/schema and storage configuration for staging and production.
