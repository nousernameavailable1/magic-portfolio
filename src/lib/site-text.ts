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
    key: "home.afterHoursHeadline",
    label: "After-hours home headline",
    description: "Shown on the home page from 1:00 AM to 5:59 AM (Asia/Dubai).",
    parentKey: "home.headline",
    defaultValue: "It’s after 1 AM.",
    maxLength: 120,
    lines: 2,
  },
  {
    key: "home.afterHoursDescription",
    label: "After-hours home description",
    description: "Shown below the after-hours home headline.",
    parentKey: "home.subline",
    defaultValue: "The site will still be here tomorrow. Get some sleep.",
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
  {
    key: "about.financeVisible",
    label: "Finance visibility",
    description: "Whether the Finance section appears on the About page.",
    defaultValue: "true",
    maxLength: 5,
    lines: 1,
  },
  {
    key: "about.finance",
    label: "Finance details",
    description:
      "Update the card and banking details shown in the Finance section on the About page.",
    defaultValue: "Finance",
    maxLength: 20,
    lines: 1,
  },
  {
    key: "about.finance.bankName",
    label: "Bank name",
    description: "The bank name at the top of the card.",
    parentKey: "about.finance",
    defaultValue: "HSBC",
    maxLength: 40,
    lines: 1,
  },
  {
    key: "about.finance.cardNumber",
    label: "Card number",
    description: "The formatted number displayed on the card.",
    parentKey: "about.finance",
    defaultValue: "3635 9255 7328 2369",
    maxLength: 24,
    lines: 1,
  },
  {
    key: "about.finance.cardholder",
    label: "Cardholder",
    description: "The name shown on the card.",
    parentKey: "about.finance",
    defaultValue: "TALAL KADLI",
    maxLength: 80,
    lines: 1,
  },
  {
    key: "about.finance.cvv",
    label: "CVV",
    description: "The CVV field shown on the card.",
    parentKey: "about.finance",
    defaultValue: "418",
    maxLength: 4,
    lines: 1,
  },
  {
    key: "about.finance.validThru",
    label: "Valid thru",
    description: "The expiry value shown on the card.",
    parentKey: "about.finance",
    defaultValue: "09/30",
    maxLength: 8,
    lines: 1,
  },
  {
    key: "about.finance.account",
    label: "Account",
    description: "The account value shown beside the card.",
    parentKey: "about.finance",
    defaultValue: "042 918 375",
    maxLength: 40,
    lines: 1,
  },
  {
    key: "about.finance.iban",
    label: "IBAN",
    description: "The IBAN value shown beside the card.",
    parentKey: "about.finance",
    defaultValue: "AE45 0742 4693 1962 5396 205",
    maxLength: 48,
    lines: 1,
  },
  {
    key: "about.finance.swift",
    label: "SWIFT",
    description: "The SWIFT value shown beside the card.",
    parentKey: "about.finance",
    defaultValue: "HSBCAE74",
    maxLength: 20,
    lines: 1,
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

export async function getFinanceVisibility() {
  return (await getSiteText())["about.financeVisible"] !== "false";
}

export async function getFinanceDetails() {
  const text = await getSiteText();
  return {
    account: text["about.finance.account"],
    bankName: text["about.finance.bankName"],
    cardholder: text["about.finance.cardholder"],
    cardNumber: text["about.finance.cardNumber"],
    cvv: text["about.finance.cvv"],
    iban: text["about.finance.iban"],
    swift: text["about.finance.swift"],
    validThru: text["about.finance.validThru"],
  };
}

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
