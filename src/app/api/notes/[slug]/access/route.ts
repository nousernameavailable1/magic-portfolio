import {
  createNoteSession,
  getNoteSessionCookieName,
  isValidNotePassword,
  noteSessionCookie,
} from "@/lib/note-auth";
import { getNoteAccessRecordBySlug } from "@/lib/notes";
import { PAGE_SESSION_COOKIE, isValidPageSession } from "@/lib/page-auth";
import { isPublicRouteLocked } from "@/lib/public-routes";
import { isNotePasswordRateLimited } from "@/lib/rate-limit";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type AccessRouteContext = { params: Promise<{ slug: string }> };

async function hasNotesPageAccess(request: NextRequest) {
  if (!(await isPublicRouteLocked("/notes"))) return true;
  return isValidPageSession(request.cookies.get(PAGE_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest, { params }: AccessRouteContext) {
  if (!(await hasNotesPageAccess(request))) {
    return NextResponse.json({ error: "Page access is required." }, { status: 401 });
  }

  const { slug } = await params;
  if (isNotePasswordRateLimited(request.headers.get("x-forwarded-for"), slug)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  const payload = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof payload?.password === "string" ? payload.password : "";

  try {
    const note = await getNoteAccessRecordBySlug(slug);
    if (!note || note.public) {
      return NextResponse.json({ error: "Private note not found." }, { status: 404 });
    }
    if (!note.passwordHash) {
      return NextResponse.json(
        { error: "This note is not configured for access." },
        { status: 403 },
      );
    }
    if (!(await isValidNotePassword(password, note.passwordHash))) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(
      getNoteSessionCookieName(note.id),
      createNoteSession(note.id, note.passwordHash),
      noteSessionCookie(note.slug),
    );
    return response;
  } catch {
    return NextResponse.json({ error: "Could not unlock this note." }, { status: 503 });
  }
}
