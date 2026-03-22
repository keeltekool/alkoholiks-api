import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { consumers, usageLogs } from "@/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [consumer] = await db
    .select()
    .from(consumers)
    .where(eq(consumers.clerkUserId, userId))
    .limit(1);

  if (!consumer) {
    return NextResponse.json({ usage: null });
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [hourCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.consumerId, consumer.id),
        gte(usageLogs.createdAt, oneHourAgo)
      )
    );

  const [dayCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.consumerId, consumer.id),
        gte(usageLogs.createdAt, todayStart)
      )
    );

  return NextResponse.json({
    usage: {
      requestsThisHour: Number(hourCount?.count || 0),
      requestsToday: Number(dayCount?.count || 0),
      quotaRemaining: Math.max(0, 100 - Number(hourCount?.count || 0)),
      rateLimit: 100,
    },
  });
}
