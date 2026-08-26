import type { PoolClient } from "pg";
import { Pool } from "pg";

const CURRENT_SCHEMA_VERSION = 11;

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

    await applyMigration(
      client,
      "006_create_visitor_analytics",
      "site_visitors",
      `
        CREATE TABLE IF NOT EXISTS site_visitors (
          id UUID PRIMARY KEY,
          first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS site_visits (
          id BIGSERIAL PRIMARY KEY,
          visitor_id UUID NOT NULL REFERENCES site_visitors (id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS site_visits_created_at_idx
          ON site_visits (created_at DESC);
      `,
    );

    await applyMigration(
      client,
      "007_create_public_route_locks",
      "public_route_locks",
      `
        CREATE TABLE IF NOT EXISTS public_route_locks (
          path TEXT PRIMARY KEY,
          locked BOOLEAN NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `,
    );

    await applyMigration(
      client,
      "008_add_public_route_listing",
      "public_route_locks",
      `
        ALTER TABLE public_route_locks
        ADD COLUMN IF NOT EXISTS listed BOOLEAN NOT NULL DEFAULT TRUE;
      `,
    );

    await applyMigration(
      client,
      "009_create_fakemail_aliases",
      "fakemail_aliases",
      `
        CREATE TABLE IF NOT EXISTS fakemail_aliases (
          id BIGSERIAL PRIMARY KEY,
          local_part TEXT NOT NULL CHECK (char_length(local_part) BETWEEN 1 AND 64),
          email TEXT NOT NULL,
          cloudflare_rule_id TEXT NOT NULL,
          expires_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          deleted_at TIMESTAMPTZ,
          CHECK (expires_at IS NULL OR expires_at > created_at)
        );

        CREATE UNIQUE INDEX IF NOT EXISTS fakemail_aliases_active_email_idx
          ON fakemail_aliases (email)
          WHERE deleted_at IS NULL;

        CREATE INDEX IF NOT EXISTS fakemail_aliases_active_expiry_idx
          ON fakemail_aliases (expires_at)
          WHERE deleted_at IS NULL AND expires_at IS NOT NULL;
      `,
    );

    await applyMigration(
      client,
      "010_create_notes",
      "notes",
      `
        CREATE TABLE IF NOT EXISTS notes (
          id BIGSERIAL PRIMARY KEY,
          title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
          slug TEXT NOT NULL UNIQUE CHECK (char_length(slug) BETWEEN 1 AND 180),
          summary TEXT CHECK (summary IS NULL OR char_length(summary) <= 400),
          body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 50000),
          public BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          published_at TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS notes_public_feed_idx
          ON notes (public, published_at DESC, updated_at DESC);
      `,
    );

    await applyMigration(
      client,
      "011_add_note_passwords",
      "notes",
      `
        ALTER TABLE notes
        ADD COLUMN IF NOT EXISTS private_password_hash TEXT;
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
