// Cloudflare Worker entry point. Serves the built SPA assets and returns a
// real 404 status for unmatched routes (instead of always 200), since the
// SPA shell only understands the routes baked into the React Router config.

const KNOWN_ROUTES = new Set(['/', '/design', '/quote', '/privacy', '/terms', '/contact']);

export default {
  async fetch(request, env) {
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    const url = new URL(request.url);
    const indexResponse = await env.ASSETS.fetch(new Request(new URL('/index.html', url.origin), request));
    const status = KNOWN_ROUTES.has(url.pathname) ? 200 : 404;

    return new Response(indexResponse.body, {
      status,
      headers: indexResponse.headers,
    });
  },
};
