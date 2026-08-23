import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import {
  clearVisitorCookie,
  getExistingVisitorId,
  getVisitor,
  recordVisit,
  removeVisitor,
  setVisitorCookie,
} from "@/lib/visitor-analytics";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const hasAdminSession = isValidAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
    if (hasAdminSession) {
      const visitorId = getExistingVisitorId(request);
      if (visitorId) {
        try {
          await removeVisitor(visitorId);
        } catch {
          // Analytics cleanup must not cause an admin session to be treated as a visitor.
        }
      }

      const response = NextResponse.json({ ok: true, skipped: true });
      clearVisitorCookie(response);
      return response;
    }

    const visitor = getVisitor(request);
    await recordVisit(visitor.visitorId);

    const response = NextResponse.json({ ok: true }, { status: 201 });
    if (visitor.created) setVisitorCookie(response, visitor.visitorId);
    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
