// HTTP Basic Auth for SvelteKit (Vercel compatible)
// Credentials: admin / password123

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const USERNAME = 'admin';
  const PASSWORD = 'password123';
  const auth = event.request.headers.get('authorization');
  if (!auth || !auth.startsWith('Basic ')) {
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Protected"'
      }
    });
  }
  // Decode base64 (Node.js Buffer for Vercel compatibility)
  const [, encoded] = auth.split(' ');
  const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  const [user, pass] = decoded.split(':');
  if (user !== USERNAME || pass !== PASSWORD) {
    return new Response('Invalid credentials', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Protected"'
      }
    });
  }
  return resolve(event);
}
