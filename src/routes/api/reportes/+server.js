import { json } from '@sveltejs/kit';
import { ensureMigrations, sql } from '$lib/server/db';

export async function GET() {
  try {
    await ensureMigrations();

    const [companiesResult, productsResult, domainBreakdown, logs] = await Promise.all([
      sql`SELECT COUNT(DISTINCT licence_key)::int AS total FROM qr_generation_logs`,
      sql`SELECT COUNT(DISTINCT gtin)::int AS total FROM qr_generation_logs`,
      sql`
        SELECT qr_domain, COUNT(*)::int AS total
        FROM qr_generation_logs
        GROUP BY qr_domain
        ORDER BY total DESC, qr_domain ASC
      `,
      sql`
        SELECT
          id,
          licensee_name,
          licence_key,
          gtin,
          product_description,
          source,
          qr_domain,
          qr_content,
          generated_at
        FROM qr_generation_logs
        ORDER BY generated_at DESC
        LIMIT 2000
      `
    ]);

    return json({
      success: true,
      summary: {
        totalEmpresas: companiesResult[0]?.total ?? 0,
        totalProducts: productsResult[0]?.total ?? 0,
        domainBreakdown
      },
      logs
    });
  } catch (_) {
    return json({ success: false, error: 'No se pudieron obtener los reportes.' }, { status: 500 });
  }
}
