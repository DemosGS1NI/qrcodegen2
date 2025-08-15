// SvelteKit server endpoint to delete links for a GTIN using GS1 deleteLinks API
import { API_KEY } from '$env/static/private';

export async function POST({ request }) {
  try {
    const { gtin } = await request.json();
    if (!gtin) {
      return new Response(JSON.stringify({ error: 'GTIN is required.' }), { status: 400 });
    }
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured on server.' }), { status: 500 });
    }
    const url = `https://grp.gs1.org/grp/v3.1/links/gtin/${encodeURIComponent(gtin)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'APIkey': API_KEY,
        'Cache-control': 'no-cache'
      }
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ error: data.message || 'API error.' }), { status: res.status });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error.' }), { status: 500 });
  }
}
