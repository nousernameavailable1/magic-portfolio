import "server-only";

import { database } from "@/lib/database";
import {
  RANDOM_MESSAGE_LIMITS,
  type RandomMessage,
  type RandomMessageCategory,
  type RandomMessageInput,
  isRandomMessageCategory,
} from "@/lib/random-message-data";

export { isRandomMessageCategory } from "@/lib/random-message-data";

type RandomMessageRow = {
  id: string;
  body: string;
  category: RandomMessageCategory;
  source: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
};

function mapRandomMessage(row: RandomMessageRow): RandomMessage {
  return {
    id: row.id,
    body: row.body,
    category: row.category,
    source: row.source,
    active: row.active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function validateRandomMessageInput(input: RandomMessageInput) {
  if (!input.body || input.body.length > RANDOM_MESSAGE_LIMITS.body) {
    return `Message must be between 1 and ${RANDOM_MESSAGE_LIMITS.body.toLocaleString()} characters.`;
  }
  if (!isRandomMessageCategory(input.category)) return "Choose a valid category.";
  if (input.source && input.source.length > RANDOM_MESSAGE_LIMITS.source) {
    return `Source is limited to ${RANDOM_MESSAGE_LIMITS.source} characters.`;
  }
  return null;
}

export async function getAllRandomMessages() {
  const db = await database();
  const result = await db.query<RandomMessageRow>(`
    SELECT id, body, category, source, active, created_at, updated_at
    FROM random_messages
    ORDER BY updated_at DESC, id DESC
  `);
  return result.rows.map(mapRandomMessage);
}

export async function getRandomMessage(category?: RandomMessageCategory) {
  const db = await database();
  const result = await db.query<RandomMessageRow>(
    `
      SELECT id, body, category, source, active, created_at, updated_at
      FROM random_messages
      WHERE active = TRUE AND ($1::text IS NULL OR category = $1)
      ORDER BY RANDOM()
      LIMIT 1
    `,
    [category ?? null],
  );
  return result.rows[0] ? mapRandomMessage(result.rows[0]) : null;
}

export async function createRandomMessage(input: RandomMessageInput) {
  const db = await database();
  const result = await db.query<RandomMessageRow>(
    `
      INSERT INTO random_messages (body, category, source, active)
      VALUES ($1, $2, $3, $4)
      RETURNING id, body, category, source, active, created_at, updated_at
    `,
    [input.body, input.category, input.source, input.active],
  );
  return mapRandomMessage(result.rows[0]);
}

export async function updateRandomMessage(id: string, input: RandomMessageInput) {
  const db = await database();
  const result = await db.query<RandomMessageRow>(
    `
      UPDATE random_messages
      SET body = $2, category = $3, source = $4, active = $5, updated_at = NOW()
      WHERE id = $1
      RETURNING id, body, category, source, active, created_at, updated_at
    `,
    [id, input.body, input.category, input.source, input.active],
  );
  return result.rows[0] ? mapRandomMessage(result.rows[0]) : null;
}

export async function deleteRandomMessage(id: string) {
  const db = await database();
  const result = await db.query("DELETE FROM random_messages WHERE id = $1", [id]);
  return Boolean(result.rowCount);
}
