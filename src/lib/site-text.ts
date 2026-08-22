import "server-only";

import { cache } from "react";
import { database } from "./database";

export const siteTextDefinitions = [
  {
    key: "home.headline",
    label: "Home headline",
    description: "The large line at the top of the home page.",
    defaultValue: "Doomscrolling reddit...",
    maxLength: 120,
    lines: 2,
  },
  {
    key: "home.subline",
    label: "Home description",
    description: "The introductory text below the home headline.",
    defaultValue:
      "This site still contains the original template content. Most of the descriptions and text are pregenerated and irrelevant.",
    maxLength: 500,
    lines: 4,
  },
  {
    key: "wall.heading",
    label: "Wall heading",
    description: "The main heading at the top of the Wall.",
    defaultValue: "Say it anonymously.",
    maxLength: 120,
    lines: 2,
  },
  {
    key: "wall.description",
    label: "Wall description",
    description: "The sentence beneath the Wall heading.",
    defaultValue:
      "A feedback, request, opinion, thought, insult, compliment or literally anything else",
    maxLength: 300,
    lines: 3,
  },
] as const;

export type SiteTextKey = (typeof siteTextDefinitions)[number]["key"];
export type SiteTextValues = Record<SiteTextKey, string>;
export type SiteTextState = {
  defaults: SiteTextValues;
  values: SiteTextValues;
};

const definitionByKey = new Map(
  siteTextDefinitions.map((definition) => [definition.key, definition]),
);

export function isSiteTextKey(value: string): value is SiteTextKey {
  return siteTextDefinitions.some((definition) => definition.key === value);
}

export function getSiteTextDefinition(key: SiteTextKey) {
  const definition = definitionByKey.get(key);
  if (!definition) throw new Error("Unknown text field.");
  return definition;
}

function defaultSiteText(): SiteTextValues {
  return Object.fromEntries(
    siteTextDefinitions.map((definition) => [definition.key, definition.defaultValue]),
  ) as SiteTextValues;
}

export const getSiteTextState = cache(async (): Promise<SiteTextState> => {
  const defaults = defaultSiteText();
  const values = { ...defaults };

  try {
    const db = await database();
    const [defaultResult, valueResult] = await Promise.all([
      db.query<{ key: string; value: string }>("SELECT key, value FROM site_text_defaults"),
      db.query<{ key: string; value: string }>("SELECT key, value FROM site_text"),
    ]);

    for (const row of defaultResult.rows) {
      if (isSiteTextKey(row.key) && row.value.trim()) {
        defaults[row.key] = row.value;
        values[row.key] = row.value;
      }
    }
    for (const row of valueResult.rows) {
      if (isSiteTextKey(row.key) && row.value.trim()) {
        values[row.key] = row.value;
      }
    }
  } catch {
    // Public pages retain their built-in copy if the optional text store is unavailable.
  }

  return { defaults, values };
});

export const getSiteText = cache(async (): Promise<SiteTextValues> => {
  return (await getSiteTextState()).values;
});

export async function saveSiteText(key: SiteTextKey, value: string) {
  const definition = getSiteTextDefinition(key);
  const normalized = value.trim();
  if (!normalized || normalized.length > definition.maxLength) {
    throw new Error("Invalid text value.");
  }

  const db = await database();
  await db.query(
    `
      INSERT INTO site_text (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = NOW()
    `,
    [key, normalized],
  );
}

export async function resetSiteText(key: SiteTextKey) {
  const db = await database();
  await db.query("DELETE FROM site_text WHERE key = $1", [key]);
}

export async function setSiteTextDefault(key: SiteTextKey, value: string) {
  const definition = getSiteTextDefinition(key);
  const normalized = value.trim();
  if (!normalized || normalized.length > definition.maxLength) {
    throw new Error("Invalid text value.");
  }

  const db = await database();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
        INSERT INTO site_text_defaults (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_at = NOW()
      `,
      [key, normalized],
    );
    await client.query("DELETE FROM site_text WHERE key = $1", [key]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
