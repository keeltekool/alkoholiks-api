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
