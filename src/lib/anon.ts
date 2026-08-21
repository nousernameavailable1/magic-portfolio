import { database } from "@/lib/database";

export const ANON_STATUSES = ["pending", "approved", "rejected"] as const;
export type AnonStatus = (typeof ANON_STATUSES)[number];

export type AnonSubmission = {
  id: number;
  body: string;
  status: AnonStatus;
  pinned: boolean;
  createdAt: string;
  reviewedAt: string | null;
  publishedAt: string | null;
};

type SubmissionRow = {
  id: string;
  body: string;
  status: AnonStatus;
  pinned: boolean;
  created_at: Date;
  reviewed_at: Date | null;
  published_at: Date | null;
};

function mapSubmission(row: SubmissionRow): AnonSubmission {
  return {
    id: Number(row.id),
    body: row.body,
    status: row.status,
    pinned: row.pinned,
    createdAt: row.created_at.toISOString(),
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
    publishedAt: row.published_at?.toISOString() ?? null,
  };
}

export function isAnonStatus(value: unknown): value is AnonStatus {
  return typeof value === "string" && ANON_STATUSES.includes(value as AnonStatus);
}

export async function getPublishedSubmissions() {
  const db = await database();
  const result = await db.query<SubmissionRow>(`
    SELECT id, body, status, pinned, created_at, reviewed_at, published_at
    FROM anon_submissions
    WHERE status = 'approved'
    ORDER BY pinned DESC, published_at DESC
    LIMIT 100
  `);
  return result.rows.map(mapSubmission);
}

export async function createSubmission(body: string) {
  const db = await database();
  const result = await db.query<SubmissionRow>(`
    INSERT INTO anon_submissions (body)
    VALUES ($1)
    RETURNING id, body, status, pinned, created_at, reviewed_at, published_at
  `, [body]);
  return mapSubmission(result.rows[0]);
}

export async function getModerationSubmissions(status?: AnonStatus) {
  const db = await database();
  const result = status
    ? await db.query<SubmissionRow>(`
        SELECT id, body, status, pinned, created_at, reviewed_at, published_at
        FROM anon_submissions
        WHERE status = $1
        ORDER BY created_at DESC
        LIMIT 200
      `, [status])
    : await db.query<SubmissionRow>(`
        SELECT id, body, status, pinned, created_at, reviewed_at, published_at
        FROM anon_submissions
        ORDER BY created_at DESC
        LIMIT 200
      `);
  return result.rows.map(mapSubmission);
}

export async function updateSubmission(
  id: number,
  status: AnonStatus,
  pinned: boolean,
) {
  const db = await database();
  const result = await db.query<SubmissionRow>(`
    UPDATE anon_submissions
    SET
      status = $2,
      pinned = CASE WHEN $2 = 'approved' THEN $3 ELSE FALSE END,
      reviewed_at = NOW(),
      published_at = CASE
        WHEN $2 = 'approved' THEN COALESCE(published_at, NOW())
        ELSE NULL
      END
    WHERE id = $1
    RETURNING id, body, status, pinned, created_at, reviewed_at, published_at
  `, [id, status, pinned]);
  return result.rows[0] ? mapSubmission(result.rows[0]) : null;
}

export async function deleteSubmission(id: number) {
  const db = await database();
  const result = await db.query("DELETE FROM anon_submissions WHERE id = $1", [id]);
  return result.rowCount === 1;
}
