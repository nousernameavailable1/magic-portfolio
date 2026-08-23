import { PAGE_SESSION_COOKIE, isValidPageSession } from "@/lib/page-auth";
import { isPublicRouteLocked } from "@/lib/public-routes";
import { isReactionRateLimited } from "@/lib/rate-limit";
import { toggleWallReaction } from "@/lib/wall";
import { getReactionVisitor, setReactionVisitorCookie } from "@/lib/wall-reaction-visitor";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function hasWallAccess(request: NextRequest) {
  if (!(await isPublicRouteLocked("/wall"))) return true;
  return isValidPageSession(request.cookies.get(PAGE_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await hasWallAccess(request))) {
    return NextResponse.json({ error: "Password required." }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  }

  if (isReactionRateLimited(request.headers.get("x-forwarded-for"))) {
    return NextResponse.json({ error: "Please slow down before reacting again." }, { status: 429 });
  }

  try {
    const visitor = getReactionVisitor(request);
    const reaction = await toggleWallReaction(id, visitor.visitorId);
    if (!reaction) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    const response = NextResponse.json({ reaction });
    if (visitor.created) setReactionVisitorCookie(response, visitor.visitorId);
    return response;
  } catch {
    return NextResponse.json({ error: "Could not update the reaction." }, { status: 503 });
  }
}
