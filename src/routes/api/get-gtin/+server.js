// SvelteKit server endpoint to fetch product description via GS1 Verified GTIN API
// POST body: { gtin: "07433200912010" }
// Upstream API: POST https://grp.gs1.org/grp/v3.2/gtins/verified with body ["<gtin>"]
import { env } from '$env/dynamic/private';

const GS1_API_KEY = env.QRCODEGEN_API_KEY || env.API_KEY;
const LICENCE_LOOKUP_URL = 'https://grp.gs1.org/grp/v3.2/licences/GTIN';

async function fetchLicenseeNameByGtin(gtin) {
  try {
    const res = await fetch(LICENCE_LOOKUP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-control': 'no-cache',
        'APIKey': GS1_API_KEY
      },
      body: JSON.stringify([String(gtin)])
    });
    if (!res.ok) return '';
    const data = await res.json().catch(() => ({}));
    const rec = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return typeof rec?.licenseeName === 'string' ? rec.licenseeName : '';
  } catch (_) {
    return '';
  }
}

export async function POST({ request }) {
  try {
    const { gtin } = await request.json().catch(() => ({}));
    if (!gtin) {
      return new Response(JSON.stringify({ error: 'gtin is required.' }), { status: 400 });
    }
    if (!GS1_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured on server. Set QRCODEGEN_API_KEY.' }), { status: 500 });
    }
    const url = 'https://grp.gs1.org/grp/v3.2/gtins/verified';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-control': 'no-cache',
        'APIkey': GS1_API_KEY
      },
      body: JSON.stringify([String(gtin)])
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data?.message || 'API error.', status: res.status }), { status: res.status });
    }
    // Expecting an array with a single record
  let productDescription = '';
  let errorCode = '';
  let errorMessage = '';
  let success = true;
    if (Array.isArray(data) && data.length > 0) {
      const rec = data[0];
      // Check for validationErrors
      if (Array.isArray(rec?.validationErrors) && rec.validationErrors.length > 0) {
        const gtinErrors = rec.validationErrors.find(v => v.property === 'gtin');
        if (gtinErrors && Array.isArray(gtinErrors.errors) && gtinErrors.errors.length > 0) {
          errorCode = gtinErrors.errors[0].errorCode || '';
          errorMessage = gtinErrors.errors[0].message || '';
          success = false;
        }
      }
      const pd = Array.isArray(rec?.productDescription) ? rec.productDescription : [];
      // Prefer Spanish (es), else first available
      const es = pd.find(p => (p?.language || '').toLowerCase().startsWith('es'));
      productDescription = (es?.value) || (pd[0]?.value) || '';
    }
    const licenseeName = success ? await fetchLicenseeNameByGtin(gtin) : '';
    return new Response(JSON.stringify({ success, productDescription, licenseeName, errorCode, errorMessage }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error.' }), { status: 500 });
  }
}
