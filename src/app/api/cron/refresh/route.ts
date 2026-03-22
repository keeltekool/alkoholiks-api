import { NextRequest, NextResponse } from "next/server";
import { refreshStore } from "@/lib/cache";
import type { StoreId } from "@/lib/types";

const STORES: StoreId[] = ["selver", "prisma", "rimi", "barbora", "cityalko"];

export const maxDuration = 300; // 5 min — scrapers can be slow

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
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
