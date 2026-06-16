// Cloudflare Pages Function: serves the SPA shell for unmatched routes, but
// returns a real 404 status (instead of the SPA's default 200) when the path
// isn't one of the app's known client-side routes, so search engines and
// monitoring tools see an accurate status code.

const KNOWN_ROUTES = new Set(['/', '/design', '/quote', '/privacy', '/terms', '/contact']);

export async function onRequest(context) {
  const assetResponse = await context.env.ASSETS.fetch(context.request);
  if (assetResponse.status !== 404) {
    return assetResponse;
  }

  const url = new URL(context.request.url);
  const indexResponse = await context.env.ASSETS.fetch(new Request(new URL('/index.html', url.origin), context.request));
  const status = KNOWN_ROUTES.has(url.pathname) ? 200 : 404;

  return new Response(indexResponse.body, {
    status,
    headers: indexResponse.headers,
  });
}
