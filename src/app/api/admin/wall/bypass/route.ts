import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { getWallBypassSettings, isValidWallBypassSuffix, saveWallBypassSettings } from "@/lib/wall";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  try {
    return NextResponse.json({ settings: await getWallBypassSettings() });
  } catch {
    return NextResponse.json({ error: "Bypass settings are unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  const payload = (await request.json().catch(() => null)) as {
    suffix?: unknown;
    enabled?: unknown;
  } | null;
  if (
    !payload ||
    (payload.suffix === undefined && payload.enabled === undefined) ||
    (payload.suffix !== undefined &&
      (typeof payload.suffix !== "string" || !isValidWallBypassSuffix(payload.suffix))) ||
    (payload.enabled !== undefined && typeof payload.enabled !== "boolean")
  ) {
    return NextResponse.json({ error: "Invalid bypass settings." }, { status: 400 });
  }

  try {
    const current = await getWallBypassSettings();
    const settings = await saveWallBypassSettings({
      suffix: typeof payload.suffix === "string" ? payload.suffix : current.suffix,
      enabled: typeof payload.enabled === "boolean" ? payload.enabled : current.enabled,
    });
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: "Could not save bypass settings." }, { status: 503 });
  }
}
