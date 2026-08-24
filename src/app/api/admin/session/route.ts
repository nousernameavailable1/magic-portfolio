import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookie,
  createAdminSession,
  isValidAdminPassword,
  isValidAdminUsername,
} from "@/lib/admin-auth";
import { clearVisitorCookie, getExistingVisitorId, removeVisitor } from "@/lib/visitor-analytics";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as {
    username?: unknown;
    password?: unknown;
  } | null;
  const username = typeof payload?.username === "string" ? payload.username : "";
  const password = typeof payload?.password === "string" ? payload.password : "";

  if (!isValidAdminUsername(username) || !isValidAdminPassword(password)) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const session = createAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin authentication is not configured." }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, session, adminSessionCookie);

  const visitorId = getExistingVisitorId(request);
  if (visitorId) {
    try {
      await removeVisitor(visitorId);
    } catch {
      // Admin access must not be blocked by a non-essential analytics cleanup failure.
    }
  }
  clearVisitorCookie(response);

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { ...adminSessionCookie, maxAge: 0 });
  return response;
}
