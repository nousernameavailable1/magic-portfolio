import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { NOTE_PASSWORD_LIMITS, hashNotePassword, isValidNotePasswordValue } from "@/lib/note-auth";
import {
  NoteSlugConflictError,
  createNote,
  deleteNote,
  getAllNotes,
  normalizeNoteSlug,
  updateNote,
  validateNoteInput,
} from "@/lib/notes";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function isAuthorized(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[1-9]\d*$/.test(value);
}

function parseNoteInput(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as Record<string, unknown>;
  if (
    typeof candidate.title !== "string" ||
    typeof candidate.slug !== "string" ||
    typeof candidate.summary !== "string" ||
    typeof candidate.body !== "string" ||
    typeof candidate.public !== "boolean" ||
    typeof candidate.privatePassword !== "string"
  ) {
    return null;
  }

  const input = {
    title: candidate.title.trim(),
    slug: normalizeNoteSlug(candidate.slug),
    summary: candidate.summary.trim() || null,
    body: candidate.body.trim(),
    public: candidate.public,
  };
  return {
    input,
    privatePassword: candidate.privatePassword,
    validationError: validateNoteInput(input),
  };
}

function passwordValidationError(password: string, required: boolean) {
  if (!password && !required) return null;
  if (!isValidNotePasswordValue(password)) {
    return `Private-note passwords must be between ${NOTE_PASSWORD_LIMITS.min} and ${NOTE_PASSWORD_LIMITS.max} characters.`;
  }
  return null;
}

function revalidateNotes(previousSlug?: string, nextSlug?: string) {
  revalidatePath("/notes");
  if (previousSlug) revalidatePath(`/notes/${previousSlug}`);
  if (nextSlug && nextSlug !== previousSlug) revalidatePath(`/notes/${nextSlug}`);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  try {
    return NextResponse.json({ notes: await getAllNotes() });
  } catch {
    return NextResponse.json({ error: "Notes are unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const parsed = parseNoteInput(await request.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: "Invalid note." }, { status: 400 });
  if (parsed.validationError) {
    return NextResponse.json({ error: parsed.validationError }, { status: 400 });
  }
  const passwordError = passwordValidationError(parsed.privatePassword, !parsed.input.public);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  try {
    const passwordHash = parsed.privatePassword
      ? await hashNotePassword(parsed.privatePassword)
      : null;
    const note = await createNote(parsed.input, passwordHash);
    revalidateNotes(undefined, note.slug);
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    if (error instanceof NoteSlugConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create this note." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!validId(payload?.id)) {
    return NextResponse.json({ error: "Invalid note." }, { status: 400 });
  }
  const parsed = parseNoteInput(payload);
  if (!parsed) return NextResponse.json({ error: "Invalid note." }, { status: 400 });
  if (parsed.validationError) {
    return NextResponse.json({ error: parsed.validationError }, { status: 400 });
  }

  try {
    const existing = (await getAllNotes()).find((note) => note.id === payload.id);
    if (!existing) return NextResponse.json({ error: "Note not found." }, { status: 404 });
    const passwordError = passwordValidationError(
      parsed.privatePassword,
      !parsed.input.public && !existing.hasPassword,
    );
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
    const passwordHash = parsed.privatePassword
      ? await hashNotePassword(parsed.privatePassword)
      : undefined;
    const note = await updateNote(payload.id, parsed.input, passwordHash);
    if (!note) return NextResponse.json({ error: "Note not found." }, { status: 404 });
    revalidateNotes(existing.slug, note.slug);
    return NextResponse.json({ note });
  } catch (error) {
    if (error instanceof NoteSlugConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not save this note." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const id = request.nextUrl.searchParams.get("id");
  if (!validId(id)) return NextResponse.json({ error: "Invalid note." }, { status: 400 });

  try {
    const existing = (await getAllNotes()).find((note) => note.id === id);
    if (!existing || !(await deleteNote(id))) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }
    revalidateNotes(existing.slug);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete this note." }, { status: 503 });
  }
}
