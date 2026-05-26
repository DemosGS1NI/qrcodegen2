import { env } from '$env/dynamic/private';

const GS1_API_KEY = env.QRCODEGEN_API_KEY || env.API_KEY;
const GS1_LINKS_URL = 'https://grp.gs1.org/grp/v3.2/links';

function jsonResponse(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'content-type': 'application/json'
		}
	});
}

function buildDeleteLink(link) {
	const deleteLink = { ...link };
	delete deleteLink.anchorRelative;
	return deleteLink;
}

export async function POST({ request }) {
	try {
		const { link } = await request.json();

		if (!link?.anchorRelative) {
			return jsonResponse({ error: 'anchorRelative is required.' }, 400);
		}

		if (!link?.['@linkType'] || !link?.href) {
			return jsonResponse({ error: 'Link type and href are required.' }, 400);
		}

		if (!GS1_API_KEY) {
			return jsonResponse(
				{ error: 'API key not configured on server. Set QRCODEGEN_API_KEY.' },
				500
			);
		}

		const deletePayload = [
			{
				anchorRelative: link.anchorRelative,
				links: [buildDeleteLink(link)]
			}
		];

		const res = await fetch(GS1_LINKS_URL, {
			method: 'DELETE',
			headers: {
				'content-type': 'application/json',
				'cache-control': 'no-cache',
				APIKey: GS1_API_KEY
			},
			body: JSON.stringify(deletePayload)
		});

		let data = {};
		let rawText = '';

		try {
			data = await res.json();
		} catch {
			try {
				rawText = await res.text();
			} catch {
				rawText = '';
			}
		}

		if (res.ok) {
			return jsonResponse({ success: true, data });
		}

		const message =
			data?.message ||
			data?.error ||
			(rawText
				? `API error (${res.status}). ${rawText.slice(0, 200)}`
				: `API error (${res.status}).`);

		return jsonResponse({ error: message }, res.status);
	} catch {
		console.error('GS1 Delete Server Error');
		return jsonResponse({ error: 'Server error.' }, 500);
	}
}
