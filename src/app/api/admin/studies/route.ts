import { randomUUID } from "node:crypto";
import { STUDY_LIMITS, type StudyEntryInput } from "@/lib/about-section-data";
import { getStoredStudies, saveStudies } from "@/lib/about-sections";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
}

function parseInput(payload: unknown): { input?: StudyEntryInput; error?: string } {
  if (!payload || typeof payload !== "object") return { error: "Invalid study entry." };
  const candidate = payload as Record<string, unknown>;
  if (typeof candidate.name !== "string" || typeof candidate.description !== "string") {
    return { error: "Invalid study entry." };
  }
  const input = { name: candidate.name.trim(), description: candidate.description.trim() };
  if (!input.name || input.name.length > STUDY_LIMITS.name) {
    return { error: `Name must be between 1 and ${STUDY_LIMITS.name} characters.` };
  }
  if (!input.description || input.description.length > STUDY_LIMITS.description) {
    return {
      error: `Description must be between 1 and ${STUDY_LIMITS.description} characters.`,
    };
  }
  return { input };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  try {
    return NextResponse.json({ studies: await getStoredStudies() });
  } catch {
    return NextResponse.json({ error: "Studies are unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const parsed = parseInput(await request.json().catch(() => null));
  if (!parsed.input) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const studies = await getStoredStudies();
    const study = { id: randomUUID(), ...parsed.input };
    await saveStudies([...studies, study]);
    revalidatePath("/about");
    return NextResponse.json({ study }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create this study entry." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!validId(payload?.id)) {
    return NextResponse.json({ error: "Invalid study entry." }, { status: 400 });
  }
  const parsed = parseInput(payload);
  if (!parsed.input) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const studies = await getStoredStudies();
    const index = studies.findIndex((study) => study.id === payload.id);
    if (index === -1) return NextResponse.json({ error: "Study not found." }, { status: 404 });
    const study = { ...studies[index], ...parsed.input };
    await saveStudies(studies.map((item, itemIndex) => (itemIndex === index ? study : item)));
    revalidatePath("/about");
    return NextResponse.json({ study });
  } catch {
    return NextResponse.json({ error: "Could not save this study entry." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const id = request.nextUrl.searchParams.get("id");
  if (!validId(id)) return NextResponse.json({ error: "Invalid study entry." }, { status: 400 });
  try {
    const studies = await getStoredStudies();
    const updated = studies.filter((study) => study.id !== id);
    if (updated.length === studies.length) {
      return NextResponse.json({ error: "Study not found." }, { status: 404 });
    }
    await saveStudies(updated);
    revalidatePath("/about");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete this study entry." }, { status: 503 });
  }
}
