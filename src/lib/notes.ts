import "server-only";

import { database } from "@/lib/database";
import { slugify } from "transliteration";

export const NOTE_LIMITS = {
  title: 160,
  slug: 180,
  summary: 400,
  body: 50_000,
} as const;

export type Note = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  public: boolean;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type NoteInput = Pick<Note, "title" | "slug" | "summary" | "body" | "public">;

type NoteRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  public: boolean;
  private_password_hash: string | null;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
};

export class NoteSlugConflictError extends Error {}

function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    body: row.body,
    public: row.public,
    hasPassword: Boolean(row.private_password_hash),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    publishedAt: row.published_at?.toISOString() ?? null,
  };
}

function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

export function normalizeNoteSlug(value: string) {
  return slugify(value, {
    allowedChars: "a-z0-9-",
    lowercase: true,
    separator: "-",
  })
    .replace(/-+/g, "-")
    .slice(0, NOTE_LIMITS.slug)
    .replace(/-+$/g, "");
}

export function validateNoteInput(input: NoteInput) {
  if (!input.title || input.title.length > NOTE_LIMITS.title) {
    return `Title must be between 1 and ${NOTE_LIMITS.title} characters.`;
  }
  if (
    !input.slug ||
    input.slug.length > NOTE_LIMITS.slug ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)
  ) {
    return "Slug can only contain lowercase letters, numbers, and single hyphens.";
  }
  if (input.summary && input.summary.length > NOTE_LIMITS.summary) {
    return `Summary is limited to ${NOTE_LIMITS.summary} characters.`;
  }
  if (!input.body || input.body.length > NOTE_LIMITS.body) {
    return `Note content must be between 1 and ${NOTE_LIMITS.body.toLocaleString()} characters.`;
  }
  return null;
}

export async function getAllNotes() {
  const db = await database();
  const result = await db.query<NoteRow>(`
    SELECT id, title, slug, summary, body, public, private_password_hash,
      created_at, updated_at, published_at
    FROM notes
    ORDER BY updated_at DESC, id DESC
  `);
  return result.rows.map(mapNote);
}

export async function getPublicNotes() {
  const db = await database();
  const result = await db.query<NoteRow>(`
    SELECT id, title, slug, summary, body, public, private_password_hash,
      created_at, updated_at, published_at
    FROM notes
    WHERE public = TRUE
    ORDER BY published_at DESC NULLS LAST, updated_at DESC, id DESC
  `);
  return result.rows.map(mapNote);
}

export type NoteAccessRecord = {
  id: string;
  slug: string;
  public: boolean;
  passwordHash: string | null;
};

export async function getNoteAccessRecordBySlug(slug: string): Promise<NoteAccessRecord | null> {
  const db = await database();
  const result = await db.query<{
    id: string;
    slug: string;
    public: boolean;
    private_password_hash: string | null;
  }>(
    `
      SELECT id, slug, public, private_password_hash
      FROM notes
      WHERE slug = $1
    `,
    [slug],
  );
  const row = result.rows[0];
  return row
    ? {
        id: row.id,
        slug: row.slug,
        public: row.public,
        passwordHash: row.private_password_hash,
      }
    : null;
}

export async function getNoteBySlug(slug: string) {
  const db = await database();
  const result = await db.query<NoteRow>(
    `
      SELECT id, title, slug, summary, body, public, private_password_hash,
        created_at, updated_at, published_at
      FROM notes
      WHERE slug = $1
    `,
    [slug],
  );
  return result.rows[0] ? mapNote(result.rows[0]) : null;
}

export async function createNote(input: NoteInput, passwordHash: string | null) {
  const db = await database();
  try {
    const result = await db.query<NoteRow>(
      `
        INSERT INTO notes (
          title, slug, summary, body, public, private_password_hash, published_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $5 THEN NOW() ELSE NULL END)
        RETURNING id, title, slug, summary, body, public, private_password_hash,
          created_at, updated_at, published_at
      `,
      [input.title, input.slug, input.summary, input.body, input.public, passwordHash],
    );
    return mapNote(result.rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) throw new NoteSlugConflictError("That slug is already in use.");
    throw error;
  }
}

export async function updateNote(id: string, input: NoteInput, passwordHash?: string) {
  const db = await database();
  try {
    const result = await db.query<NoteRow>(
      `
        UPDATE notes
        SET
          title = $2,
          slug = $3,
          summary = $4,
          body = $5,
          public = $6,
          private_password_hash = COALESCE($7, private_password_hash),
          updated_at = NOW(),
          published_at = CASE
            WHEN $6 AND NOT public THEN NOW()
            WHEN NOT $6 THEN NULL
            ELSE published_at
          END
        WHERE id = $1
        RETURNING id, title, slug, summary, body, public, private_password_hash,
          created_at, updated_at, published_at
      `,
      [id, input.title, input.slug, input.summary, input.body, input.public, passwordHash ?? null],
    );
    return result.rows[0] ? mapNote(result.rows[0]) : null;
  } catch (error) {
    if (isUniqueViolation(error)) throw new NoteSlugConflictError("That slug is already in use.");
    throw error;
  }
}

export async function deleteNote(id: string) {
  const db = await database();
  const result = await db.query("DELETE FROM notes WHERE id = $1", [id]);
  return Boolean(result.rowCount);
}
