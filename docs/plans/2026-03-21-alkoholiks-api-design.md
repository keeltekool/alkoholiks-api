# Alkoholiks API — Design Document

> Date: 2026-03-21
> Status: Approved
> Author: Claude + Egert

---

## Purpose

A production-grade API product exposing Estonian retail drink prices (beer, cider, energy drinks) from 5 store chains. Built as an educational project to learn API product development patterns (OAuth 2.0, OpenAPI spec, developer portal, SDK generation, rate limiting) that transfer directly to professional work on CSC2-based e-sealing APIs at SK ID Solutions.

The data is simple. The craftsmanship is the point.

---

## Architecture Overview

```
ALKOHOLIKS API (Single Next.js Project)

  Developer Portal (pages)        API Endpoints (/api/v1/*)
  - Landing page                  - GET /v1/products
  - Dashboard (Clerk auth)        - GET /v1/products/search
  - Swagger UI docs               - GET /v1/stores
  - SDK + Quickstart              - GET /v1/categories
                                  - POST /oauth/token
            |                              |
            v                              v
        Middleware Layer
        - OAuth 2.0 token validation
        - Rate limiting (100 req/hr)
        - Request logging
            |                    |
            v                    v
    Neon (PostgreSQL)       Upstash Redis
    - Consumers             - Access tokens (1h TTL)
    - Client credentials    - Rate limit counters
    - Usage audit logs      - Product cache (6h TTL)
                                   |
                                   v
                            Scrapers (from HindRadar)
                            Selver | Prisma | Rimi | Barbora | Cityalko
                            Cron: proactive refresh every 4h
```

One Next.js project serving two roles:
- **API endpoints** (`/api/v1/*`) — the product
- **Developer portal** (`/` pages) — registration, docs, dashboard

Two data stores:
- **Neon** — durable relational data (consumers, credentials, usage)
- **Upstash Redis** — fast ephemeral data (tokens, rate limits, product cache)

Scrapers copied from HindRadar (battle-tested, no re-engineering). Refreshed proactively via Vercel Cron.

---

## OAuth 2.0 Client Credentials Flow

### Step 1 — Developer registers on the portal
- Creates account via Clerk (email + password)
- Portal generates `client_id` and `client_secret`
- Credentials prefixed with `alk_` (e.g., `alk_cid_abc123`, `alk_sec_xyz789`)
- `client_secret` hashed with bcrypt before storage — never retrievable

### Step 2 — Token exchange
```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=alk_cid_abc123
&client_secret=alk_sec_xyz789
```

Response:
```json
{
  "access_token": "alk_at_eyJhbGciOi...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

- Token stored in Redis with 1h TTL
- Opaque strings, not JWTs (simpler, instantly revocable)
- No refresh tokens in v1 — consumer requests new token on expiry

### Step 3 — Authenticated API calls
```
GET /api/v1/products/search?q=monster
Authorization: Bearer alk_at_eyJhbGciOi...
```

Middleware validates token against Redis. Invalid/expired → `401 Unauthorized`.

---

## API Endpoints

Base URL: `https://alkoholiks-api.vercel.app/api/v1`

All endpoints require `Authorization: Bearer <token>`.

### Response Envelope

Success:
```json
{
  "data": { ... },
  "meta": {
    "total": 142,
    "cached_at": "2026-03-21T14:00:00Z",
    "request_id": "req_abc123"
  }
}
```

Error:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded 100 requests per hour",
    "retry_after": 847,
    "docs_url": "https://alkoholiks-api.vercel.app/docs/errors#RATE_LIMIT_EXCEEDED"
  }
}
```

### GET /v1/products

List all products with optional filters.

| Param | Type | Example | Description |
|---|---|---|---|
| `store` | string | `selver,rimi` | Comma-separated store IDs (default: all) |
| `category` | string | `olu` | Drink type filter |
| `brand` | string | `Saku` | Brand name filter |
| `country` | string | `Eesti` | Country of origin |
| `price_min` | number | `1.00` | Minimum price |
| `price_max` | number | `5.00` | Maximum price |
| `on_sale` | boolean | `true` | Only discounted products |
| `limit` | number | `50` | Results per page (default 50, max 200) |
| `offset` | number | `100` | Pagination offset |

### GET /v1/products/search?q=

Cross-store text search by name and brand.

| Param | Type | Description |
|---|---|---|
| `q` | string | Search query (matches name + brand) |
| `store` | string | Optional store filter |
| `category` | string | Optional category filter |
| `limit` | number | Results per page (default 50) |
| `offset` | number | Pagination offset |

### GET /v1/stores

List supported stores with metadata (name, website, product count, loyalty pricing flag, last updated timestamp).

### GET /v1/categories

List drink categories with product counts (id, Estonian name, English name).

### HTTP Status Codes

| Code | When |
|---|---|
| `200` | Success |
| `400` | Bad request (invalid params) |
| `401` | Missing or invalid token |
| `429` | Rate limit exceeded (`Retry-After` header included) |
| `500` | Internal error |

---

## Developer Portal

### Landing page (`/`)
- What the API offers, "Get Started" CTA

### Dashboard (`/dashboard`)
- Clerk auth (email/password)
- View `client_id`, generate `client_secret` (shown once)
- Usage stats: requests today, this hour, quota remaining
- Regenerate credentials (revokes old ones)

### Interactive Docs (`/docs`)
- Swagger UI React rendering OpenAPI 3.1 spec
- "Try it out" live request testing

### Quickstart (`/docs/quickstart`)
- SDK installation, code examples, full auth flow walkthrough

---

## Data Refresh & Cron

Proactive cache warming, not lazy caching.

- Vercel Cron → `POST /api/cron/refresh` every **4 hours**
- Secured with `CRON_SECRET` header
- Each store scraped sequentially, written to Redis with **6h TTL**
- 2h buffer: if one cron run fails, previous cache still valid
- Individual store failure doesn't affect other stores
- **API requests never trigger scrapes** — always read from Redis

---

## Tech Stack

| Layer | Tech | Rationale |
|---|---|---|
| Framework | Next.js (App Router) | Handles portal + API, already known |
| Portal auth | Clerk | Already in stack, free tier |
| API auth | Custom OAuth 2.0 | Educational goal — mirrors CSC2 |
| Database | Neon + Drizzle ORM | Already in stack, relational data |
| Cache | Upstash Redis (new DB: `alkoholiks-api`) | Already in stack, tokens + rate limits + products |
| Docs | Swagger UI React + OpenAPI 3.1 YAML | Free, industry standard |
| SDK | Auto-generated from openapi.yaml | Codegen tooling |
| Hosting | Vercel | Already in stack |
| Styling | Tailwind CSS | Standard convention |

No new services introduced.

---

## Project Structure

```
alkoholiks-api/
├── src/
│   ├── app/
│   │   ├── page.tsx                        # Landing page
│   │   ├── dashboard/page.tsx              # Developer dashboard
│   │   ├── docs/page.tsx                   # Swagger UI docs
│   │   ├── docs/quickstart/page.tsx        # SDK + examples
│   │   └── api/
│   │       ├── v1/
│   │       │   ├── products/route.ts
│   │       │   ├── products/search/route.ts
│   │       │   ├── stores/route.ts
│   │       │   └── categories/route.ts
│   │       ├── oauth/token/route.ts
│   │       └── cron/refresh/route.ts
│   ├── lib/
│   │   ├── scrapers/                       # Copied from HindRadar
│   │   │   ├── selver.ts
│   │   │   ├── prisma.ts
│   │   │   ├── rimi.ts
│   │   │   ├── barbora.ts
│   │   │   └── cityalko.ts
│   │   ├── shared.ts
│   │   ├── types.ts
│   │   ├── cache.ts
│   │   ├── oauth.ts
│   │   ├── rate-limit.ts
│   │   └── middleware.ts
│   └── db/
│       ├── schema.ts                       # Drizzle schema
│       └── index.ts                        # Neon connection
├── openapi.yaml                            # Single source of truth
├── sdk/                                    # Auto-generated TypeScript SDK
├── PRD.md
├── STACK.md
└── .env.local
```

---

## First Consumer

After the API is complete, a separate lightweight web app will be built as the first official consumer. It must onboard as a real third-party client:

1. Register on the developer portal
2. Receive OAuth credentials through the proper flow
3. Use the generated TypeScript SDK
4. Authenticate via OAuth 2.0 token exchange
5. Respect rate limits and handle errors per the docs

No backdoors, no source code peeking. If the app can't be built from the public API surface alone, the API product isn't done.

---

## Rate Limiting

- 100 requests per hour per consumer
- Tracked in Redis per `client_id`
- `429 Too Many Requests` with `Retry-After` header
- Usage visible in developer dashboard
