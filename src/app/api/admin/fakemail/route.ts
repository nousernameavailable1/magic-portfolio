import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import {
  FakemailError,
  type FakemailExpiration,
  createFakemailAlias,
  deleteFakemailAlias,
  getActiveFakemailAliases,
  getFakemailSettings,
} from "@/lib/fakemail";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof FakemailError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: fallback }, { status: 503 });
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  try {
    return NextResponse.json({
      ...getFakemailSettings(),
      aliases: await getActiveFakemailAliases(),
    });
  } catch (error) {
    return errorResponse(error, "Fakemail aliases are unavailable.");
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  const payload = (await request.json().catch(() => null)) as {
    expiresIn?: unknown;
    localPart?: unknown;
    mode?: unknown;
  } | null;
  if (
    (payload?.mode !== "custom" && payload?.mode !== "random") ||
    (payload?.expiresIn !== "1h" &&
      payload?.expiresIn !== "1d" &&
      payload?.expiresIn !== "1w" &&
      payload?.expiresIn !== "never") ||
    (payload?.localPart !== undefined && typeof payload.localPart !== "string")
  ) {
    return NextResponse.json({ error: "Invalid fakemail request." }, { status: 400 });
  }

  try {
    const alias = await createFakemailAlias({
      expiresIn: payload.expiresIn as FakemailExpiration,
      localPart: payload.localPart,
      mode: payload.mode,
    });
    return NextResponse.json({ alias }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Could not create the fakemail alias.");
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "An alias is required." }, { status: 400 });

  try {
    await deleteFakemailAlias(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, "Could not delete the fakemail alias.");
  }
}
