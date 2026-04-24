import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const connectionString = env.DATABASE_URL || env.QRCODEGEN_DATABASE_URL;

if (!connectionString) {
  throw new Error('Database connection string is missing. Set DATABASE_URL or QRCODEGEN_DATABASE_URL.');
}

export const sql = neon(connectionString);

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'db/migrations');
let migrationsInFlight;

function toChecksum(content) {
  return createHash('sha256').update(content).digest('hex');
}

function splitSqlStatements(sqlContent) {
  const noLineComments = sqlContent
    .split('\n')
    .map((line) => (line.trimStart().startsWith('--') ? '' : line))
    .join('\n');

  return noLineComments
    .split(';')
    .map((stmt) => stmt.trim())
    .filter(Boolean);
}

async function runMigrations() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  for (const filename of files) {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    const content = await readFile(filePath, 'utf8');
    const checksum = toChecksum(content);

    const existing = await sql`
      SELECT checksum
      FROM schema_migrations
      WHERE filename = ${filename}
      LIMIT 1
    `;

    if (existing.length > 0) {
      if (existing[0].checksum !== checksum) {
        throw new Error(`Migration checksum mismatch for ${filename}. Create a new migration file instead of editing existing ones.`);
      }
      continue;
    }

    const statements = splitSqlStatements(content);
    for (const statement of statements) {
      await sql.query(statement);
    }

    await sql`
      INSERT INTO schema_migrations (filename, checksum)
      VALUES (${filename}, ${checksum})
    `;
  }
}

export async function ensureMigrations() {
  if (!migrationsInFlight) {
    migrationsInFlight = runMigrations().finally(() => {
      migrationsInFlight = null;
    });
  }
  return migrationsInFlight;
}
