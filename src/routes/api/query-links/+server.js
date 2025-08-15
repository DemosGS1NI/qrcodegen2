// SvelteKit server endpoint to query links for a GTIN using GS1 checkLinks API
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
    // Debug: log API key and request URL
    console.log('GS1 API Key:', API_KEY ? '[present]' : '[missing]');
    console.log('GS1 Query URL:', url);
    console.log(API_KEY);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-control': 'no-cache',
        'APIkey': API_KEY
      }
    });
    const data = await res.json().catch(() => ({}));
    console.log('GS1 Response status:', res.status);
    console.log('GS1 API raw response:', JSON.stringify(data, null, 2));
    if (res.ok) {
      // Flatten all responses arrays from the data array
      let allLinks = [];
      if (Array.isArray(data.data)) {
        for (const item of data.data) {
          if (item.responses && Array.isArray(item.responses)) {
            allLinks = allLinks.concat(item.responses);
          }
        }
      }
      const found = allLinks.length > 0;
      return new Response(JSON.stringify({ success: true, links: allLinks, found }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ error: data.message || 'API error.', debug: { apiKey: API_KEY ? '[present]' : '[missing]', status: res.status } }), { status: res.status });
    }
  } catch (e) {
    console.error('GS1 Query Server Error:', e);
    return new Response(JSON.stringify({ error: 'Server error.', debug: { stack: e?.stack, message: e?.message } }), { status: 500 });
  }
}
