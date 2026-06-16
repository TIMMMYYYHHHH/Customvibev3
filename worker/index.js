// Cloudflare Worker entry point. Static site is served entirely by Workers
// Assets (see wrangler.jsonc: html_handling/not_found_handling), so this
// worker only adds security headers to whatever ASSETS.fetch returns.

// A full Content-Security-Policy is deliberately left out: this app loads
// Google Fonts and inline JSON-LD <script> blocks, and getting a CSP
// allowlist wrong fails silently at runtime (not at build time) — that
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
    return withSecurityHeaders(assetResponse);
  },
};
