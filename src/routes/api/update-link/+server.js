// SvelteKit server endpoint for updating links via GS1 API
// Reads API key from environment variable using SvelteKit $env/static/private
import { API_KEY } from '$env/static/private';

export async function POST({ request }) {
  try {
    const body = await request.json();
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured on server.' }), { status: 500 });
    }
    const res = await fetch('https://grp.gs1.org/grp/v3.1/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'APIkey': API_KEY,
        'Cache-control': 'no-cache'
      },
      body: JSON.stringify(body)
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
