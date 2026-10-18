import test from 'node:test';import assert from 'node:assert/strict';
import {createSessionRecovery} from '../admin/session-recovery.mjs';
import {proofConfirmation} from '../admin/proof-confirmation.mjs';
import {adminDate,adminDay} from '../admin/time.mjs';
test('expiry stops protected requests without replay, recovery checks only sign-in',async()=>{
 let active=false,calls=[];const s=createSessionRecovery({fetcher:async(path,opts)=>{calls.push([path,opts?.method||'GET']);return active?Response.json({csrf:'fresh',expiresAt:2000}):Response.json({error:'Unauthorized'},{status:401})},now:()=>1000000});
 await assert.rejects(s.fetch('/api/orders/x/proof/publish',{method:'POST'}),e=>e.status===401);
 assert.equal(s.getSnapshot().status,'expired');active=true;await s.check();assert.equal(s.getSnapshot().status,'restored');
 assert.deepEqual(calls,[['/api/orders/x/proof/publish','POST'],['/api/session','GET']]);
});
test('temporary network failure is not reported as an expired session',async()=>{
 const s=createSessionRecovery({fetcher:async()=>{throw new TypeError('offline')},now:()=>0});await s.check();assert.equal(s.getSnapshot().status,'unavailable');
});
test('session timer warns before expiry and expires without a network request',async()=>{
 let now=0;const s=createSessionRecovery({fetcher:async()=>Response.json({csrf:'secret',expiresAt:100}),now:()=>now});await s.check();assert.equal(s.getSnapshot().status,'active');now=45000;s.tick();assert.equal(s.getSnapshot().status,'expiring');now=100000;s.tick();assert.equal(s.getSnapshot().status,'expired');assert.ok(!JSON.stringify(s.getSnapshot()).includes('secret'));
});
test('confirmation distinguishes replacing approval, first proof and revoking links',()=>{
 const order={reference:'CV-1',proof:{revision:2,status:'approved'}};
 assert.match(proofConfirmation('publish',order).body,/approval.*cleared/i);assert.match(proofConfirmation('publish',order).body,/revision 3/i);assert.match(proofConfirmation('publish',order).body,/No email/i);
 assert.match(proofConfirmation('revoke',order).body,/links/i);assert.match(proofConfirmation('seed',{reference:'CV-1'}).body,/approval/i);
});
test('admin dates stay on South African time across browser timezones and date boundaries',()=>{
 const stamp=Date.parse('2026-12-31T23:30:00Z')/1000;
 for(const tz of ['UTC','America/Los_Angeles','Pacific/Auckland']){process.env.TZ=tz;assert.match(adminDate(stamp),/01:30/);assert.match(adminDate(stamp),/2027/);assert.match(adminDay(stamp),/Jan/);}
});

test('revoking an approved proof does not claim to clear recorded approval',()=>{
 const c=proofConfirmation('revoke',{reference:'CV-1',proof:{revision:3,status:'approved'}});assert.match(c.body,/approval remain unchanged/);assert.doesNotMatch(c.body,/approval is cleared/);
});
test('expiry on a write preflight prevents the protected write entirely',async()=>{
 const {api}=await import('../admin/api.mjs');const previous=globalThis.fetch;const calls=[];
 globalThis.fetch=async path=>{calls.push(path);return Response.json({error:'Unauthorized'},{status:401})};
 try{await assert.rejects(api('/api/orders/x/proof/revoke',{version:1}),e=>e.status===401);assert.deepEqual(calls,['/api/session']);}finally{globalThis.fetch=previous}
});
