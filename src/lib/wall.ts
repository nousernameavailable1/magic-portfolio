import { database } from "@/lib/database";

export const WALL_STATUSES = ["pending", "approved", "rejected"] as const;
export type WallStatus = (typeof WALL_STATUSES)[number];

export type WallSubmission = {
  id: number;
  body: string;
  comment: string | null;
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
};

function mapSubmission(row: SubmissionRow): WallSubmission {
  return {
    id: Number(row.id),
    body: row.body,
    comment: row.admin_note,
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

export async function getPublishedSubmissions() {
  const db = await database();
  const result = await db.query<SubmissionRow>(`
    SELECT id, body, admin_note, status, pinned, created_at, reviewed_at, published_at
    FROM wall_submissions
    WHERE status = 'approved'
    ORDER BY pinned DESC, published_at DESC
    LIMIT 100
  `);
  return result.rows.map(mapSubmission);
}

export async function createSubmission(body: string) {
  const db = await database();
  const result = await db.query<SubmissionRow>(
    `
    INSERT INTO wall_submissions (body)
    VALUES ($1)
    RETURNING id, body, admin_note, status, pinned, created_at, reviewed_at, published_at
  `,
    [body],
  );
  return mapSubmission(result.rows[0]);
}

export async function getModerationSubmissions(status?: WallStatus) {
  const db = await database();
  const result = status
    ? await db.query<SubmissionRow>(
        `
        SELECT id, body, admin_note, status, pinned, created_at, reviewed_at, published_at
        FROM wall_submissions
        WHERE status = $1
        ORDER BY created_at DESC
        LIMIT 200
      `,
        [status],
      )
    : await db.query<SubmissionRow>(`
        SELECT id, body, admin_note, status, pinned, created_at, reviewed_at, published_at
        FROM wall_submissions
        ORDER BY created_at DESC
        LIMIT 200
      `);
  return result.rows.map(mapSubmission);
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
