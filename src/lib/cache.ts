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
