import test from 'node:test';
import assert from 'node:assert/strict';
import {proofAPI} from '../server/proof-api.mjs';
import {random, signToken} from '../server/auth.mjs';
import {onRequest} from '../functions/_middleware.js';

// Disconnected fixtures only: signed test credentials and an in-memory service boundary.
const operations = [
  {path:'/api/proof/session', method:'POST', action:'exchange'},
  {path:'/api/proof', method:'GET', action:'read'},
  {path:'/api/proof/files/0', method:'GET', action:'download'},
  {path:'/api/proof/approve', method:'POST', action:'approve'},
  {path:'/api/proof/changes', method:'POST', action:'changes'},
];
const previewOrigins = [
  'https://preview.customvibe-business.pages.dev',
  'https://customvibe-business.pages.dev',
  'https://customvibe.workers.dev',
  'https://preview.customvibe.co.za',
  'https://customvibe.co.za.example.com',
  'https://customvibe.co.za.',
  'https://unrelated.example',
  'https://localhost:8788',
  'https://127.0.0.1:8788',
];

async function fixture() {
  const secret = random(), csrf = random(), exp = Math.floor(Date.now()/1000)+600;
  const proof = await signToken({scope:'proof', jti:random(), csrf, exp}, secret);
  const site = await signToken({scope:'site', jti:random(), csrf:random(), exp}, secret);
  const calls = [];
  const env = {
    SESSION_SECRET:secret, SITE_PASSWORD_HASH:random(), SITE_PASSWORD_SALT:random(),
    SITE_GATE_ENABLED:'true',
    AUTH:{async fetch(url, options) {
      const path = new URL(url).pathname;
      calls.push({path, body:JSON.parse(options.body)});
      if (path === '/status') return Response.json({revoked:false});
      return Response.json({expires:exp, fixture:true});
    }},
  };
  const request = (origin, operation) => new Request(origin+operation.path, {
    method:operation.method,
    headers:{origin, cookie:`__Host-cv-site=${site}; __Host-cv-proof=${proof}`,
      'X-CSRF-Token':csrf, 'Content-Type':'application/json',
      // Forwarded or caller-supplied host claims must not override the actual URL.
      'X-Forwarded-Host':'customvibe.co.za'},
    ...(operation.method === 'POST' ? {body:JSON.stringify({token:random(), confirmed:true,
      revision:1, digest:'a'.repeat(64), message:'Synthetic fixture change request.'})} : {}),
  });
  return {env, calls, request};
}

for (const origin of previewOrigins) {
  test(`public proof operations reject ${origin} before any service call`, async () => {
    const {env, calls, request} = await fixture();
    for (const operation of operations) {
      const response = await proofAPI(request(origin, operation), env);
      assert.equal(response.status, 403, operation.action);
      assert.equal(response.headers.has('set-cookie'), false);
      assert.deepEqual(calls, [], operation.action+' must not reach AUTH');
    }
  });
}

test('gated preview middleware can verify site access but never forwards proof operations', async () => {
  const {env, calls, request} = await fixture();
  for (const operation of operations) {
    calls.length = 0;
    const response = await onRequest({request:request(previewOrigins[0], operation), env,
      next:() => {throw new Error('Proof API must not reach static assets');}});
    assert.equal(response.status, 403, operation.action);
    assert.deepEqual(calls.map(call => call.path), ['/status']);
    assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
    assert.match(response.headers.get('Cache-Control'), /no-store/);
  }
});

test('production proof operations continue to their scoped private service endpoints', async () => {
  const {env, calls, request} = await fixture();
  for (const operation of operations) {
    calls.length = 0;
    const response = await proofAPI(request('https://customvibe.co.za', operation), env);
    assert.equal(response.status, 200, operation.action);
    assert.deepEqual(calls.map(call => call.path), ['/proofs/'+operation.action]);
    if (operation.action === 'exchange') assert.match(calls[0].body.tokenHash, /^[a-f0-9]{64}$/);
    else assert.match(calls[0].body.sessionId, /^[a-f0-9]{64}$/);
  }
});
