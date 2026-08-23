import { timingSafeEqual } from "node:crypto";

import { cleanupExpiredFakemailAliases } from "@/lib/fakemail";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.FAKEMAIL_CLEANUP_SECRET;
  const authorization = request.headers.get("authorization");
  const providedSecret = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (!configuredSecret || !providedSecret) return false;

  const configuredBuffer = Buffer.from(configuredSecret);
  const providedBuffer = Buffer.from(providedSecret);
  return (
    configuredBuffer.length === providedBuffer.length &&
    timingSafeEqual(configuredBuffer, providedBuffer)
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const result = await cleanupExpiredFakemailAliases();
    return NextResponse.json(result, { status: result.failed > 0 ? 503 : 200 });
  } catch {
    return NextResponse.json(
      { error: "Could not clean up expired fakemail aliases." },
      { status: 503 },
    );
  }
}
