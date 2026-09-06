import { randomUUID } from "node:crypto";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { WORK_EXPERIENCE_LIMITS, type WorkExperienceInput } from "@/lib/work-experience-data";
import { getStoredWorkExperiences, saveWorkExperiences } from "@/lib/work-experiences";
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

function parseInput(payload: unknown): { input?: WorkExperienceInput; error?: string } {
  if (!payload || typeof payload !== "object") return { error: "Invalid work experience." };
  const candidate = payload as Record<string, unknown>;
  if (
    typeof candidate.company !== "string" ||
    typeof candidate.role !== "string" ||
    typeof candidate.timeframe !== "string" ||
    !Array.isArray(candidate.achievements) ||
    !candidate.achievements.every((achievement) => typeof achievement === "string")
  ) {
    return { error: "Invalid work experience." };
  }

  const input = {
    company: candidate.company.trim(),
    role: candidate.role.trim(),
    timeframe: candidate.timeframe.trim(),
    achievements: candidate.achievements.map((achievement) => achievement.trim()),
  };
  if (!input.company || input.company.length > WORK_EXPERIENCE_LIMITS.company) {
    return { error: `Company must be between 1 and ${WORK_EXPERIENCE_LIMITS.company} characters.` };
  }
  if (!input.role || input.role.length > WORK_EXPERIENCE_LIMITS.role) {
    return { error: `Role must be between 1 and ${WORK_EXPERIENCE_LIMITS.role} characters.` };
  }
  if (!input.timeframe || input.timeframe.length > WORK_EXPERIENCE_LIMITS.timeframe) {
    return {
      error: `Timeframe must be between 1 and ${WORK_EXPERIENCE_LIMITS.timeframe} characters.`,
    };
  }
  if (
    input.achievements.length > WORK_EXPERIENCE_LIMITS.achievements ||
    input.achievements.some(
      (achievement) => !achievement || achievement.length > WORK_EXPERIENCE_LIMITS.achievement,
    )
  ) {
    return {
      error: `Use up to ${WORK_EXPERIENCE_LIMITS.achievements} bullet points, each between 1 and ${WORK_EXPERIENCE_LIMITS.achievement} characters.`,
    };
  }
  return { input };
}

function revalidateAbout() {
  revalidatePath("/about");
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  try {
    return NextResponse.json({ experiences: await getStoredWorkExperiences() });
  } catch {
    return NextResponse.json({ error: "Work experience is unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const parsed = parseInput(await request.json().catch(() => null));
  if (!parsed.input) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const experiences = await getStoredWorkExperiences();
    const experience = { id: randomUUID(), ...parsed.input, images: [] };
    const updated = [...experiences, experience];
    await saveWorkExperiences(updated);
    revalidateAbout();
    return NextResponse.json({ experience }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create this work experience." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!validId(payload?.id)) {
    return NextResponse.json({ error: "Invalid work experience." }, { status: 400 });
  }
  const parsed = parseInput(payload);
  if (!parsed.input) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const experiences = await getStoredWorkExperiences();
    const index = experiences.findIndex((experience) => experience.id === payload.id);
    if (index === -1) {
      return NextResponse.json({ error: "Work experience not found." }, { status: 404 });
    }
    const experience = { ...experiences[index], ...parsed.input };
    const updated = experiences.map((item, itemIndex) => (itemIndex === index ? experience : item));
    await saveWorkExperiences(updated);
    revalidateAbout();
    return NextResponse.json({ experience });
  } catch {
    return NextResponse.json({ error: "Could not save this work experience." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const id = request.nextUrl.searchParams.get("id");
  if (!validId(id)) {
    return NextResponse.json({ error: "Invalid work experience." }, { status: 400 });
  }

  try {
    const experiences = await getStoredWorkExperiences();
    const updated = experiences.filter((experience) => experience.id !== id);
    if (updated.length === experiences.length) {
      return NextResponse.json({ error: "Work experience not found." }, { status: 404 });
    }
    await saveWorkExperiences(updated);
    revalidateAbout();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete this work experience." }, { status: 503 });
  }
}
