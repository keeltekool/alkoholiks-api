import { NextRequest, NextResponse } from "next/server";
import { validateToken, generateRequestId } from "./oauth";
import { checkRateLimit, type RateLimitResult } from "./rate-limit";
import { db } from "@/db";
import { usageLogs } from "@/db/schema";

export interface AuthContext {
  consumerId: string;
  requestId: string;
  rateLimit: { remaining: number; resetAt: number };
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
          message: "You have exceeded 100 requests per hour",
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

  return {
    consumerId,
    requestId,
    rateLimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt },
  };
}

// Build success response with standard headers
export function apiResponse(
  data: unknown,
  meta: Record<string, unknown>,
  ctx: AuthContext
): NextResponse {
  return NextResponse.json(
    { data, meta: { ...meta, request_id: ctx.requestId } },
    {
      headers: {
        "X-Request-Id": ctx.requestId,
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": String(ctx.rateLimit.remaining),
        "X-RateLimit-Reset": String(ctx.rateLimit.resetAt),
      },
    }
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
