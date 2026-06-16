// Cloudflare Worker entry point. Serves the built SPA assets and returns a
// real 404 status for unmatched routes (instead of always 200), since the
// SPA shell only understands the routes baked into the React Router config.

const KNOWN_ROUTES = new Set(['/', '/design', '/quote', '/privacy', '/terms', '/contact']);

// Headers with well-understood, low-risk behavior across browsers. A full
// Content-Security-Policy is deliberately left out: this app loads Google
// Fonts, Unsplash images, and inline JSON-LD <script> blocks, and getting a
// CSP allowlist wrong fails silently at runtime (not at build time) — that
// needs verifying in a real browser before shipping, which isn't available
// in this environment.
function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request, env) {
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return withSecurityHeaders(assetResponse);
    }

    const url = new URL(request.url);
    const indexResponse = await env.ASSETS.fetch(new Request(new URL('/index.html', url.origin), request));
    const status = KNOWN_ROUTES.has(url.pathname) ? 200 : 404;

    return withSecurityHeaders(new Response(indexResponse.body, {
      status,
      headers: indexResponse.headers,
    }));
  },
};
