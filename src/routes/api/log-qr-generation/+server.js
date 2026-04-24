import { env } from '$env/dynamic/private';
import { ensureMigrations, sql } from '$lib/server/db';

const LICENCE_LOOKUP_URL = 'https://grp.gs1.org/grp/v3.2/licences/GTIN';
const GS1_API_KEY = env.QRCODEGEN_API_KEY || env.API_KEY;

function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, 300);
}

async function fetchLicenceByGtin(gtin) {
  const res = await fetch(LICENCE_LOOKUP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-control': 'no-cache',
      'APIKey': GS1_API_KEY
    },
    body: JSON.stringify([String(gtin)])
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      record: null
    };
  }

  const record = Array.isArray(data) && data.length > 0 ? data[0] : null;
  return {
    ok: true,
    status: res.status,
    record
  };
}

export async function POST({ request }) {
  try {
    if (!GS1_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured on server. Set QRCODEGEN_API_KEY.' }), { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? body.items : [];
    const config = body?.config || {};
    const generatedAt = new Date().toISOString();

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: 'items is required.' }), { status: 400 });
    }

    await ensureMigrations();

    let insertedCount = 0;
    let skippedCount = 0;
    for (const item of items) {
      const gtin = sanitizeText(item?.gtin);
      if (!gtin) continue;

      let licence = null;

      try {
        const licenceLookup = await fetchLicenceByGtin(gtin);
        if (licenceLookup.ok && licenceLookup.record) {
          licence = licenceLookup.record;
        }
      } catch (_) {
        // Keep logging even if enrichment fails for a GTIN.
      }

      const rawSource = sanitizeText(item?.source).toLowerCase();
      const normalizedSource = rawSource === 'manual' ? 'Manual' : 'File';
      const rawQrContent = typeof item?.qrContent === 'string' ? item.qrContent : '';
      const exactQrContent = rawQrContent || `${sanitizeText(config?.selectedDomain).replace(/\/+$/, '')}/01/${gtin}`;

      const event = {
        LicenseeName: sanitizeText(licence?.licenseeName),
        LicenceKey: sanitizeText(licence?.licenceKey),
        gtin,
        productDescription: sanitizeText(item?.description),
        source: normalizedSource,
        qrDomain: sanitizeText(config?.selectedDomain),
        qrContent: exactQrContent,
        generatedAt
      };

      const inserted = await sql`
        INSERT INTO qr_generation_logs (
          licensee_name,
          licence_key,
          gtin,
          product_description,
          source,
          qr_domain,
          qr_content,
          generated_at
        )
        VALUES (
          ${event.LicenseeName},
          ${event.LicenceKey},
          ${event.gtin},
          ${event.productDescription},
          ${event.source},
          ${event.qrDomain},
          ${event.qrContent},
          ${event.generatedAt}
        )
        ON CONFLICT (licence_key, gtin, qr_domain) DO NOTHING
        RETURNING id
      `;

      if (inserted.length > 0) insertedCount += 1;
      else skippedCount += 1;
    }

    return new Response(
      JSON.stringify({
        success: true,
        loggedCount: insertedCount,
        skippedDuplicates: skippedCount
      }),
      { status: 200 }
    );
  } catch (_) {
    return new Response(JSON.stringify({ error: 'Server error.' }), { status: 500 });
  }
}
