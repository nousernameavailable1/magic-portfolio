import { randomBytes } from "node:crypto";
import "server-only";

import { database } from "./database";

const DEFAULT_DOMAIN = "kadli.org";
const EXPIRATION_DURATIONS = {
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
  never: null,
} as const;

export type FakemailExpiration = keyof typeof EXPIRATION_DURATIONS;
export type FakemailAlias = {
  id: string;
  email: string;
  expiresAt: string | null;
  createdAt: string;
};
export type FakemailSettings = {
  aliases: FakemailAlias[];
  configured: boolean;
  domain: string;
};

type FakemailAliasRow = {
  id: string;
  local_part: string;
  email: string;
  cloudflare_rule_id: string;
  expires_at: Date | string | null;
  created_at: Date | string;
};

type CloudflareResponse<T> = {
  errors?: Array<{ message?: string }>;
  result?: T;
  success?: boolean;
};

type CloudflareRule = {
  id?: string;
};

export class FakemailError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "FakemailError";
  }
}

function getFakemailDomain() {
  const domain = (process.env.FAKEMAIL_DOMAIN ?? DEFAULT_DOMAIN).trim().toLowerCase();
  if (
    !domain ||
    domain.length > 253 ||
    !domain.includes(".") ||
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.includes("..") ||
    !/^[a-z0-9.-]+$/.test(domain)
  ) {
    throw new FakemailError("FAKEMAIL_DOMAIN is invalid.", 500);
  }

  return domain;
}

function getConfiguration() {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const forwardTo = process.env.FAKEMAIL_FORWARD_TO?.trim().toLowerCase();

  if (!apiToken || !zoneId || !forwardTo) {
    throw new FakemailError(
      "Fakemail is not configured. Add the Cloudflare token, zone ID, and forwarding address.",
      503,
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forwardTo)) {
    throw new FakemailError("FAKEMAIL_FORWARD_TO is invalid.", 500);
  }

  return { apiToken, domain: getFakemailDomain(), forwardTo, zoneId };
}

function maxLocalPartLength(domain: string) {
  return Math.min(64, 90 - domain.length - 1);
}

function normalizeLocalPart(localPart: string, domain: string) {
  const normalized = localPart.trim().toLowerCase();
  const maxLength = maxLocalPartLength(domain);
  if (
    !normalized ||
    normalized.length > maxLength ||
    !/^[a-z0-9](?:[a-z0-9._+-]*[a-z0-9])?$/.test(normalized)
  ) {
    throw new FakemailError(
      `Aliases must use 1-${maxLength} lowercase letters, numbers, dots, underscores, pluses, or hyphens.`,
      400,
    );
  }

  return normalized;
}

function getExpiration(expiresIn: FakemailExpiration) {
  const duration = EXPIRATION_DURATIONS[expiresIn];
  if (duration === undefined) throw new FakemailError("Invalid expiry duration.", 400);
  return duration === null ? null : new Date(Date.now() + duration);
}

function getRandomLocalPart() {
  return `mail-${randomBytes(6).toString("hex")}`;
}

function serializeAlias(row: FakemailAliasRow): FakemailAlias {
  return {
    id: row.id,
    email: row.email,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function getCloudflareErrorMessage(payload: CloudflareResponse<unknown> | null) {
  return (
    payload?.errors
      ?.map((error) => error.message)
      .filter(Boolean)
      .join(" ") || null
  );
}

async function createCloudflareRule(email: string) {
  const configuration = getConfiguration();
  let response: Response;

  try {
    response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${configuration.zoneId}/email/routing/rules`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${configuration.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actions: [{ type: "forward", value: [configuration.forwardTo] }],
          enabled: true,
          matchers: [{ type: "literal", field: "to", value: email }],
          name: `Fakemail: ${email}`,
        }),
      },
    );
  } catch {
    throw new FakemailError("Cloudflare could not be reached.", 502);
  }

  const payload = (await response
    .json()
    .catch(() => null)) as CloudflareResponse<CloudflareRule> | null;
  const ruleId = payload?.result?.id;
  if (!response.ok || !payload?.success || !ruleId) {
    throw new FakemailError(
      getCloudflareErrorMessage(payload) ?? "Cloudflare could not create the forwarding rule.",
      502,
    );
  }

  return ruleId;
}

async function deleteCloudflareRule(ruleId: string) {
  const configuration = getConfiguration();
  let response: Response;

  try {
    response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${configuration.zoneId}/email/routing/rules/${ruleId}`,
      {
        method: "DELETE",
        cache: "no-store",
        headers: { Authorization: `Bearer ${configuration.apiToken}` },
      },
    );
  } catch {
    throw new FakemailError("Cloudflare could not be reached.", 502);
  }

  if (response.status === 404) return;

  const payload = (await response.json().catch(() => null)) as CloudflareResponse<unknown> | null;
  if (!response.ok || !payload?.success) {
    throw new FakemailError(
      getCloudflareErrorMessage(payload) ?? "Cloudflare could not delete the forwarding rule.",
      502,
    );
  }
}

async function getAliasById(id: string) {
  const db = await database();
  const result = await db.query<FakemailAliasRow>(
    `
      SELECT id::TEXT, local_part, email, cloudflare_rule_id, expires_at, created_at
      FROM fakemail_aliases
      WHERE id = $1 AND deleted_at IS NULL
    `,
    [id],
  );
  return result.rows[0] ?? null;
}

async function markAliasDeleted(id: string) {
  const db = await database();
  await db.query("UPDATE fakemail_aliases SET deleted_at = NOW() WHERE id = $1", [id]);
}

export function getFakemailSettings(): Pick<FakemailSettings, "configured" | "domain"> {
  try {
    return { configured: true, domain: getConfiguration().domain };
  } catch {
    return { configured: false, domain: getFakemailDomain() };
  }
}

export async function getActiveFakemailAliases() {
  const db = await database();
  const result = await db.query<FakemailAliasRow>(`
    SELECT id::TEXT, local_part, email, cloudflare_rule_id, expires_at, created_at
    FROM fakemail_aliases
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
  `);
  return result.rows.map(serializeAlias);
}

export async function createFakemailAlias({
  expiresIn,
  localPart,
  mode,
}: {
  expiresIn: FakemailExpiration;
  localPart?: string;
  mode: "custom" | "random";
}) {
  if (mode !== "custom" && mode !== "random") {
    throw new FakemailError("Invalid alias type.", 400);
  }

  const configuration = getConfiguration();
  const expiresAt = getExpiration(expiresIn);
  const db = await database();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const normalizedLocalPart =
      mode === "random"
        ? getRandomLocalPart()
        : normalizeLocalPart(typeof localPart === "string" ? localPart : "", configuration.domain);
    const email = `${normalizedLocalPart}@${configuration.domain}`;
    const existing = await db.query<{ id: string }>(
      "SELECT id::TEXT FROM fakemail_aliases WHERE email = $1 AND deleted_at IS NULL",
      [email],
    );

    if (existing.rowCount) {
      if (mode === "random") continue;
      throw new FakemailError("That alias already exists.", 409);
    }

    const cloudflareRuleId = await createCloudflareRule(email);
    try {
      const result = await db.query<FakemailAliasRow>(
        `
          INSERT INTO fakemail_aliases (local_part, email, cloudflare_rule_id, expires_at)
          VALUES ($1, $2, $3, $4)
          RETURNING id::TEXT, local_part, email, cloudflare_rule_id, expires_at, created_at
        `,
        [normalizedLocalPart, email, cloudflareRuleId, expiresAt],
      );
      const alias = result.rows[0];
      if (!alias) throw new FakemailError("The alias could not be saved.", 503);
      return serializeAlias(alias);
    } catch (error) {
      try {
        await deleteCloudflareRule(cloudflareRuleId);
      } catch {
        // Preserve the original database error after a best-effort Cloudflare rollback.
      }

      if (mode === "random" && attempt < 4) continue;
      if (error instanceof FakemailError) throw error;
      throw new FakemailError("The alias could not be saved.", 503);
    }
  }

  throw new FakemailError("Could not generate a unique alias. Please try again.", 503);
}

export async function deleteFakemailAlias(id: string) {
  if (!/^\d+$/.test(id)) throw new FakemailError("Invalid alias.", 400);

  const alias = await getAliasById(id);
  if (!alias) throw new FakemailError("That alias no longer exists.", 404);

  await deleteCloudflareRule(alias.cloudflare_rule_id);
  await markAliasDeleted(alias.id);
}

export async function cleanupExpiredFakemailAliases() {
  const db = await database();
  const result = await db.query<FakemailAliasRow>(`
    SELECT id::TEXT, local_part, email, cloudflare_rule_id, expires_at, created_at
    FROM fakemail_aliases
    WHERE deleted_at IS NULL AND expires_at <= NOW()
    ORDER BY expires_at ASC
    LIMIT 100
  `);

  let deleted = 0;
  let failed = 0;
  for (const alias of result.rows) {
    try {
      await deleteCloudflareRule(alias.cloudflare_rule_id);
      await markAliasDeleted(alias.id);
      deleted += 1;
    } catch {
      failed += 1;
    }
  }

  return { deleted, failed };
}
