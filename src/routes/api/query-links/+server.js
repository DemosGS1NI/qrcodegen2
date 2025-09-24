// SvelteKit server endpoint to query links for a GTIN using GS1 checkLinks API
import { API_KEY } from '$env/static/private';

export async function POST({ request }) {
  try {
    const { gtin } = await request.json();
    const key = typeof gtin === 'string' ? gtin.trim() : gtin;
    if (!key) {
      return new Response(JSON.stringify({ error: 'GTIN is required.' }), { status: 400 });
    }
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured on server.' }), { status: 500 });
    }
  const url = `https://grp.gs1.org/grp/v3.2/links/01/${encodeURIComponent(key)}`;
    // Debug: log API key and request URL
    console.log('GS1 API Key:', API_KEY ? '[present]' : '[missing]');
    console.log('GS1 Query URL:', url);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-control': 'no-cache',
        'APIkey': API_KEY,
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
    console.log('GS1 Response status:', res.status);
    try { console.log('GS1 API raw response:', JSON.stringify(data, null, 2)); } catch (_) { console.log('GS1 API raw text:', rawText?.slice(0, 500)); }
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
  return new Response(JSON.stringify({ success: true, links: allLinks, found, raw: data }), { status: 200 });
    } else {
      let userMessage = 'API error.';
      if (res.status === 404) {
        userMessage = 'No se encontraron enlaces para este GTIN.';
      } else if (data && (data.message || data.error)) {
        userMessage = data.message || data.error;
      } else if (rawText) {
        userMessage = `API error (${res.status}). ${rawText.slice(0, 200)}`;
      }
      return new Response(JSON.stringify({ error: userMessage, debug: { status: res.status, body: rawText || data } }), { status: res.status });
    }
  } catch (e) {
    console.error('GS1 Query Server Error:', e);
    return new Response(JSON.stringify({ error: 'Server error.', debug: { stack: e?.stack, message: e?.message } }), { status: 500 });
  }
}
