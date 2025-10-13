// SvelteKit server endpoint for updating links via GS1 API
// Reads API key from environment variable using SvelteKit $env/static/private
import { API_KEY } from '$env/static/private';

export async function POST({ request }) {
  try {
    const body = await request.json();
    console.log('GS1 UpdateLink: Request body:', JSON.stringify(body, null, 2));
    // Basic sanitization: strip control characters from string fields and validate link hrefs.
    const sanitizeString = (s) => {
      if (typeof s !== 'string') return s;
      // Remove control chars (including tabs/newlines) and backslashes, then collapse spaces and trim
      return s.replace(/[\x00-\x1F\x7F\\]/g, ' ').replace(/\s+/g, ' ').trim();
    };
    const invalidHrefs = [];
    if (Array.isArray(body)) {
      for (const item of body) {
        if (!item || !Array.isArray(item.links)) continue;
        for (const l of item.links) {
          if (!l) continue;
          if (l.href) {
            const cleaned = sanitizeString(l.href);
            // try to validate as URL; if it lacks a scheme, trying to construct URL will throw
            try {
              // If scheme missing, URL constructor will throw — consider it's invalid
              // new URL will accept valid absolute URLs; leave relative URLs as invalid for GS1
              new URL(cleaned);
            } catch (e) {
              invalidHrefs.push({ original: l.href, cleaned });
            }
            l.href = cleaned;
          }
          if (l.title) l.title = sanitizeString(l.title);
          // sanitize hreflang/context if provided as strings
          if (l.hreflang && typeof l.hreflang === 'string') l.hreflang = sanitizeString(l.hreflang);
          if (l.context && typeof l.context === 'string') l.context = sanitizeString(l.context);
        }
      }
    }
    if (invalidHrefs.length > 0) {
      console.error('GS1 UpdateLink: Invalid hrefs detected:', JSON.stringify(invalidHrefs, null, 2));
      return new Response(JSON.stringify({ error: 'Invalid link hrefs detected', invalidHrefs }), { status: 400 });
    }
    if (!API_KEY) {
      console.error('GS1 UpdateLink: API key not configured on server.');
      return new Response(JSON.stringify({ error: 'API key not configured on server.' }), { status: 500 });
    }
    console.log('GS1 UpdateLink: API key present:', !!API_KEY);
    const res = await fetch('https://grp.gs1.org/grp/v3.2/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'APIkey': API_KEY,
        'Cache-control': 'no-cache'
      },
      body: JSON.stringify(body)
    });
    console.log('GS1 UpdateLink: Response status:', res.status);
    const data = await res.json().catch(() => ({}));
    console.log('GS1 UpdateLink: Response data:', JSON.stringify(data, null, 2));
    if (res.ok) {
      const batchId = typeof data === 'string' ? data : (data && data.batchId ? data.batchId : undefined);
      return new Response(JSON.stringify({ success: true, batchId, data }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ error: data.message || 'API error.', debug: { status: res.status, data } }), { status: res.status });
    }
  } catch (e) {
    console.error('GS1 UpdateLink: Server error:', e);
    return new Response(JSON.stringify({ error: 'Server error.', debug: { stack: e?.stack, message: e?.message } }), { status: 500 });
  }
}
