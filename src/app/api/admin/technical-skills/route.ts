import { randomUUID } from "node:crypto";
import {
  TECHNICAL_SKILL_LIMITS,
  type TechnicalSkillInput,
  technicalIconNames,
} from "@/lib/about-section-data";
import { getStoredTechnicalSkills, saveTechnicalSkills } from "@/lib/about-sections";
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

function parseInput(payload: unknown): { input?: TechnicalSkillInput; error?: string } {
  if (!payload || typeof payload !== "object") return { error: "Invalid technical skill." };
  const candidate = payload as Record<string, unknown>;
  if (
    typeof candidate.title !== "string" ||
    typeof candidate.description !== "string" ||
    !Array.isArray(candidate.tags)
  ) {
    return { error: "Invalid technical skill." };
  }

  const tags = candidate.tags.map((value) => {
    if (!value || typeof value !== "object") return null;
    const tag = value as Record<string, unknown>;
    if (!validId(tag.id) || typeof tag.name !== "string" || typeof tag.icon !== "string") {
      return null;
    }
    return { id: tag.id, name: tag.name.trim(), icon: tag.icon };
  });
  const input = {
    title: candidate.title.trim(),
    description: candidate.description.trim(),
    tags: tags.filter((tag): tag is NonNullable<typeof tag> => Boolean(tag)),
  };
  if (tags.some((tag) => tag === null) || tags.length > TECHNICAL_SKILL_LIMITS.tags) {
    return { error: `Use up to ${TECHNICAL_SKILL_LIMITS.tags} valid tags.` };
  }
  if (!input.title || input.title.length > TECHNICAL_SKILL_LIMITS.title) {
    return { error: `Title must be between 1 and ${TECHNICAL_SKILL_LIMITS.title} characters.` };
  }
  if (!input.description || input.description.length > TECHNICAL_SKILL_LIMITS.description) {
    return {
      error: `Description must be between 1 and ${TECHNICAL_SKILL_LIMITS.description} characters.`,
    };
  }
  if (
    input.tags.some(
      (tag) =>
        !tag.name ||
        tag.name.length > TECHNICAL_SKILL_LIMITS.tagName ||
        !technicalIconNames.has(tag.icon),
    )
  ) {
    return {
      error: `Each tag needs a name of up to ${TECHNICAL_SKILL_LIMITS.tagName} characters and a supported icon.`,
    };
  }
  return { input };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  try {
    return NextResponse.json({ skills: await getStoredTechnicalSkills() });
  } catch {
    return NextResponse.json({ error: "Technical skills are unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const parsed = parseInput(await request.json().catch(() => null));
  if (!parsed.input) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const skills = await getStoredTechnicalSkills();
    const skill = { id: randomUUID(), ...parsed.input, images: [] };
    await saveTechnicalSkills([...skills, skill]);
    revalidatePath("/about");
    return NextResponse.json({ skill }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create this technical skill." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!validId(payload?.id)) {
    return NextResponse.json({ error: "Invalid technical skill." }, { status: 400 });
  }
  const parsed = parseInput(payload);
  if (!parsed.input) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const skills = await getStoredTechnicalSkills();
    const index = skills.findIndex((skill) => skill.id === payload.id);
    if (index === -1) {
      return NextResponse.json({ error: "Technical skill not found." }, { status: 404 });
    }
    const skill = { ...skills[index], ...parsed.input };
    await saveTechnicalSkills(
      skills.map((item, itemIndex) => (itemIndex === index ? skill : item)),
    );
    revalidatePath("/about");
    return NextResponse.json({ skill });
  } catch {
    return NextResponse.json({ error: "Could not save this technical skill." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const id = request.nextUrl.searchParams.get("id");
  if (!validId(id)) {
    return NextResponse.json({ error: "Invalid technical skill." }, { status: 400 });
  }
  try {
    const skills = await getStoredTechnicalSkills();
    const updated = skills.filter((skill) => skill.id !== id);
    if (updated.length === skills.length) {
      return NextResponse.json({ error: "Technical skill not found." }, { status: 404 });
    }
    await saveTechnicalSkills(updated);
    revalidatePath("/about");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete this technical skill." }, { status: 503 });
  }
}
