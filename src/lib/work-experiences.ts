import "server-only";

import { database } from "@/lib/database";
import { type WorkExperience, defaultWorkExperiences } from "@/lib/work-experience-data";
import { cache } from "react";

const STORE_KEY = "about.workExperiences";

function copyDefaults() {
  return defaultWorkExperiences.map((experience) => ({
    ...experience,
    achievements: [...experience.achievements],
    images: experience.images.map((image) => ({ ...image })),
  }));
}

function isWorkExperience(value: unknown): value is WorkExperience {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.company === "string" &&
    typeof entry.role === "string" &&
    typeof entry.timeframe === "string" &&
    Array.isArray(entry.achievements) &&
    entry.achievements.every((achievement) => typeof achievement === "string") &&
    Array.isArray(entry.images) &&
    entry.images.every(
      (image) =>
        Boolean(image) &&
        typeof image === "object" &&
        typeof (image as Record<string, unknown>).src === "string" &&
        typeof (image as Record<string, unknown>).alt === "string" &&
        typeof (image as Record<string, unknown>).width === "number" &&
        typeof (image as Record<string, unknown>).height === "number",
    )
  );
}

function parseStoredExperiences(value: string | undefined) {
  if (!value) return copyDefaults();
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) && parsed.every(isWorkExperience) ? parsed : copyDefaults();
  } catch {
    return copyDefaults();
  }
}

export async function getStoredWorkExperiences() {
  const db = await database();
  const result = await db.query<{ value: string }>("SELECT value FROM site_text WHERE key = $1", [
    STORE_KEY,
  ]);
  return parseStoredExperiences(result.rows[0]?.value);
}

export const getWorkExperiences = cache(async () => {
  try {
    return await getStoredWorkExperiences();
  } catch {
    return copyDefaults();
  }
});

export async function saveWorkExperiences(experiences: WorkExperience[]) {
  const db = await database();
  await db.query(
    `
      INSERT INTO site_text (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = NOW()
    `,
    [STORE_KEY, JSON.stringify(experiences)],
  );
}
