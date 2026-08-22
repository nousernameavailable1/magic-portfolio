import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { clearWallReactions } from "@/lib/wall";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  }

  try {
    const cleared = await clearWallReactions(id);
    return cleared === null
      ? NextResponse.json({ error: "Approved message not found." }, { status: 404 })
      : NextResponse.json({ cleared });
  } catch {
    return NextResponse.json({ error: "Could not clear likes." }, { status: 503 });
  }
}
