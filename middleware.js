// middleware.js
// Vercel Edge Middleware for HTTP Basic Auth
// Place this file at the root of your project

import { NextResponse } from 'next/server';

const USER = 'admin'; // Change this to your desired username
const PASS = 'password123'; // Change this to your desired password

export function middleware(request) {
  const auth = request.headers.get('authorization');
  if (auth) {
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic') {
      const decoded = Buffer.from(encoded, 'base64').toString();
      const [user, pass] = decoded.split(':');
      if (user === USER && pass === PASS) {
        return NextResponse.next();
      }
    }
  }
  return new Response('Auth required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

export const config = {
  matcher: '/((?!_next|favicon.ico|assets|static).*)',
};
