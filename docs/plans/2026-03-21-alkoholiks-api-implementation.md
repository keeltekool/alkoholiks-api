# Alkoholiks API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production-grade API product exposing Estonian retail drink prices from 5 stores, with OAuth 2.0 auth, OpenAPI docs, developer portal, and SDK generation.

**Architecture:** Next.js App Router serving both API endpoints (`/api/v1/*`) and developer portal pages. Neon PostgreSQL for consumer/credential data, Upstash Redis for tokens/rate-limits/product-cache. Scrapers copied from HindRadar, refreshed via Vercel Cron every 4h.

**Tech Stack:** Next.js 16, Tailwind CSS, Clerk (portal auth), Drizzle ORM + Neon, Upstash Redis, Swagger UI React, bcrypt, crypto

**Design doc:** `docs/plans/2026-03-21-alkoholiks-api-design.md`

---

## Phase 1: Project Foundation (Tasks 1-5)

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, etc. (via `npx create-next-app`)
- Create: `.gitignore`, `.env.local`

**Step 1: Initialize Next.js project**

```bash
cd C:\Users\Kasutaja\Claude_Projects\alkoholiks-api
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --yes
```

**Step 2: Clean up default boilerplate**

Remove default page content from `src/app/page.tsx`, `src/app/globals.css` (keep Tailwind directives only).

**Step 3: Create .env.local with placeholders**

```env
# Upstash Redis (alkoholiks-api database)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Neon PostgreSQL
DATABASE_URL=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Cron security
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 4: Verify .env.local is in .gitignore**

**Step 5: Create GitHub repo and push**

```bash
cd C:\Users\Kasutaja\Claude_Projects\alkoholiks-api
gh repo create alkoholiks-api --public --source=. --push
```

**Step 6: Commit**

---

### Task 2: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install production dependencies**

```bash
npm install @upstash/redis @clerk/nextjs drizzle-orm @neondatabase/serverless bcryptjs swagger-ui-react
```

**Step 2: Install dev dependencies**

```bash
npm install -D drizzle-kit @types/bcryptjs @types/swagger-ui-react
```

**Step 3: Verify build still passes**

```bash
npx next build
```

**Step 4: Commit**

---

### Task 3: Copy Scrapers from HindRadar

**Files:**
- Create: `src/lib/scrapers/selver.ts` (copy from `hind-radar/src/lib/selver.ts`)
- Create: `src/lib/scrapers/prisma.ts` (copy from `hind-radar/src/lib/prisma.ts`)
- Create: `src/lib/scrapers/rimi.ts` (copy from `hind-radar/src/lib/rimi.ts`)
- Create: `src/lib/scrapers/barbora.ts` (copy from `hind-radar/src/lib/barbora.ts`)
- Create: `src/lib/scrapers/cityalko.ts` (copy from `hind-radar/src/lib/cityalko.ts`)
- Create: `src/lib/types.ts` (copy from `hind-radar/src/lib/types.ts`)
- Create: `src/lib/shared.ts` (copy from `hind-radar/src/lib/shared.ts`)

**Step 1: Create scrapers directory**

```bash
mkdir -p src/lib/scrapers
```

**Step 2: Copy all scraper files verbatim**

Copy each file exactly as-is from `C:\Users\Kasutaja\Claude_Projects\hind-radar\src\lib\`. No modifications. Adjust import paths only (e.g., `from "./types"` → `from "../types"` in scraper files, since types.ts is one level up).

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

---

### Task 4: Set Up Upstash Redis (New Database)

**Files:**
- Create: `src/lib/cache.ts`

**Step 1: Create new Upstash Redis database**

User creates `alkoholiks-api` database in Upstash console (eu-central-1). Copy REST URL + token to `.env.local`.

**Step 2: Write cache module**

```typescript
// src/lib/cache.ts
import { Redis } from "@upstash/redis";
import type { SelverProduct, StoreId } from "./types";
import { fetchSelverProducts } from "./scrapers/selver";
import { fetchPrismaProducts } from "./scrapers/prisma";
import { fetchRimiProducts } from "./scrapers/rimi";
import { fetchBarboraProducts } from "./scrapers/barbora";
import { fetchCityalkoProducts } from "./scrapers/cityalko";

const CACHE_TTL = 6 * 60 * 60; // 6 hours

const FETCHERS: Record<StoreId, () => Promise<SelverProduct[]>> = {
  selver: fetchSelverProducts,
  prisma: fetchPrismaProducts,
  rimi: fetchRimiProducts,
  barbora: fetchBarboraProducts,
  cityalko: fetchCityalkoProducts,
};

let redis: Redis | null = null;
function getRedis(): Redis {
  if (redis) return redis;
  redis = Redis.fromEnv();
  return redis;
}

// Read-only: only reads from cache, never triggers scrape
export async function getProducts(store: StoreId): Promise<SelverProduct[]> {
  const r = getRedis();
  const cached = await r.get<SelverProduct[]>(`${store}:products`);
  return cached || [];
}

// Get all products from all stores
export async function getAllProducts(): Promise<SelverProduct[]> {
  const stores: StoreId[] = ["selver", "prisma", "rimi", "barbora", "cityalko"];
  const results = await Promise.all(stores.map(getProducts));
  return results.flat();
}

// Get cache metadata (when was each store last refreshed)
export async function getCacheMetadata(): Promise<Record<StoreId, string | null>> {
  const r = getRedis();
  const stores: StoreId[] = ["selver", "prisma", "rimi", "barbora", "cityalko"];
  const result: Record<string, string | null> = {};
  for (const store of stores) {
    const ts = await r.get<string>(`${store}:updated_at`);
    result[store] = ts;
  }
  return result as Record<StoreId, string | null>;
}

// Called by cron: scrapes one store and writes to cache
export async function refreshStore(store: StoreId): Promise<number> {
  const fetcher = FETCHERS[store];
  const products = await fetcher();
  const r = getRedis();
  await r.set(`${store}:products`, products, { ex: CACHE_TTL });
  await r.set(`${store}:updated_at`, new Date().toISOString(), { ex: CACHE_TTL });
  return products.length;
}
```

**Step 3: Verify TypeScript compiles**

**Step 4: Commit**

---

### Task 5: Set Up Neon Database + Drizzle Schema

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Create: `drizzle.config.ts`

**Step 1: Write Drizzle schema**

```typescript
// src/db/schema.ts
import { pgTable, text, timestamp, integer, uuid, boolean } from "drizzle-orm/pg-core";

// API consumers (linked to Clerk users)
export const consumers = pgTable("consumers", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  appName: text("app_name").notNull(),
  clientId: text("client_id").notNull().unique(), // alk_cid_xxx
  clientSecretHash: text("client_secret_hash").notNull(), // bcrypt hash
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Usage audit log
export const usageLogs = pgTable("usage_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  consumerId: uuid("consumer_id").references(() => consumers.id).notNull(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code").notNull(),
  requestId: text("request_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Step 2: Write database connection**

```typescript
// src/db/index.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

**Step 3: Write Drizzle config**

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Step 4: Generate and run migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

**Step 5: Commit**

---

> **CHECKPOINT 1:** Verify foundation is solid — TypeScript compiles, dependencies installed, scraper files copied correctly, Neon schema pushed, Redis connection works. No browser test needed yet (no UI).

---

## Phase 2: Cron + OAuth 2.0 (Tasks 6-9)

### Task 6: Cron Refresh Endpoint

**Files:**
- Create: `src/app/api/cron/refresh/route.ts`
- Create: `vercel.json`

**Step 1: Write cron endpoint**

```typescript
// src/app/api/cron/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import { refreshStore } from "@/lib/cache";
import type { StoreId } from "@/lib/types";

const STORES: StoreId[] = ["selver", "prisma", "rimi", "barbora", "cityalko"];

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, number | string> = {};

  for (const store of STORES) {
    try {
      const count = await refreshStore(store);
      results[store] = count;
    } catch (err) {
      results[store] = `error: ${err instanceof Error ? err.message : "unknown"}`;
    }
  }

  return NextResponse.json({
    refreshed_at: new Date().toISOString(),
    results,
  });
}
```

**Step 2: Write vercel.json with cron schedule**

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh",
      "schedule": "0 */4 * * *"
    }
  ]
}
```

Note: Vercel crons use GET by default. Adjust the route to also handle GET, or use POST with Vercel's built-in `CRON_SECRET` verification via `x-vercel-cron-secret` header. Verify Vercel cron docs via Context7 before implementing.

**Step 3: Test locally**

```bash
curl -X POST http://localhost:3000/api/cron/refresh -H "Authorization: Bearer test-secret"
```

**Step 4: Commit**

---

### Task 7: OAuth 2.0 — Credential Generation + Token Endpoint

**Files:**
- Create: `src/lib/oauth.ts`
- Create: `src/app/api/oauth/token/route.ts`

**Step 1: Write OAuth utility module**

```typescript
// src/lib/oauth.ts
import { Redis } from "@upstash/redis";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const TOKEN_TTL = 3600; // 1 hour

let redis: Redis | null = null;
function getRedis(): Redis {
  if (redis) return redis;
  redis = Redis.fromEnv();
  return redis;
}

// Generate prefixed credentials
export function generateClientId(): string {
  return `alk_cid_${crypto.randomBytes(16).toString("hex")}`;
}

export function generateClientSecret(): string {
  return `alk_sec_${crypto.randomBytes(32).toString("hex")}`;
}

export function generateAccessToken(): string {
  return `alk_at_${crypto.randomBytes(32).toString("hex")}`;
}

export function generateRequestId(): string {
  return `req_${crypto.randomBytes(8).toString("hex")}`;
}

// Hash client secret for storage
export async function hashSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, 12);
}

// Verify client secret against hash
export async function verifySecret(secret: string, hash: string): Promise<boolean> {
  return bcrypt.compare(secret, hash);
}

// Store access token in Redis (mapped to consumer ID)
export async function storeToken(token: string, consumerId: string): Promise<void> {
  const r = getRedis();
  await r.set(`token:${token}`, consumerId, { ex: TOKEN_TTL });
}

// Validate access token — returns consumer ID or null
export async function validateToken(token: string): Promise<string | null> {
  const r = getRedis();
  return r.get<string>(`token:${token}`);
}

// Revoke all tokens for a consumer (on credential regeneration)
// Note: With opaque Redis tokens, we can't easily revoke all.
// Instead, we track active tokens per consumer.
export async function revokeConsumerTokens(consumerId: string): Promise<void> {
  const r = getRedis();
  const tokenKeys = await r.smembers(`consumer_tokens:${consumerId}`);
  if (tokenKeys.length > 0) {
    for (const key of tokenKeys) {
      await r.del(`token:${key}`);
    }
    await r.del(`consumer_tokens:${consumerId}`);
  }
}

// Store token with consumer tracking
export async function storeTokenTracked(token: string, consumerId: string): Promise<void> {
  const r = getRedis();
  await r.set(`token:${token}`, consumerId, { ex: TOKEN_TTL });
  await r.sadd(`consumer_tokens:${consumerId}`, token);
  await r.expire(`consumer_tokens:${consumerId}`, TOKEN_TTL);
}
```

**Step 2: Write token endpoint**

```typescript
// src/app/api/oauth/token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { consumers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySecret, generateAccessToken, storeTokenTracked } from "@/lib/oauth";

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  let grantType: string | null = null;
  let clientId: string | null = null;
  let clientSecret: string | null = null;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await req.formData();
    grantType = body.get("grant_type") as string;
    clientId = body.get("client_id") as string;
    clientSecret = body.get("client_secret") as string;
  } else if (contentType.includes("application/json")) {
    const body = await req.json();
    grantType = body.grant_type;
    clientId = body.client_id;
    clientSecret = body.client_secret;
  }

  // Validate grant_type
  if (grantType !== "client_credentials") {
    return NextResponse.json(
      {
        error: {
          code: "UNSUPPORTED_GRANT_TYPE",
          message: "Only client_credentials grant type is supported",
          docs_url: `${process.env.NEXT_PUBLIC_APP_URL}/docs/errors#UNSUPPORTED_GRANT_TYPE`,
        },
      },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "client_id and client_secret are required",
          docs_url: `${process.env.NEXT_PUBLIC_APP_URL}/docs/errors#INVALID_REQUEST`,
        },
      },
      { status: 400 }
    );
  }

  // Look up consumer
  const [consumer] = await db
    .select()
    .from(consumers)
    .where(eq(consumers.clientId, clientId))
    .limit(1);

  if (!consumer || !consumer.isActive) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_CLIENT",
          message: "Invalid client credentials",
          docs_url: `${process.env.NEXT_PUBLIC_APP_URL}/docs/errors#INVALID_CLIENT`,
        },
      },
      { status: 401 }
    );
  }

  // Verify secret
  const valid = await verifySecret(clientSecret, consumer.clientSecretHash);
  if (!valid) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_CLIENT",
          message: "Invalid client credentials",
          docs_url: `${process.env.NEXT_PUBLIC_APP_URL}/docs/errors#INVALID_CLIENT`,
        },
      },
      { status: 401 }
    );
  }

  // Issue token
  const accessToken = generateAccessToken();
  await storeTokenTracked(accessToken, consumer.id);

  return NextResponse.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
  });
}
```

**Step 3: Commit**

---

### Task 8: API Middleware (Auth + Rate Limiting)

**Files:**
- Create: `src/lib/rate-limit.ts`
- Create: `src/lib/middleware.ts`

**Step 1: Write rate limiter**

```typescript
// src/lib/rate-limit.ts
import { Redis } from "@upstash/redis";

const RATE_LIMIT = 100; // requests per hour
const WINDOW = 3600; // 1 hour in seconds

let redis: Redis | null = null;
function getRedis(): Redis {
  if (redis) return redis;
  redis = Redis.fromEnv();
  return redis;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp
  retryAfter: number | null; // seconds
}

export async function checkRateLimit(consumerId: string): Promise<RateLimitResult> {
  const r = getRedis();
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % WINDOW); // Align to hour boundary
  const key = `ratelimit:${consumerId}:${windowStart}`;

  const current = await r.incr(key);

  // Set expiry on first request in window
  if (current === 1) {
    await r.expire(key, WINDOW);
  }

  const resetAt = windowStart + WINDOW;
  const remaining = Math.max(0, RATE_LIMIT - current);
  const allowed = current <= RATE_LIMIT;

  return {
    allowed,
    remaining,
    resetAt,
    retryAfter: allowed ? null : resetAt - now,
  };
}
```

**Step 2: Write API middleware helper**

```typescript
// src/lib/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { validateToken, generateRequestId } from "./oauth";
import { checkRateLimit } from "./rate-limit";
import { db } from "@/db";
import { usageLogs } from "@/db/schema";

export interface AuthContext {
  consumerId: string;
  requestId: string;
}

// Returns AuthContext on success, or NextResponse (error) on failure
export async function authenticateRequest(
  req: NextRequest
): Promise<AuthContext | NextResponse> {
  const requestId = generateRequestId();

  // Extract Bearer token
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid Authorization header. Use: Bearer <access_token>",
          docs_url: `${process.env.NEXT_PUBLIC_APP_URL}/docs/errors#UNAUTHORIZED`,
        },
      },
      {
        status: 401,
        headers: { "X-Request-Id": requestId },
      }
    );
  }

  const token = authHeader.substring(7);
  const consumerId = await validateToken(token);

  if (!consumerId) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_TOKEN",
          message: "Access token is invalid or expired. Request a new token via POST /oauth/token",
          docs_url: `${process.env.NEXT_PUBLIC_APP_URL}/docs/errors#INVALID_TOKEN`,
        },
      },
      {
        status: 401,
        headers: { "X-Request-Id": requestId },
      }
    );
  }

  // Check rate limit
  const rateLimit = await checkRateLimit(consumerId);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `You have exceeded ${100} requests per hour`,
          retry_after: rateLimit.retryAfter,
          docs_url: `${process.env.NEXT_PUBLIC_APP_URL}/docs/errors#RATE_LIMIT_EXCEEDED`,
        },
      },
      {
        status: 429,
        headers: {
          "X-Request-Id": requestId,
          "Retry-After": String(rateLimit.retryAfter),
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetAt),
        },
      }
    );
  }

  return { consumerId, requestId };
}

// Build success response with standard headers
export function apiResponse(
  data: unknown,
  meta: Record<string, unknown>,
  ctx: AuthContext,
  rateLimit?: { remaining: number; resetAt: number }
): NextResponse {
  const headers: Record<string, string> = {
    "X-Request-Id": ctx.requestId,
  };

  if (rateLimit) {
    headers["X-RateLimit-Limit"] = "100";
    headers["X-RateLimit-Remaining"] = String(rateLimit.remaining);
    headers["X-RateLimit-Reset"] = String(rateLimit.resetAt);
  }

  return NextResponse.json(
    { data, meta: { ...meta, request_id: ctx.requestId } },
    { headers }
  );
}

// Log usage (fire-and-forget)
export function logUsage(
  ctx: AuthContext,
  endpoint: string,
  method: string,
  statusCode: number
): void {
  db.insert(usageLogs)
    .values({
      consumerId: ctx.consumerId,
      endpoint,
      method,
      statusCode,
      requestId: ctx.requestId,
    })
    .catch(() => {}); // fire-and-forget
}
```

**Step 3: Commit**

---

### Task 9: Rate Limit Headers on Authenticated Responses

Update `authenticateRequest` to also return rate limit info so endpoints can include headers on success responses.

**Files:**
- Modify: `src/lib/middleware.ts`

**Step 1: Extend AuthContext to include rate limit info**

Add `rateLimit: { remaining: number; resetAt: number }` to `AuthContext`. After the rate limit check passes, attach the result to the context.

**Step 2: Commit**

---

> **CHECKPOINT 2:** Test OAuth flow end-to-end locally:
> 1. Manually insert a test consumer in Neon (with hashed secret)
> 2. POST /oauth/token with client_credentials → receive access_token
> 3. Verify token works (validated from Redis)
> 4. Verify rate limiting increments in Redis
> 5. Verify expired/invalid tokens return proper 401 errors

---

## Phase 3: API Endpoints (Tasks 10-14)

### Task 10: GET /v1/products

**Files:**
- Create: `src/app/api/v1/products/route.ts`

**Step 1: Write products endpoint with filtering**

Accepts query params: `store`, `category`, `brand`, `country`, `price_min`, `price_max`, `on_sale`, `limit`, `offset`.

Reads from Redis cache via `getProducts()` / `getAllProducts()`. Applies filters in-memory. Returns paginated results in standard envelope.

**Step 2: Test with curl**

```bash
curl http://localhost:3000/api/v1/products -H "Authorization: Bearer <token>"
curl "http://localhost:3000/api/v1/products?store=selver&category=õlu&limit=10" -H "Authorization: Bearer <token>"
```

**Step 3: Commit**

---

### Task 11: GET /v1/products/search

**Files:**
- Create: `src/app/api/v1/products/search/route.ts`

**Step 1: Write search endpoint**

Accepts: `q` (required), `store`, `category`, `limit`, `offset`.

Searches across all stores (or filtered stores) by matching `q` against product `name` and `brand` (case-insensitive substring match). Returns results sorted by relevance (exact brand match first, then name contains).

**Step 2: Test with curl**

```bash
curl "http://localhost:3000/api/v1/products/search?q=monster" -H "Authorization: Bearer <token>"
curl "http://localhost:3000/api/v1/products/search?q=saku&store=selver,rimi" -H "Authorization: Bearer <token>"
```

**Step 3: Commit**

---

### Task 12: GET /v1/stores

**Files:**
- Create: `src/app/api/v1/stores/route.ts`

**Step 1: Write stores endpoint**

Returns static store metadata enriched with dynamic product counts and last-updated timestamps from Redis cache metadata.

```typescript
const STORE_META = {
  selver: { name: "Selver", website: "https://www.selver.ee", has_loyalty_pricing: true },
  prisma: { name: "Prisma", website: "https://www.prismamarket.ee", has_loyalty_pricing: false },
  rimi: { name: "Rimi", website: "https://www.rimi.ee", has_loyalty_pricing: false },
  barbora: { name: "Barbora", website: "https://barbora.ee", has_loyalty_pricing: false },
  cityalko: { name: "Cityalko", website: "https://cityalko.ee", has_loyalty_pricing: false },
};
```

**Step 2: Test with curl**

**Step 3: Commit**

---

### Task 13: GET /v1/categories

**Files:**
- Create: `src/app/api/v1/categories/route.ts`

**Step 1: Write categories endpoint**

Returns drink categories with product counts computed from cached data.

```typescript
const CATEGORY_META: Record<string, { name: string; name_en: string }> = {
  "õlu": { name: "Õlu", name_en: "Beer" },
  "siider": { name: "Siider", name_en: "Cider" },
  "long drink": { name: "Long drink", name_en: "Long Drink" },
  "kokteil": { name: "Kokteil", name_en: "Cocktail" },
  "energiajook": { name: "Energiajook", name_en: "Energy Drink" },
  "muu": { name: "Muu", name_en: "Other" },
};
```

**Step 2: Test with curl**

**Step 3: Commit**

---

### Task 14: Error Consistency Audit

**Files:**
- Modify: all route files

**Step 1: Ensure every endpoint uses the standard error envelope**

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "docs_url": "https://alkoholiks-api.vercel.app/docs/errors#ERROR_CODE"
  }
}
```

Verify: 400 (bad params), 401 (no/bad token), 429 (rate limit), 500 (internal). Each with proper `X-Request-Id` header.

**Step 2: Commit**

---

> **CHECKPOINT 3:** Test all 4 API endpoints via curl with a valid token:
> 1. Trigger cron refresh to populate cache
> 2. GET /v1/products — verify filtering works (store, category, brand, price range)
> 3. GET /v1/products/search?q=monster — verify cross-store search
> 4. GET /v1/stores — verify product counts and timestamps
> 5. GET /v1/categories — verify category counts
> 6. Verify all error responses follow standard envelope
> 7. Verify rate limit headers on every response

---

## Phase 4: OpenAPI Spec + Developer Portal (Tasks 15-21)

### Task 15: Write OpenAPI 3.1 Spec

**Files:**
- Create: `public/openapi.yaml`

**Step 1: Write comprehensive OpenAPI spec**

Define all endpoints, parameters, request/response schemas, error schemas, security schemes (OAuth 2.0 Client Credentials), and example responses.

The spec is the single source of truth. Include:
- `info` block with title, description, version, contact
- `servers` block with production URL
- `securityDefinitions` with OAuth2 client credentials flow
- All 4 v1 endpoints + token endpoint
- `components/schemas` for Product, Store, Category, Error, Meta
- Example values for every field

**Step 2: Validate spec**

Use online validator or `npx @apidevtools/swagger-cli validate public/openapi.yaml`

**Step 3: Commit**

---

### Task 16: Set Up Clerk Authentication

**Files:**
- Create: `src/middleware.ts` (Clerk middleware — Next.js root middleware)
- Modify: `src/app/layout.tsx` (wrap with ClerkProvider)

**Step 1: Configure Clerk middleware**

Protect `/dashboard` routes. Leave `/api/v1/*`, `/api/oauth/*`, `/api/cron/*`, `/docs`, and `/` as public.

**Step 2: Wrap layout with ClerkProvider**

**Step 3: Verify Clerk env vars are set**

User creates Clerk application in dashboard, copies keys to `.env.local`.

**Step 4: Commit**

---

### Task 17: Landing Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Build landing page**

Clean, professional page:
- Hero: "Alkoholiks API" + tagline ("Estonian retail drink prices, one API")
- What it offers: 5 stores, 1000+ products, real-time prices
- How it works: Register → Get credentials → Get token → Query
- CTA: "Get Started" → `/dashboard`
- Footer with link to docs

Use project brand color (determine during implementation — check HindRadar for inspiration or pick one). Follow CLAUDE.md design rules: `bg-white`, `rounded-lg`, `border-b` separators, no shadows on cards.

**Step 2: Commit**

---

### Task 18: Developer Dashboard

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/app/api/dashboard/credentials/route.ts`
- Create: `src/app/api/dashboard/usage/route.ts`

**Step 1: Write credential management API routes**

`POST /api/dashboard/credentials` — generates new client_id + client_secret for the logged-in Clerk user. Stores hashed secret in Neon. Returns credentials (secret shown ONCE).

`DELETE /api/dashboard/credentials` — revokes existing credentials and all active tokens.

`GET /api/dashboard/usage` — returns usage stats for current user from Neon.

**Step 2: Build dashboard page**

- Shows `client_id` (always visible)
- "Generate New Credentials" button (warns: this revokes existing)
- Secret shown once in a copy-to-clipboard modal after generation
- Usage stats: requests today, this hour, quota remaining
- Link to docs

**Step 3: Commit**

---

### Task 19: Swagger UI Docs Page

**Files:**
- Create: `src/app/docs/page.tsx`

**Step 1: Install and configure Swagger UI React**

```typescript
// src/app/docs/page.tsx
"use client";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function DocsPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <SwaggerUI url="/openapi.yaml" />
    </div>
  );
}
```

**Step 2: Style overrides if needed**

Ensure Swagger UI styling doesn't clash with Tailwind. May need a wrapper with CSS reset.

**Step 3: Commit**

---

### Task 20: Quickstart Guide Page

**Files:**
- Create: `src/app/docs/quickstart/page.tsx`

**Step 1: Build quickstart page**

Static content page with:
1. Register + get credentials
2. Exchange for token (curl example)
3. Make your first API call (curl example)
4. Install the SDK (`npm install alkoholiks-sdk`)
5. SDK usage example (TypeScript)
6. Error handling example
7. Rate limiting explanation

All code blocks with syntax highlighting (use `<pre><code>` or a lightweight highlighter).

**Step 2: Commit**

---

### Task 21: Error Reference Page

**Files:**
- Create: `src/app/docs/errors/page.tsx`

**Step 1: Build errors reference page**

Table of all error codes with descriptions, HTTP status, and example responses:
- UNAUTHORIZED (401)
- INVALID_TOKEN (401)
- INVALID_CLIENT (401)
- INVALID_REQUEST (400)
- UNSUPPORTED_GRANT_TYPE (400)
- RATE_LIMIT_EXCEEDED (429)
- VALIDATION_ERROR (400)
- INTERNAL_ERROR (500)

Each with anchor IDs so `docs_url` links work.

**Step 2: Commit**

---

> **CHECKPOINT 4:** Open the app in browser via chrome-devtools MCP:
> 1. Landing page renders correctly, CTA links to dashboard
> 2. Clerk auth works — can sign up, sign in
> 3. Dashboard shows credential generation flow
> 4. Swagger UI docs page loads and renders all endpoints
> 5. Quickstart page content is accurate
> 6. Error reference page has all error codes with working anchor IDs
> 7. Full flow: Register → Dashboard → Generate creds → Get token → Use Swagger "Try it out"

---

## Phase 5: SDK + Deploy (Tasks 22-25)

### Task 22: Generate TypeScript SDK

**Files:**
- Create: `sdk/index.ts`
- Create: `sdk/package.json`
- Create: `sdk/tsconfig.json`
- Create: `sdk/README.md`

**Step 1: Write hand-crafted TypeScript SDK**

For v1, a hand-written SDK is better than auto-generated (cleaner, typed, documented). It wraps the OAuth flow + all endpoints:

```typescript
// sdk/index.ts
class AlkoholiksAPI {
  constructor(config: { clientId: string; clientSecret: string; baseUrl?: string });

  // Auth
  async getToken(): Promise<void>; // auto-manages token lifecycle

  // Endpoints
  async getProducts(params?: ProductsParams): Promise<ProductsResponse>;
  async searchProducts(query: string, params?: SearchParams): Promise<ProductsResponse>;
  async getStores(): Promise<StoresResponse>;
  async getCategories(): Promise<CategoriesResponse>;
}
```

The SDK handles:
- Token acquisition and auto-refresh on 401
- Rate limit retry with exponential backoff
- Type-safe params and responses
- Error wrapping

**Step 2: Write SDK README**

Installation, usage examples, API reference.

**Step 3: Commit**

---

### Task 23: Deploy to Vercel

**Files:**
- Verify: all env vars set in Vercel

**Step 1: Set environment variables in Vercel**

```bash
echo -n "value" | npx vercel env add UPSTASH_REDIS_REST_URL production
echo -n "value" | npx vercel env add UPSTASH_REDIS_REST_TOKEN production
echo -n "value" | npx vercel env add DATABASE_URL production
echo -n "value" | npx vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
echo -n "value" | npx vercel env add CLERK_SECRET_KEY production
echo -n "value" | npx vercel env add CRON_SECRET production
echo -n "value" | npx vercel env add NEXT_PUBLIC_APP_URL production
```

**Step 2: Deploy**

```bash
npx vercel --yes --prod
```

**Step 3: Trigger initial cron to populate cache**

```bash
curl -X POST https://alkoholiks-api.vercel.app/api/cron/refresh -H "Authorization: Bearer <CRON_SECRET>"
```

**Step 4: Commit any deployment fixes**

---

### Task 24: Deployment Verification

**Step 1: Browser E2E via chrome-devtools MCP**

Per CLAUDE.md deployment verification checklist:
1. Wait 30s for CDN propagation
2. Navigate to live URL
3. Check console for JS errors, network tab for 4xx/5xx
4. Verify: landing page, Clerk auth, dashboard, docs, quickstart, error reference
5. Full OAuth flow: register → generate creds → get token → search via Swagger UI

**Step 2: Verify cron fires**

Check Vercel dashboard → Crons tab to confirm schedule is registered.

**Step 3: Test API from external client**

```bash
# Get token
curl -X POST https://alkoholiks-api.vercel.app/api/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=alk_cid_xxx&client_secret=alk_sec_xxx"

# Search
curl "https://alkoholiks-api.vercel.app/api/v1/products/search?q=monster" \
  -H "Authorization: Bearer alk_at_xxx"
```

---

### Task 25: Update Documentation Stack

**Files:**
- Create: `STACK.md` (per-project)
- Modify: `C:\Users\Kasutaja\Claude_Projects\STACK.md` (global — add project + services)
- Modify: `MEMORY.md` (add project entry)

**Step 1: Create per-project STACK.md**

Gotchas, dev commands, env var requirements.

**Step 2: Update global STACK.md**

Add Alkoholiks API to Projects table. Add any new services (second Upstash Redis DB).

**Step 3: Update MEMORY.md**

Add project entry with key context.

**Step 4: Commit**

---

> **CHECKPOINT 5 (FINAL):** Complete end-to-end verification:
> 1. Live deployment works — all pages render
> 2. Full OAuth flow works from external client (not Swagger UI)
> 3. All 4 API endpoints return correct data
> 4. Rate limiting works (hit 100 requests, get 429)
> 5. Error responses follow standard envelope
> 6. Cron is registered in Vercel
> 7. SDK compiles and types are correct
> 8. Documentation is complete
> 9. Portfolio-ready (separate project, clean repo)

---

## Task Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1. Foundation | 1-5 | Scaffold, deps, copy scrapers, Redis, Neon |
| 2. Cron + OAuth | 6-9 | Cron refresh, token endpoint, middleware, rate limiting |
| 3. API Endpoints | 10-14 | 4 v1 endpoints + error consistency |
| 4. Portal + Docs | 15-21 | OpenAPI spec, Clerk, landing, dashboard, Swagger UI, quickstart, errors |
| 5. SDK + Deploy | 22-25 | TypeScript SDK, deploy, verify, documentation |

**Total: 25 tasks across 5 phases with 5 checkpoints.**
