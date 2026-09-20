import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { type RandomMessageInput, isRandomMessageCategory } from "@/lib/random-message-data";
import {
  createRandomMessage,
  deleteRandomMessage,
  getAllRandomMessages,
  updateRandomMessage,
  validateRandomMessageInput,
} from "@/lib/random-messages";
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

function parseInput(payload: unknown): { input?: RandomMessageInput; error?: string } {
  if (!payload || typeof payload !== "object") return { error: "Invalid message." };
  const candidate = payload as Record<string, unknown>;
  if (
    typeof candidate.body !== "string" ||
    !isRandomMessageCategory(candidate.category) ||
    typeof candidate.source !== "string" ||
    typeof candidate.active !== "boolean"
  ) {
    return { error: "Invalid message." };
  }

  const input: RandomMessageInput = {
    body: candidate.body.trim(),
    category: candidate.category,
    source: candidate.source.trim() || null,
    active: candidate.active,
  };
  return { input, error: validateRandomMessageInput(input) ?? undefined };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  try {
    return NextResponse.json({ messages: await getAllRandomMessages() });
  } catch {
    return NextResponse.json({ error: "The message pool is unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const parsed = parseInput(await request.json().catch(() => null));
  if (!parsed.input || parsed.error) {
    return NextResponse.json({ error: parsed.error ?? "Invalid message." }, { status: 400 });
  }

  try {
    return NextResponse.json({ message: await createRandomMessage(parsed.input) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not add this message." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!validId(payload?.id)) {
    return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  }
  const parsed = parseInput(payload);
  if (!parsed.input || parsed.error) {
    return NextResponse.json({ error: parsed.error ?? "Invalid message." }, { status: 400 });
  }

  try {
    const message = await updateRandomMessage(payload.id, parsed.input);
    return message
      ? NextResponse.json({ message })
      : NextResponse.json({ error: "Message not found." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Could not save this message." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const id = request.nextUrl.searchParams.get("id");
  if (!validId(id)) return NextResponse.json({ error: "Invalid message." }, { status: 400 });

  try {
    return (await deleteRandomMessage(id))
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Message not found." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Could not delete this message." }, { status: 503 });
  }
}
