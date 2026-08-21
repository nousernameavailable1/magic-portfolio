import { NextRequest, NextResponse } from "next/server";
import { createSubmission, getPublishedSubmissions } from "@/lib/anon";
import { isSubmissionRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

function hasPageAccess(request: NextRequest) {
  return request.cookies.get("authToken")?.value === "authenticated";
}

export async function GET(request: NextRequest) {
  if (!hasPageAccess(request)) {
    return NextResponse.json({ error: "Password required." }, { status: 401 });
  }

  try {
    return NextResponse.json({ submissions: await getPublishedSubmissions() });
  } catch {
    return NextResponse.json({ error: "The anonymous feed is unavailable right now." }, { status: 503 });
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

  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body || body.length > 2000) {
    return NextResponse.json({ error: "Write between 1 and 2,000 characters." }, { status: 400 });
  }

  if (isSubmissionRateLimited(request.headers.get("x-forwarded-for"))) {
    return NextResponse.json({ error: "Please wait a little before submitting again." }, { status: 429 });
  }

  try {
    await createSubmission(body);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Your submission could not be saved. Please try again." }, { status: 503 });
  }
}
