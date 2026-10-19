import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import admin from '../admin/worker.mjs';
import {random,signToken,gate,secure} from '../server/auth.mjs';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const noticePath='public/third-party-notices.txt';
const sourceFiles=['react/LICENSE','react-dom/LICENSE','scheduler/LICENSE','@phosphor-icons/react/LICENSE','leaflet/LICENSE','qrcode/license','dijkstrajs/LICENSE.md','@fontsource-variable/fredoka/LICENSE','@fontsource-variable/dm-sans/LICENSE'];

test('distributed notices preserve complete pinned code and font notices verbatim',async()=>{
 const notices=await read(noticePath);
 for(const source of sourceFiles)assert.ok(notices.includes((await read('node_modules/'+source)).trim()),source);
 assert.ok(notices.includes((await read('public/assets/fonts/PatrickHand-OFL.txt')).trim()));
 const qrCore=await read('node_modules/qrcode/lib/core/qrcode.js');
 assert.ok(notices.includes(qrCore.slice(qrCore.indexOf('/**'),qrCore.indexOf('*/')+2)), 'qrcode embedded upstream copyright and trademark notice');
 const vite=await read('node_modules/vite/LICENSE.md');
 assert.ok(notices.includes(vite.split('# Licenses of bundled dependencies')[0].trim()),'Vite-generated preload helpers');
 const commonjs=vite.slice(vite.indexOf('## @rollup/plugin-alias,'),vite.indexOf('\n---------------------------------------',vite.indexOf('## @rollup/plugin-alias,'))).trim();
 assert.ok(notices.includes(commonjs),'Vite-vendored CommonJS helper notice');
});

test('notice provenance agrees with the lockfile and shipped font bytes',async()=>{
 const inventory=JSON.parse(await read('docs/third-party-notices.json'));
 const lock=JSON.parse(await read('package-lock.json'));
 for(const entry of inventory.notices){
  if(entry.distribution){const pinned=lock.packages['node_modules/'+entry.distribution];assert.equal(entry.version,pinned.version,entry.id);assert.equal(entry.version,JSON.parse(await read('node_modules/'+entry.distribution+'/package.json')).version,entry.id);}
  const original=await read(entry.source);assert.equal(createHash('sha256').update(original).digest('hex'),entry.sourceSha256,entry.id+' licence source changed');
 }
 for(const font of inventory.fonts){
  const bytes=await readFile(new URL('../'+font.path,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),font.sha256,font.path);
  if(font.matches)assert.deepEqual(bytes,await readFile(new URL('../'+font.matches,import.meta.url)),font.path+' differs from its documented distribution');
 }
});

test('notices retain the ordinary public and admin authentication boundaries',async()=>{
 const notices=await read(noticePath),secret=random();let publicReads=0,adminReads=0;
 const env={SITE_GATE_ENABLED:'true',SITE_PASSWORD_HASH:random(),SITE_PASSWORD_SALT:random(),SESSION_SECRET:secret,ADMIN_PASSWORD_HASH:random(),ADMIN_PASSWORD_SALT:random(),ADMIN_SESSION_SECRET:secret,AUTH:{fetch:async()=>Response.json({revoked:false})},ASSETS:{fetch:async()=>{adminReads++;return new Response(notices,{headers:{'Content-Type':'text/plain; charset=utf-8'}})}}};
 const next=async()=>{publicReads++;return new Response(notices,{headers:{'Content-Type':'text/plain; charset=utf-8'}})};
 const publicResponse=async request=>{const auth=await gate(request,env,'site');return secure(auth.response||await next())};
 const publicURL='https://customvibe.co.za/third-party-notices.txt',adminURL='https://admin.customvibe.co.za/third-party-notices.txt';
 assert.equal((await publicResponse(new Request(publicURL))).status,401);
 assert.equal((await admin.fetch(new Request(adminURL),env)).status,401);
 assert.equal(publicReads,0);assert.equal(adminReads,0);
 for(const [scope,url,run] of [['site',publicURL,publicResponse],['admin',adminURL,request=>admin.fetch(request,env)]]){
  const token=await signToken({scope,jti:random(),csrf:random(),exp:Math.floor(Date.now()/1000)+60},secret);
  const response=await run(new Request(url,{headers:{cookie:`__Host-cv-${scope}=${token}`}}));
  assert.equal(response.status,200);assert.match(response.headers.get('Content-Type'),/^text\/plain/);assert.match(response.headers.get('Cache-Control'),/no-store/);assert.equal(await response.text(),notices);
 }
 assert.equal(publicReads,1);assert.equal(adminReads,1);
});

test('both prepared application outputs contain the exact notice artifact',{skip:process.env.CV_CHECK_BUILT_NOTICES!=='1'?'Run with CV_CHECK_BUILT_NOTICES=1 after public and admin builds.':false},async()=>{
 const source=await readFile(new URL('../'+noticePath,import.meta.url));
 for(const app of ['client','admin']){
  assert.deepEqual(await readFile(new URL('../dist/'+app+'/third-party-notices.txt',import.meta.url)),source,app);
  for(const family of ['fredoka','dm-sans'])assert.deepEqual(await readFile(new URL(`../dist/${app}/coming-soon/${family}.woff2`,import.meta.url)),await readFile(new URL(`../src/assets/fonts/${family}-latin-wght-normal.woff2`,import.meta.url)),app+' gated font copy');
  assert.deepEqual(await readFile(new URL(`../dist/${app}/assets/fonts/PatrickHand-Regular.ttf`,import.meta.url)),await readFile(new URL('../public/assets/fonts/PatrickHand-Regular.ttf',import.meta.url)),app+' Patrick Hand copy');
 }
 for(const family of ['fredoka','dm-sans'])assert.deepEqual(await readFile(new URL(`../dist/admin/admin-brand/${family}.woff2`,import.meta.url)),await readFile(new URL(`../src/assets/fonts/${family}-latin-wght-normal.woff2`,import.meta.url)),'admin sign-in font copy');
});
