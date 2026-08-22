import { PAGE_SESSION_COOKIE, isValidPageSession } from "@/lib/page-auth";
import { isSubmissionRateLimited } from "@/lib/rate-limit";
import { getSiteText } from "@/lib/site-text";
import { createSubmission, getPublishedSubmissions, prepareSubmission } from "@/lib/wall";
import { getReactionVisitor, setReactionVisitorCookie } from "@/lib/wall-reaction-visitor";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Serves the password-protected public message wall.

function hasPageAccess(request: NextRequest) {
  return isValidPageSession(request.cookies.get(PAGE_SESSION_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  if (!hasPageAccess(request)) {
    return NextResponse.json({ error: "Password required." }, { status: 401 });
  }

  try {
    const visitor = getReactionVisitor(request);
    const [submissions, text] = await Promise.all([
      getPublishedSubmissions(visitor.visitorId),
      getSiteText(),
    ]);
    const response = NextResponse.json({
      submissions,
      text: {
        heading: text["wall.heading"],
        description: text["wall.description"],
      },
    });
    if (visitor.created) setReactionVisitorCookie(response, visitor.visitorId);
    return response;
  } catch {
    return NextResponse.json(
      { error: "The anonymous feed is unavailable right now." },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!hasPageAccess(request)) {
    return NextResponse.json({ error: "Password required." }, { status: 401 });
  }

  let payload: { body?: unknown; website?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  if (typeof payload.website === "string" && payload.website.trim()) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const requestedBody = typeof payload.body === "string" ? payload.body.trim() : "";
  const { body, publishImmediately } = await prepareSubmission(requestedBody);
  if (!body || body.length > 2000) {
    return NextResponse.json({ error: "Write between 1 and 2,000 characters." }, { status: 400 });
  }

  if (isSubmissionRateLimited(request.headers.get("x-forwarded-for"))) {
    return NextResponse.json(
      { error: "Please wait a little before submitting again." },
      { status: 429 },
    );
  }

  try {
    await createSubmission(body, publishImmediately);
    return NextResponse.json({ ok: true, published: publishImmediately }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Your submission could not be saved. Please try again." },
      { status: 503 },
    );
  }
}
