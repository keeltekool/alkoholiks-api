# Alkoholiks API — STACK.md

> Last updated: 2026-03-22

## Services

| Service | Purpose | Env Vars |
|---------|---------|----------|
| Vercel | Hosting + Cron | — |
| Clerk | Developer portal auth | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` |
| Neon | Consumer/credential/usage data | `DATABASE_URL` |
| Upstash Redis | Tokens, rate limits, product cache | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |

## Brand

- **Primary:** Money Green `#006948` (gradient to `#00855d`)
- **Font:** Inter
- **Surface:** `#faf8ff` (off-white, tonal shifts for sections)

## Dev Commands

```bash
npm run dev          # Start dev server (port 3000)
npx drizzle-kit push # Push schema to Neon
```

## Deployment

```bash
npx vercel --prod    # Deploy to production
# Trigger cache refresh after deploy:
curl "https://alkoholiks-api.vercel.app/api/cron/refresh" -H "Authorization: Bearer $CRON_SECRET"
```

## Post-Deploy Smoke Tests

1. Landing page loads at `/`
2. Swagger UI loads at `/docs`
3. OAuth token exchange works (`POST /api/oauth/token`)
4. Product search returns data (`GET /api/v1/products/search?q=saku`)
5. Dashboard redirects to Clerk sign-in when unauthenticated

## Gotchas

| Issue | Fix |
|-------|-----|
| Vercel Hobby plan: max 1 cron/day | Changed from every 4h to daily 6 AM UTC. Trigger manually after deploy. |
| Clerk dev keys on prod domain | CORS errors in console. Need production Clerk instance for prod use. |
| Swagger UI peer dep warnings (React 19) | Works fine despite warnings. `swagger-ui-react` hasn't updated peer deps yet. |
| `next build` warns "middleware deprecated, use proxy" | Next.js 16 deprecation. Works fine for now. |
