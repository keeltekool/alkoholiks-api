# Alkoholiks API — Implementation Kickstart Prompt

Copy everything below the line into a fresh Claude Code session:

---

## PROMPT START

I'm building **Alkoholiks API** — a production-grade API product exposing Estonian retail drink prices from 5 store chains (Selver, Prisma, Rimi, Barbora, Cityalko).

**Project directory:** `C:\Users\Kasutaja\Claude_Projects\alkoholiks-api`

**This is an educational project** — I work at SK ID Solutions and need to learn API product patterns (OAuth 2.0, OpenAPI, developer portal, SDK) before building a CSC2-based e-sealing API professionally. The data is simple (prices), the craftsmanship is the point.

**Two key documents are already written and approved — read both BEFORE doing anything:**

1. **Design doc:** `docs/plans/2026-03-21-alkoholiks-api-design.md` — architecture, OAuth flow, endpoint specs, tech decisions
2. **Implementation plan:** `docs/plans/2026-03-21-alkoholiks-api-implementation.md` — 25 tasks across 5 phases with checkpoints

**Data source:** Scrapers are copied from HindRadar (`C:\Users\Kasutaja\Claude_Projects\hind-radar\src\lib\`). Copy them verbatim — they're battle-tested. Do NOT rewrite or "improve" them.

**Key decisions already made:**
- Separate project (not inside HindRadar)
- OAuth 2.0 Client Credentials (non-negotiable)
- Neon (consumers/credentials/audit) + Upstash Redis (tokens/rate-limits/product-cache)
- OpenAPI 3.1 spec + Swagger UI for docs
- Hand-written TypeScript SDK
- Proactive cron cache refresh (every 4h), API never triggers scrapes
- Clerk for developer portal auth
- 100 req/hour rate limit per consumer

**Use the `superpowers:executing-plans` skill to work through the implementation plan task-by-task.** Start with Phase 1, Task 1. Stop at each checkpoint for verification.

Go.
