import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { getPublicRouteStates, updatePublicRouteSettings } from "@/lib/public-routes";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isAdmin(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    return NextResponse.json({ routes: await getPublicRouteStates() });
  } catch {
    return NextResponse.json({ error: "Route settings are unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const payload = (await request.json().catch(() => null)) as {
    path?: unknown;
    locked?: unknown;
    listed?: unknown;
  } | null;

  if (
    typeof payload?.path !== "string" ||
    (typeof payload.locked !== "boolean" && typeof payload.listed !== "boolean")
  ) {
    return NextResponse.json({ error: "Invalid route update." }, { status: 400 });
  }

  try {
    await updatePublicRouteSettings(payload.path, {
      locked: typeof payload.locked === "boolean" ? payload.locked : undefined,
      listed: typeof payload.listed === "boolean" ? payload.listed : undefined,
    });
    return NextResponse.json({ routes: await getPublicRouteStates() });
  } catch {
    return NextResponse.json({ error: "Could not save the route settings." }, { status: 503 });
  }
}
