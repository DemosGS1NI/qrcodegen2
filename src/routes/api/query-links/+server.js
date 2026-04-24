// SvelteKit server endpoint to query links for a GTIN using GS1 checkLinks API
import { env } from '$env/dynamic/private';

const GS1_API_KEY = env.QRCODEGEN_API_KEY || env.API_KEY;

export async function POST({ request }) {
  try {
    const { gtin } = await request.json();
    const key = typeof gtin === 'string' ? gtin.trim() : gtin;
    if (!key) {
      return new Response(JSON.stringify({ error: 'GTIN is required.' }), { status: 400 });
    }
    if (!GS1_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured on server. Set QRCODEGEN_API_KEY.' }), { status: 500 });
    }
  const url = `https://grp.gs1.org/grp/v3.2/links/01/${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-control': 'no-cache',
        'APIkey': GS1_API_KEY,
        'Accept': 'application/json'
      }
    });
    // Try to parse JSON first, else capture raw text for better error reporting
    let data;
    let rawText = '';
    try {
      data = await res.json();
    } catch (_) {
      try {
        rawText = await res.text();
      } catch (_) {
        rawText = '';
      }
      data = {};
    }
    if (res.ok) {
      // New GS1 v3.2: response is an array, each with a 'links' array
      let allLinks = [];
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.links && Array.isArray(item.links)) {
            // Attach anchorRelative to each link item for downstream actions like delete
            const enriched = item.links.map((lnk) => ({ ...lnk, anchorRelative: item.anchorRelative }));
            allLinks = allLinks.concat(enriched);
          }
        }
      }
      const found = allLinks.length > 0;
      return new Response(JSON.stringify({ success: true, links: allLinks, found }), { status: 200 });
    } else {
      let userMessage = 'API error.';
      if (res.status === 404) {
        userMessage = 'No se encontraron enlaces para este GTIN.';
      } else if (data && (data.message || data.error)) {
        userMessage = data.message || data.error;
      } else if (rawText) {
        userMessage = `API error (${res.status}). ${rawText.slice(0, 200)}`;
      }
      return new Response(JSON.stringify({ error: userMessage }), { status: res.status });
    }
  } catch (e) {
    console.error('GS1 Query Server Error');
    return new Response(JSON.stringify({ error: 'Server error.' }), { status: 500 });
  }
}
