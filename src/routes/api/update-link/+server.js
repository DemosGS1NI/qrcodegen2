// SvelteKit server endpoint for updating links via GS1 API
// Reads API key from environment variable using SvelteKit $env/static/private
import { API_KEY } from '$env/static/private';

export async function POST({ request }) {
  try {
    const body = await request.json();
    console.log('GS1 UpdateLink: Request body:', JSON.stringify(body, null, 2));
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
