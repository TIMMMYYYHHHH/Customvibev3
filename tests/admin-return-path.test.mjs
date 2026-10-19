import test from 'node:test';
import assert from 'node:assert/strict';
import {gate,hashPassword,random} from '../server/auth.mjs';

const origin='https://admin.customvibe.co.za',password=random(),salt=random();
const config={ADMIN_PASSWORD_HASH:await hashPassword(password,salt),ADMIN_PASSWORD_SALT:salt,ADMIN_SESSION_SECRET:random()};
const hidden=(html,name)=>html.match(new RegExp(`name="${name}" value="([^"]*)"`))[1].replaceAll('&amp;','&');
function environment(){
 let attempts=0;
 return {...config,AUTH:{async fetch(url){
  assert.equal(new URL(url).pathname,'/reserve');
  return Response.json({allowed:++attempts<=5});
 }}};
}
async function challenge(env,path='/'){
 const response=(await gate(new Request(origin+path),env,'admin')).response;
 assert.equal(response.status,401);
 const html=await response.text();
 return {html,csrf:hidden(html,'csrf'),cookie:response.headers.get('set-cookie').split(';')[0]};
}
const submit=(env,form,next,pass=password)=>gate(new Request(origin+'/auth/login',{
 method:'POST',headers:{origin,cookie:form.cookie,'CF-Connecting-IP':'192.0.2.4'},
 body:new URLSearchParams({csrf:form.csrf,password:pass,next}),
}),env,'admin').then(result=>result.response);

const safeReturns=[
 ['/themes','/themes'],
 ['/themes?view=occasions','/themes?view=occasions'],
 ['/preview','/preview'],
 ['/preview?page=%2F','/preview?page=%2F'],
 ['/preview?page=/collections','/preview?page=%2Fcollections'],
 ['/preview?page=%2fcollections%2falphabet%23choose-style','/preview?page=%2Fcollections%2Falphabet%23choose-style'],
 ['/preview?at=2028-02-29T12:30','/preview?at=2028-02-29T12%3A30'],
 ['/preview?at=1900-12-25T00%3A00','/preview?at=1900-12-25T00%3A00'],
 ['/preview?at=9999-12-31T23%3A59','/preview?at=9999-12-31T23%3A59'],
 ['/preview?at=2026-12-25T12%3A00&page=%2F%23photo-pricing','/preview?page=%2F%23photo-pricing&at=2026-12-25T12%3A00'],
 ['/themes.html','/themes'],
 ['/themes.html?view=occasions','/themes?view=occasions'],
 ['/preview.html','/preview'],
 ['/preview.html?page=%2fcollections%2falphabet%23choose-style','/preview?page=%2Fcollections%2Falphabet%23choose-style'],
 ['/preview.html?at=2028-02-29T12:30','/preview?at=2028-02-29T12%3A30'],
 ['/preview.html?at=2026-12-25T12%3A00&page=%2F%23photo-pricing','/preview?page=%2F%23photo-pricing&at=2026-12-25T12%3A00'],
 ['/orders','/orders'],['/artwork','/artwork'],['/content','/content'],
];
for(const [requested,expected] of safeReturns){
 test(`admin sign-in keeps ${requested} after an incorrect password and successful retry`,async()=>{
  const env=environment(),form=await challenge(env,requested);
  assert.equal(hidden(form.html,'next'),expected);
  const failed=await submit(env,form,hidden(form.html,'next'),'incorrect');
  assert.equal(failed.status,401);
  const retryHTML=await failed.text();
  assert.equal(hidden(retryHTML,'next'),expected);
  const success=await submit(env,form,hidden(retryHTML,'next'));
  assert.equal(success.status,303);
  assert.equal(success.headers.get('location'),expected);
  assert.match(success.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
 });
}

const unsafeAliases=[
 '/themes.html?view=calendar','/themes.html?view=occasions&view=occasions',
 '/themes.html?view=occasions&year=2027','/themes.html/extra','/themes.html.html',
 '/themes.HTML','/%74hemes.html','/themes%2Ehtml',
 '/preview.html?next=https://evil.example','/preview.html?page=%2F&page=%2Fcollections',
 '/preview.html?page=%2F&unknown=1','/preview.html?%70age=%2F','/preview.html?page=%',
 '/preview.html?page=%2F%2Fevil.example','/preview.html?page=%252F%252Fevil.example',
 '/preview.html?page=%2F..%2Forders','/preview.html?at=2026-02-29T12:00',
 '/preview.html?at=2026-12-25T12:00Z','/preview.html?','/preview.html/extra',
 '/preview.html.html','/preview.html%3Fpage=%2F',
];
const unsafeReturns=[
 ...unsafeAliases,
 'https://evil.example/preview.html','//evil.example/preview.html',
 '/themes.html\n','/preview.html\n','/preview.html\u2028','/preview.html#outside',
 'https://evil.example/preview','//evil.example/preview','/\\evil.example',
 '/%2f/evil.example','/%70review?page=%2Fcollections',
 '/themes?view=calendar','/themes?view=occasions&view=occasions','/themes?view=occasions&year=2027',
 '/themes#occasions','/themes?view=occasions%22%20autofocus','/themes\n','/themes\u2028',
 '/preview?next=https://evil.example','/preview?page=%2F&page=%2Fcollections',
 '/preview?at=2026-12-25T12:00&at=2027-12-25T12:00','/preview?page=%2F&unknown=1',
 '/preview?%70age=%2F','/preview?page=','/preview?at=','/preview?',
 '/preview?page=%','/preview?page=%2','/preview?page=%GG','/preview?page=%C0%AF',
 '/preview?page=https%3A%2F%2Fevil.example','/preview?page=%2F%2Fevil.example',
 '/preview?page=%252F%252Fevil.example','/preview?page=%2F..%2Forders',
 '/preview?page=%2F%5Cevil','/preview?page=%2F%00orders','/preview?page=%2F%0D%0Aorders',
 '/preview?page=%2F%0A','/preview?page=%2F%E2%80%A8',
 '/preview?page=%2F%22%20autofocus%20onfocus%3Dalert(1)',
 '/preview?page=%2F%3Fnext%3Devil','/preview?page=%2F#outside','/preview#outside',
 '/preview?page=%2F%23bad_anchor','/preview?page=%2F%23','/preview?page=%2F+orders',
 '/preview?at=2026-02-29T12:00','/preview?at=2028-02-30T12:00',
 '/preview?at=2026-12-25T24:00','/preview?at=2026-12-25T12:60',
 '/preview?at=2026-12-25T12:00Z','/preview?at=2026-12-25T12:00%2B02:00',
 '/preview?at=2026-12-25','/preview?at=2026-12-25T12:00:00',
 '/preview?at=2026-12-25T12%3A00%00','/preview?at=2026-13-25T12:00',
];
test('invalid return destinations fall back on both incorrect-password and successful responses',async()=>{
 for(const next of unsafeReturns){
  const env=environment(),form=await challenge(env);
  const failed=await submit(env,form,next,'incorrect');
  assert.equal(failed.status,401,next);
  assert.equal(hidden(await failed.text(),'next'),'/',next);
  const success=await submit(env,form,next);
  assert.equal(success.status,303,next);
  assert.equal(success.headers.get('location'),'/',next);
 }
});

test('invalid preview query cannot be retained in the initial sign-in form',async()=>{
 // Request URLs omit an empty query and strip raw linefeeds; login POST cases above still test those literal values.
 for(const path of unsafeReturns.filter(path=>path.startsWith('/preview')&&!path.includes('#')&&!path.includes('\n')&&!['/preview?','/preview.html?'].includes(path))){
  const form=await challenge(environment(),path);
  assert.equal(hidden(form.html,'next'),'/',path);
 }
});

test('unsupported alias queries and lookalikes cannot be retained in the initial sign-in form',async()=>{
 for(const path of unsafeAliases.filter(path=>path!=='/preview.html?')){
  const form=await challenge(environment(),path);
  assert.equal(hidden(form.html,'next'),'/',path);
 }
});
