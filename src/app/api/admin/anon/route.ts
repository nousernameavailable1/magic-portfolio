import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import {
  deleteSubmission,
  getModerationSubmissions,
  isAnonStatus,
  updateSubmission,
} from "@/lib/anon";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function isAuthorized(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function validId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const status = request.nextUrl.searchParams.get("status");
  if (status && !isAnonStatus(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  const submissionStatus = status && isAnonStatus(status) ? status : undefined;

  try {
    return NextResponse.json({ submissions: await getModerationSubmissions(submissionStatus) });
  } catch {
    return NextResponse.json({ error: "The moderation queue is unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const payload = (await request.json().catch(() => null)) as {
    id?: unknown;
    status?: unknown;
    pinned?: unknown;
  } | null;
  if (!validId(payload?.id) || !isAnonStatus(payload?.status)) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  try {
    const submission = await updateSubmission(payload.id, payload.status, payload.pinned === true);
    return submission
      ? NextResponse.json({ submission })
      : NextResponse.json({ error: "Submission not found." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Could not update this submission." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  try {
    return (await deleteSubmission(id))
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Submission not found." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Could not delete this submission." }, { status: 503 });
  }
}
