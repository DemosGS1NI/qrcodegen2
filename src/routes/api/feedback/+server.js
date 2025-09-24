// SvelteKit server endpoint to query GS1 batch feedback status
import { API_KEY } from '$env/static/private';

export async function POST({ request }) {
  try {
    const { batchId } = await request.json();
    if (!batchId) {
      return new Response(JSON.stringify({ error: 'batchId is required.' }), { status: 400 });
    }
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured on server.' }), { status: 500 });
    }
    const url = `https://grp.gs1.org/grp/v3.2/feedback/${encodeURIComponent(batchId)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-control': 'no-cache',
        'APIkey': API_KEY
      }
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ error: data?.message || 'API error.', status: res.status, data }), { status: res.status });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error.', debug: { message: e?.message } }), { status: 500 });
  }
}
