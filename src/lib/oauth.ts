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
export async function storeTokenTracked(token: string, consumerId: string): Promise<void> {
  const r = getRedis();
  await r.set(`token:${token}`, consumerId, { ex: TOKEN_TTL });
  await r.sadd(`consumer_tokens:${consumerId}`, token);
  await r.expire(`consumer_tokens:${consumerId}`, TOKEN_TTL);
}

// Validate access token — returns consumer ID or null
export async function validateToken(token: string): Promise<string | null> {
  const r = getRedis();
  return r.get<string>(`token:${token}`);
}

// Revoke all tokens for a consumer (on credential regeneration)
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
