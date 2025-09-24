// SvelteKit server endpoint to fetch product description via GS1 Verified GTIN API
// POST body: { gtin: "07433200912010" }
// Upstream API: POST https://grp.gs1.org/grp/v3.2/gtins/verified with body ["<gtin>"]
import { API_KEY } from '$env/static/private';

export async function POST({ request }) {
  try {
    const { gtin } = await request.json().catch(() => ({}));
    if (!gtin) {
      return new Response(JSON.stringify({ error: 'gtin is required.' }), { status: 400 });
    }
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured on server.' }), { status: 500 });
    }
    const url = 'https://grp.gs1.org/grp/v3.2/gtins/verified';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-control': 'no-cache',
        'APIkey': API_KEY
      },
      body: JSON.stringify([String(gtin)])
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data?.message || 'API error.', status: res.status }), { status: res.status });
    }
    // Expecting an array with a single record
    let productDescription = '';
    if (Array.isArray(data) && data.length > 0) {
      const rec = data[0];
      const pd = Array.isArray(rec?.productDescription) ? rec.productDescription : [];
      // Prefer Spanish (es), else first available
      const es = pd.find(p => (p?.language || '').toLowerCase().startsWith('es'));
      productDescription = (es?.value) || (pd[0]?.value) || '';
    }
    return new Response(JSON.stringify({ success: true, productDescription }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error.', debug: { message: e?.message } }), { status: 500 });
  }
}
