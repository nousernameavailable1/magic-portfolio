import "server-only";

import {
  type StudyEntry,
  type TechnicalSkillEntry,
  defaultStudies,
  defaultTechnicalSkills,
} from "@/lib/about-section-data";
import { database } from "@/lib/database";
import { cache } from "react";

const STUDIES_STORE_KEY = "about.studyEntries";
const TECHNICAL_SKILLS_STORE_KEY = "about.technicalSkillEntries";

function copyStudies(studies = defaultStudies) {
  return studies.map((study) => ({ ...study }));
}

function copyTechnicalSkills(skills = defaultTechnicalSkills) {
  return skills.map((skill) => ({
    ...skill,
    tags: skill.tags.map((tag) => ({ ...tag })),
    images: skill.images.map((image) => ({ ...image })),
  }));
}

function isImage(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const image = value as Record<string, unknown>;
  return (
    typeof image.src === "string" &&
    typeof image.alt === "string" &&
    typeof image.width === "number" &&
    typeof image.height === "number"
  );
}

function isStudy(value: unknown): value is StudyEntry {
  if (!value || typeof value !== "object") return false;
  const study = value as Record<string, unknown>;
  return (
    typeof study.id === "string" &&
    typeof study.name === "string" &&
    typeof study.description === "string"
  );
}

function isTechnicalSkill(value: unknown): value is TechnicalSkillEntry {
  if (!value || typeof value !== "object") return false;
  const skill = value as Record<string, unknown>;
  return (
    typeof skill.id === "string" &&
    typeof skill.title === "string" &&
    typeof skill.description === "string" &&
    Array.isArray(skill.tags) &&
    skill.tags.every(
      (tag) =>
        Boolean(tag) &&
        typeof tag === "object" &&
        typeof (tag as Record<string, unknown>).id === "string" &&
        typeof (tag as Record<string, unknown>).name === "string" &&
        typeof (tag as Record<string, unknown>).icon === "string",
    ) &&
    Array.isArray(skill.images) &&
    skill.images.every(isImage)
  );
}

function parseList<T>(
  value: string | undefined,
  guard: (item: unknown) => item is T,
  fallback: T[],
) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) && parsed.every(guard) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

async function getStoredValue(key: string) {
  const db = await database();
  const result = await db.query<{ value: string }>("SELECT value FROM site_text WHERE key = $1", [
    key,
  ]);
  return result.rows[0]?.value;
}

async function saveStoredValue(key: string, value: unknown) {
  const db = await database();
  await db.query(
    `
      INSERT INTO site_text (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = NOW()
    `,
    [key, JSON.stringify(value)],
  );
}

export async function getStoredStudies() {
  return parseList(await getStoredValue(STUDIES_STORE_KEY), isStudy, copyStudies());
}

export const getStudies = cache(async () => {
  try {
    return await getStoredStudies();
  } catch {
    return copyStudies();
  }
});

export function saveStudies(studies: StudyEntry[]) {
  return saveStoredValue(STUDIES_STORE_KEY, studies);
}

export async function getStoredTechnicalSkills() {
  return parseList(
    await getStoredValue(TECHNICAL_SKILLS_STORE_KEY),
    isTechnicalSkill,
    copyTechnicalSkills(),
  );
}

export const getTechnicalSkills = cache(async () => {
  try {
    return await getStoredTechnicalSkills();
  } catch {
    return copyTechnicalSkills();
  }
});

export function saveTechnicalSkills(skills: TechnicalSkillEntry[]) {
  return saveStoredValue(TECHNICAL_SKILLS_STORE_KEY, skills);
}
