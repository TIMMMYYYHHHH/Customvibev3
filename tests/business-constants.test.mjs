import test from 'node:test';
import assert from 'node:assert/strict';
import security from '../security/index.mjs';
import {artworkEnv} from './helpers/artwork.mjs';
import {renderComingSoon} from '../server/coming-soon.mjs';
import {metadata,site} from '../src/seo.mjs';
import {defaultContent} from '../src/content/model.mjs';
const constants=await import('../shared/business-constants.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e});
const time=Date.UTC(2026,9,19,12)/1000,day=Math.floor(time/86400),month='2026-10',monthEnd=Date.UTC(2026,10,1)/1000;
const hex=n=>n.toString(16).padStart(64,'0');
async function setup(t){
 t.mock.method(Date,'now',()=>time*1000);const env=artworkEnv();t.after(()=>env.sql.close());let n=0;
 const call=(path,body)=>security.fetch(new Request('https://internal'+path,{method:'POST',body:JSON.stringify(body)}),env);
 const body=(kind='contact',key)=>({id:hex(++n),key:key||hex(n),fingerprint:hex(999),kind,createdAt:time});
 const id=crypto.randomUUID();assert.equal((await call('/orders/create',{id,fingerprint:hex(999),snapshot:{contact:{name:'Synthetic',email:'fixture@example.invalid',phone:'1234567'},locker:{name:'Synthetic',area:'Synthetic'},items:[{kind:'photo',name:'Synthetic',qty:1,files:[]}],magnetQty:1,subtotalCents:4000,paymentStatus:'unpaid'}})).status,200);
 const seed=(daily,monthly,expired=false)=>{for(const [key,count,until]of [['forms:day:'+day,daily,(day+1)*86400],['forms:month:'+month,monthly,monthEnd]])env.sql.prepare('INSERT INTO attempts VALUES(?,?,?)').run(key,count,expired?time-1:until)};
 const counts=()=>['forms:day:'+day,'forms:month:'+month].map(key=>env.sql.prepare('SELECT count FROM attempts WHERE id=?').get(key)?.count||0);
 return {env,call,body,seed,counts,manual:()=>call('/orders/claim-update',{id,version:0})};
}
test('shared constants pin existing quota values and only public display values',()=>{
 assert.equal(constants.DAILY_SEND_LIMIT,80);assert.equal(constants.MONTHLY_SEND_LIMIT,2400);
 assert.equal(constants.PUBLIC_CONTACT_EMAIL,'hello@customvibe.co.za');assert.equal(constants.PUBLIC_SITE_ORIGIN,'https://customvibe.co.za');
});
test('initial order weight two reaches80/2400 once; duplicate and capped manual claims add no charge',async t=>{
 const h=await setup(t);h.seed(78,2398);const body=h.body('order');
 assert.equal((await(await h.call('/submissions/reserve',body)).json()).allowed,true);assert.deepEqual(h.counts(),[80,2400]);
 assert.equal((await(await h.call('/submissions/reserve',body)).json()).allowed,true);assert.deepEqual(h.counts(),[80,2400]);
 assert.equal((await h.manual()).status,429);assert.deepEqual(h.counts(),[80,2400]);assert.equal(h.env.sql.prepare('SELECT count(*) n FROM order_updates').get().n,0);
});
for(const [label,daily,monthly]of [['both',79,2399],['month only',0,2399]])test(`${label}: order weight two is refused while contact weight one can take the remaining unit`,async t=>{
 const h=await setup(t);h.seed(daily,monthly);
 assert.equal((await(await h.call('/submissions/reserve',h.body('order'))).json()).allowed,false);assert.deepEqual(h.counts(),[daily,monthly]);
 assert.equal((await(await h.call('/submissions/reserve',h.body())).json()).allowed,true);assert.deepEqual(h.counts(),[daily+1,monthly+1]);
 assert.equal((await h.manual()).status,429);assert.deepEqual(h.counts(),[daily+1,monthly+1]);assert.equal(h.env.sql.prepare('SELECT count(*) n FROM submissions').get().n,1);
});
for(const window of ['day','month'])for(const order of [['contact','manual'],['manual','contact']])test(`${window} shared final unit has one real winner for ${order.join('/')}`,async t=>{
 const h=await setup(t);h.seed(window==='day'?79:0,window==='month'?2399:0);const before=h.counts();
 const results=await Promise.all(order.map(kind=>kind==='manual'?h.manual():h.call('/submissions/reserve',h.body()))),bodies=await Promise.all(results.map(r=>r.json()));
 const won=bodies.map((b,i)=>order[i]==='manual'?b.claimed===true:b.allowed===true);assert.equal(won.filter(Boolean).length,1);
 assert.deepEqual(h.counts(),before.map(n=>n+1));
 for(const [i,kind]of order.entries())assert.equal(h.env.sql.prepare('SELECT count(*) n FROM '+(kind==='manual'?'order_updates':'submissions')).get().n,won[i]?1:0);
 t.diagnostic(JSON.stringify({window,order,winner:order[won.indexOf(true)],counts:h.counts()}));
});
test('IP refusals reserve no global units; expired UTC counters reset without touching login limits',async t=>{
 const h=await setup(t);h.seed(80,2400,true);h.env.sql.prepare('INSERT INTO attempts VALUES(?,?,?)').run('site:'+hex(1),5,time+900);
 const blockedKey=hex(500);h.env.sql.prepare('INSERT INTO attempts VALUES(?,?,?)').run('forms:ip:'+blockedKey,5,time+900);
 assert.equal((await(await h.call('/submissions/reserve',h.body('contact',blockedKey))).json()).allowed,false);assert.deepEqual(h.counts(),[80,2400]);
 assert.equal((await(await h.call('/submissions/reserve',h.body())).json()).allowed,true);assert.deepEqual(h.counts(),[1,1]);
 assert.equal(h.env.sql.prepare('SELECT until FROM attempts WHERE id=?').get('forms:day:'+day).until,(day+1)*86400);
 assert.equal(h.env.sql.prepare('SELECT until FROM attempts WHERE id=?').get('forms:month:'+month).until,monthEnd);
 assert.deepEqual({...h.env.sql.prepare('SELECT count,until FROM attempts WHERE id=?').get('site:'+hex(1))},{count:5,until:time+900});
});
test('coming-soon contact and canonical metadata keep their exact public display values',()=>{
 assert.match(renderComingSoon('synthetic-csrf'),/<a href="mailto:hello@customvibe\.co\.za">hello@customvibe\.co\.za<\/a>/);
 assert.equal(site,'https://customvibe.co.za');const m=metadata('products/alphabet',defaultContent);
 assert.equal(m.canonical,'https://customvibe.co.za/products/alphabet');assert.equal(m.jsonld['@graph'][0].url,'https://customvibe.co.za/');
});
