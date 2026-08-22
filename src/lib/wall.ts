import { database } from "@/lib/database";

export const WALL_STATUSES = ["pending", "approved", "rejected"] as const;
export type WallStatus = (typeof WALL_STATUSES)[number];
export const DEFAULT_WALL_BYPASS_SETTINGS = {
  suffix: "--bypass",
  enabled: true,
} as const;
const WALL_BYPASS_SUFFIX_MAX_LENGTH = 80;

export type WallBypassSettings = {
  suffix: string;
  enabled: boolean;
};

export type WallSubmission = {
  id: number;
  body: string;
  comment: string | null;
  reactionCount: number;
  reacted: boolean;
  status: WallStatus;
  pinned: boolean;
  createdAt: string;
  reviewedAt: string | null;
  publishedAt: string | null;
};

type SubmissionRow = {
  id: string;
  body: string;
  admin_note: string | null;
  status: WallStatus;
  pinned: boolean;
  created_at: Date;
  reviewed_at: Date | null;
  published_at: Date | null;
  reaction_count?: string;
  reacted?: boolean;
};

function mapSubmission(row: SubmissionRow): WallSubmission {
  return {
    id: Number(row.id),
    body: row.body,
    comment: row.admin_note,
    reactionCount: Number(row.reaction_count ?? 0),
    reacted: row.reacted ?? false,
    status: row.status,
    pinned: row.pinned,
    createdAt: row.created_at.toISOString(),
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
    publishedAt: row.published_at?.toISOString() ?? null,
  };
}

export function isWallStatus(value: unknown): value is WallStatus {
  return typeof value === "string" && WALL_STATUSES.includes(value as WallStatus);
}

export async function getPublishedSubmissions(visitorId?: string) {
  const db = await database();
  const result = await db.query<SubmissionRow>(
    `
    SELECT
      submissions.id,
      submissions.body,
      submissions.admin_note,
      submissions.status,
      submissions.pinned,
      submissions.created_at,
      submissions.reviewed_at,
      submissions.published_at,
      COUNT(reactions.submission_id) AS reaction_count,
      COALESCE(BOOL_OR(reactions.visitor_id = $1::uuid), FALSE) AS reacted
    FROM wall_submissions AS submissions
    LEFT JOIN wall_reactions AS reactions ON reactions.submission_id = submissions.id
    WHERE submissions.status = 'approved'
    GROUP BY
      submissions.id,
      submissions.body,
      submissions.admin_note,
      submissions.status,
      submissions.pinned,
      submissions.created_at,
      submissions.reviewed_at,
      submissions.published_at
    ORDER BY submissions.pinned DESC, submissions.published_at DESC
    LIMIT 100
  `,
    [visitorId ?? null],
  );
  return result.rows.map(mapSubmission);
}

export function isValidWallBypassSuffix(value: string) {
  const suffix = value.trim();
  return (
    suffix.length > 0 &&
    suffix.length <= WALL_BYPASS_SUFFIX_MAX_LENGTH &&
    !suffix.includes("\n") &&
    !suffix.includes("\r")
  );
}

export async function getWallBypassSettings(): Promise<WallBypassSettings> {
  const db = await database();
  const result = await db.query<{ suffix: string; enabled: boolean }>(
    "SELECT suffix, enabled FROM wall_bypass_settings WHERE id = TRUE",
  );
  const settings = result.rows[0];
  return settings ?? DEFAULT_WALL_BYPASS_SETTINGS;
}

export async function saveWallBypassSettings(settings: WallBypassSettings) {
  const suffix = settings.suffix.trim();
  if (!isValidWallBypassSuffix(suffix)) throw new Error("Invalid bypass suffix.");

  const db = await database();
  await db.query(
    `
      INSERT INTO wall_bypass_settings (id, suffix, enabled)
      VALUES (TRUE, $1, $2)
      ON CONFLICT (id) DO UPDATE
      SET suffix = EXCLUDED.suffix, enabled = EXCLUDED.enabled, updated_at = NOW()
    `,
    [suffix, settings.enabled],
  );
  return { suffix, enabled: settings.enabled };
}

export async function prepareSubmission(body: string) {
  const settings = await getWallBypassSettings();
  if (!settings.enabled || !body.toLowerCase().endsWith(settings.suffix.toLowerCase())) {
    return { body, publishImmediately: false };
  }

  const message = body.slice(0, -settings.suffix.length).trimEnd();
  return { body: message, publishImmediately: Boolean(message) };
}

export async function createSubmission(body: string, publishImmediately = false) {
  const db = await database();
  const status: WallStatus = publishImmediately ? "approved" : "pending";
  const result = await db.query<SubmissionRow>(
    `
    INSERT INTO wall_submissions (body, status, reviewed_at, published_at)
    VALUES (
      $1,
      $2,
      CASE WHEN $2 = 'approved' THEN NOW() ELSE NULL END,
      CASE WHEN $2 = 'approved' THEN NOW() ELSE NULL END
    )
    RETURNING id, body, admin_note, status, pinned, created_at, reviewed_at, published_at
  `,
    [body, status],
  );
  return mapSubmission(result.rows[0]);
}

export async function toggleWallReaction(submissionId: number, visitorId: string) {
  const db = await database();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const submission = await client.query(
      "SELECT 1 FROM wall_submissions WHERE id = $1 AND status = 'approved' FOR UPDATE",
      [submissionId],
    );
    if (!submission.rowCount) {
      await client.query("COMMIT");
      return null;
    }

    const existingReaction = await client.query(
      "SELECT 1 FROM wall_reactions WHERE submission_id = $1 AND visitor_id = $2",
      [submissionId, visitorId],
    );
    const reacted = !existingReaction.rowCount;

    if (reacted) {
      await client.query("INSERT INTO wall_reactions (submission_id, visitor_id) VALUES ($1, $2)", [
        submissionId,
        visitorId,
      ]);
    } else {
      await client.query(
        "DELETE FROM wall_reactions WHERE submission_id = $1 AND visitor_id = $2",
        [submissionId, visitorId],
      );
    }

    const count = await client.query<{ reaction_count: string }>(
      "SELECT COUNT(*) AS reaction_count FROM wall_reactions WHERE submission_id = $1",
      [submissionId],
    );
    await client.query("COMMIT");
    return { count: Number(count.rows[0]?.reaction_count ?? 0), reacted };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getModerationSubmissions(status?: WallStatus) {
  const db = await database();
  const result = status
    ? await db.query<SubmissionRow>(
        `
        SELECT
          submissions.id,
          submissions.body,
          submissions.admin_note,
          submissions.status,
          submissions.pinned,
          submissions.created_at,
          submissions.reviewed_at,
          submissions.published_at,
          COUNT(reactions.submission_id) AS reaction_count
        FROM wall_submissions AS submissions
        LEFT JOIN wall_reactions AS reactions ON reactions.submission_id = submissions.id
        WHERE submissions.status = $1
        GROUP BY
          submissions.id,
          submissions.body,
          submissions.admin_note,
          submissions.status,
          submissions.pinned,
          submissions.created_at,
          submissions.reviewed_at,
          submissions.published_at
        ORDER BY submissions.created_at DESC
        LIMIT 200
      `,
        [status],
      )
    : await db.query<SubmissionRow>(`
        SELECT
          submissions.id,
          submissions.body,
          submissions.admin_note,
          submissions.status,
          submissions.pinned,
          submissions.created_at,
          submissions.reviewed_at,
          submissions.published_at,
          COUNT(reactions.submission_id) AS reaction_count
        FROM wall_submissions AS submissions
        LEFT JOIN wall_reactions AS reactions ON reactions.submission_id = submissions.id
        GROUP BY
          submissions.id,
          submissions.body,
          submissions.admin_note,
          submissions.status,
          submissions.pinned,
          submissions.created_at,
          submissions.reviewed_at,
          submissions.published_at
        ORDER BY submissions.created_at DESC
        LIMIT 200
      `);
  return result.rows.map(mapSubmission);
}

export async function clearWallReactions(submissionId: number) {
  const db = await database();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const submission = await client.query(
      "SELECT 1 FROM wall_submissions WHERE id = $1 AND status = 'approved' FOR UPDATE",
      [submissionId],
    );
    if (!submission.rowCount) {
      await client.query("COMMIT");
      return null;
    }

    const result = await client.query("DELETE FROM wall_reactions WHERE submission_id = $1", [
      submissionId,
    ]);
    await client.query("COMMIT");
    return result.rowCount ?? 0;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateSubmission(
  id: number,
  status: WallStatus,
  pinned: boolean,
  comment?: string | null,
) {
  const db = await database();
  const result = await db.query<SubmissionRow>(
    `
    UPDATE wall_submissions
    SET
      status = $2,
      pinned = CASE WHEN $2 = 'approved' THEN $3 ELSE FALSE END,
      admin_note = CASE
        WHEN $2 <> 'approved' THEN NULL
        WHEN $5 THEN $4
        ELSE admin_note
      END,
      reviewed_at = NOW(),
      published_at = CASE
        WHEN $2 = 'approved' THEN COALESCE(published_at, NOW())
        ELSE NULL
      END
    WHERE id = $1
    RETURNING id, body, admin_note, status, pinned, created_at, reviewed_at, published_at
  `,
    [id, status, pinned, comment ?? null, comment !== undefined],
  );
  return result.rows[0] ? mapSubmission(result.rows[0]) : null;
}

export async function deleteSubmission(id: number) {
  const db = await database();
  const result = await db.query("DELETE FROM wall_submissions WHERE id = $1", [id]);
  return result.rowCount === 1;
}
