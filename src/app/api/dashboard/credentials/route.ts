import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { consumers } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  generateClientId,
  generateClientSecret,
  hashSecret,
  revokeConsumerTokens,
} from "@/lib/oauth";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [consumer] = await db
    .select({
      clientId: consumers.clientId,
      appName: consumers.appName,
      isActive: consumers.isActive,
      createdAt: consumers.createdAt,
    })
    .from(consumers)
    .where(eq(consumers.clerkUserId, userId))
    .limit(1);

  return NextResponse.json({ consumer: consumer || null });
}

export async function POST(req: Request) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const appName = body.appName || "My App";
  const email = (sessionClaims as { email?: string })?.email || "";

  // Check if consumer already exists
  const [existing] = await db
    .select()
    .from(consumers)
    .where(eq(consumers.clerkUserId, userId))
    .limit(1);

  if (existing) {
    // Regenerate credentials
    await revokeConsumerTokens(existing.id);

    const newClientId = generateClientId();
    const newSecret = generateClientSecret();
    const hash = await hashSecret(newSecret);

    await db
      .update(consumers)
      .set({
        clientId: newClientId,
        clientSecretHash: hash,
        appName,
        updatedAt: new Date(),
      })
      .where(eq(consumers.id, existing.id));

    return NextResponse.json({
      clientId: newClientId,
      clientSecret: newSecret,
      message: "Credentials regenerated. Old credentials revoked.",
    });
  }

  // Create new consumer
  const clientId = generateClientId();
  const clientSecret = generateClientSecret();
  const hash = await hashSecret(clientSecret);

  await db.insert(consumers).values({
    clerkUserId: userId,
    email,
    appName,
    clientId,
    clientSecretHash: hash,
  });

  return NextResponse.json({
    clientId,
    clientSecret,
    message: "Credentials created. Save your client_secret — it won't be shown again.",
  });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [existing] = await db
    .select()
    .from(consumers)
    .where(eq(consumers.clerkUserId, userId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "No credentials found" }, { status: 404 });
  }

  await revokeConsumerTokens(existing.id);

  await db
    .update(consumers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(consumers.id, existing.id));

  return NextResponse.json({ message: "Credentials revoked." });
}
