// Cloudflare Worker entry point. Static site is served entirely by Workers
// Assets (see wrangler.jsonc: html_handling/not_found_handling), so this
// worker adds security headers and proxies the contact form to Web3Forms.

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  return new Response(response.body, { status: response.status, headers });
}

async function handleContactForm(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const contentType = request.headers.get('Content-Type') || '';
  let body;

  if (contentType.includes('application/json')) {
    body = await request.json();
  } else {
    const formData = await request.formData();
    body = Object.fromEntries(formData);
  }

  delete body.botcheck;
  body.access_key = env.WEB3FORMS_KEY;

  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await res.text();
  return new Response(result, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Normalizes a South African phone number to E.164 digits (27XXXXXXXXX) for
// the WhatsApp Cloud API. Returns null when the input can't be a valid number.
function normalizeZaPhone(raw) {
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '27' + digits.slice(1);
  if (digits.startsWith('270') && digits.length === 12) digits = '27' + digits.slice(3);
  return /^27[1-9]\d{8}$/.test(digits) ? digits : null;
}

async function handleOrder(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!env.N8N_ORDER_WEBHOOK) {
    console.error('N8N_ORDER_WEBHOOK secret is not configured');
    return Response.json({ success: false, error: 'Order notifications not configured' }, { status: 503 });
  }

  let order;
  try {
    order = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const missing = ['orderRef', 'customerName', 'customerPhone', 'totalQty', 'total']
    .filter((k) => order[k] === undefined || order[k] === null || order[k] === '');
  if (missing.length > 0) {
    return Response.json({ success: false, error: `Missing fields: ${missing.join(', ')}` }, { status: 400 });
  }

  const phone = normalizeZaPhone(order.customerPhone);
  if (!phone) {
    return Response.json({ success: false, error: 'Invalid South African phone number' }, { status: 400 });
  }

  // Base64 images are huge and belong to the (future) image pipeline; n8n only
  // needs names and quantities to build the WhatsApp messages.
  const designs = Array.isArray(order.designs)
    ? order.designs.map(({ imageUrl, ...rest }) => rest)
    : [];

  const payload = { ...order, customerPhone: phone, designs };

  try {
    const res = await fetch(env.N8N_ORDER_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Order-Secret': env.N8N_ORDER_SECRET || '',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error('n8n webhook returned', res.status);
      return Response.json({ success: false, error: 'Notification service error' }, { status: 502 });
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error('n8n webhook unreachable', error);
    return Response.json({ success: false, error: 'Notification service unreachable' }, { status: 502 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact') {
      return handleContactForm(request, env);
    }
    if (url.pathname === '/api/order') {
      return handleOrder(request, env);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    return withSecurityHeaders(assetResponse);
  },
};
