import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var portfolioDatabasePool: Pool | undefined;
  // eslint-disable-next-line no-var
  var portfolioSchemaPromise: Promise<void> | undefined;
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

    const migrationName = "001_create_wall_submissions";
    const [existingMigration, table] = await Promise.all([
      client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [migrationName]),
      client.query<{ table_name: string | null }>(
        "SELECT to_regclass('public.wall_submissions') AS table_name",
      ),
    ]);

    if (!existingMigration.rowCount || table.rows[0]?.table_name !== "wall_submissions") {
      await client.query(`
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
      `);
      await client.query(
        "INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
        [migrationName],
      );
    }

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
  global.portfolioSchemaPromise ??= applyMigrations(pool).catch((error) => {
    global.portfolioSchemaPromise = undefined;
    throw error;
  });
  await global.portfolioSchemaPromise;
  return pool;
}
