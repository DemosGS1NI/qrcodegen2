// SvelteKit server endpoint to delete links for a GTIN using GS1 deleteLinks API
import { API_KEY } from '$env/static/private';

export async function POST({ request }) {
  try {
    const body = await request.json();
    if (!body || !Array.isArray(body) || body.length === 0) {
      return new Response(JSON.stringify({ error: 'Payload must be a non-empty array.' }), { status: 400 });
    }
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured on server.' }), { status: 500 });
    }
    const url = 'https://grp.gs1.org/grp/v3.2/links';
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'APIkey': API_KEY,
        'Cache-control': 'no-cache',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const batchId = typeof data === 'string' ? data : (data && data.batchId ? data.batchId : undefined);
      return new Response(JSON.stringify({ success: true, batchId, data }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ error: data.message || 'API error.' }), { status: res.status });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error.' }), { status: 500 });
  }
}
