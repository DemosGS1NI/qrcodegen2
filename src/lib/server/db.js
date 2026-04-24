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

async function bootstrapSchemaFallback() {
  // Fallback for serverless runtimes where db/migrations files are not present.
  await sql`
    CREATE TABLE IF NOT EXISTS qr_generation_logs (
      id BIGSERIAL PRIMARY KEY,
      licensee_name TEXT NOT NULL,
      licence_key TEXT NOT NULL,
      gtin TEXT NOT NULL,
      product_description TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL CHECK (source IN ('Manual', 'File')),
      qr_domain TEXT NOT NULL,
      generated_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      qr_content TEXT NOT NULL
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_qr_logs_generated_at ON qr_generation_logs (generated_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_qr_logs_licence_key_generated_at ON qr_generation_logs (licence_key, generated_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_qr_logs_gtin_generated_at ON qr_generation_logs (gtin, generated_at DESC)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_qr_logs_product_qr ON qr_generation_logs (licence_key, gtin, qr_domain)`;
}

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

  let files = [];
  try {
    files = (await readdir(MIGRATIONS_DIR))
      .filter((name) => name.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
  }

  if (files.length === 0) {
    await bootstrapSchemaFallback();
    return;
  }

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
