import { json } from '@sveltejs/kit';
import { ensureMigrations, sql } from '$lib/server/db';

export async function GET() {
  try {
    await ensureMigrations();
    const response = await sql`SELECT version()`;
    const { version } = response[0] || {};

    return json({
      success: true,
      version: version || 'unknown'
    });
  } catch (_) {
    return json(
      {
        success: false,
        error: 'Database connection failed.'
      },
      { status: 500 }
    );
  }
}
