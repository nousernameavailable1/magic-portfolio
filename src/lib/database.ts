import type { PoolClient } from "pg";
import { Pool } from "pg";

const CURRENT_SCHEMA_VERSION = 5;

declare global {
  // eslint-disable-next-line no-var
  var portfolioDatabasePool: Pool | undefined;
  // eslint-disable-next-line no-var
  var portfolioSchemaPromise: Promise<void> | undefined;
  // eslint-disable-next-line no-var
  var portfolioSchemaVersion: number | undefined;
}

function getPool() {
  if (!global.portfolioDatabasePool) {
    const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

    if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
      throw new Error("The database is not configured.");
    }

    global.portfolioDatabasePool = new Pool({
      host: DB_HOST,
      port: Number(DB_PORT ?? 5432),
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  return global.portfolioDatabasePool;
}

async function applyMigration(client: PoolClient, name: string, tableName: string, sql: string) {
  const [existingMigration, table] = await Promise.all([
    client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [name]),
    client.query<{ table_name: string | null }>("SELECT to_regclass($1) AS table_name", [
      `public.${tableName}`,
    ]),
  ]);

  if (existingMigration.rowCount && table.rows[0]?.table_name === tableName) return;

  await client.query(sql);
  await client.query(
    "INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
    [name],
  );
}

async function applyMigrations(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await applyMigration(
      client,
      "001_create_wall_submissions",
      "wall_submissions",
      `
        CREATE TABLE IF NOT EXISTS wall_submissions (
          id BIGSERIAL PRIMARY KEY,
          body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          pinned BOOLEAN NOT NULL DEFAULT FALSE,
          admin_note TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          reviewed_at TIMESTAMPTZ,
          published_at TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS wall_submissions_public_feed_idx
          ON wall_submissions (status, pinned DESC, published_at DESC);
        CREATE INDEX IF NOT EXISTS wall_submissions_moderation_idx
          ON wall_submissions (status, created_at DESC);
      `,
    );

    await applyMigration(
      client,
      "002_create_wall_reactions",
      "wall_reactions",
      `
        CREATE TABLE IF NOT EXISTS wall_reactions (
          submission_id BIGINT NOT NULL REFERENCES wall_submissions (id) ON DELETE CASCADE,
          visitor_id UUID NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (submission_id, visitor_id)
        );

        CREATE INDEX IF NOT EXISTS wall_reactions_submission_idx
          ON wall_reactions (submission_id);
      `,
    );

    await applyMigration(
      client,
      "003_create_site_text",
      "site_text",
      `
        CREATE TABLE IF NOT EXISTS site_text (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `,
    );

    await applyMigration(
      client,
      "004_create_site_text_defaults",
      "site_text_defaults",
      `
        CREATE TABLE IF NOT EXISTS site_text_defaults (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `,
    );

    await applyMigration(
      client,
      "005_create_wall_bypass_settings",
      "wall_bypass_settings",
      `
        CREATE TABLE IF NOT EXISTS wall_bypass_settings (
          id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
          suffix TEXT NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `,
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function database() {
  const pool = getPool();

  if (!global.portfolioSchemaPromise || global.portfolioSchemaVersion !== CURRENT_SCHEMA_VERSION) {
    global.portfolioSchemaVersion = CURRENT_SCHEMA_VERSION;
    global.portfolioSchemaPromise = applyMigrations(pool).catch((error) => {
      global.portfolioSchemaPromise = undefined;
      global.portfolioSchemaVersion = undefined;
      throw error;
    });
  }

  await global.portfolioSchemaPromise;
  return pool;
}
