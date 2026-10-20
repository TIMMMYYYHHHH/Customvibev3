import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
test('only the latest definitive non-Fulfilled rejection offers an explicit fresh-preview retry',async()=>{
 const built=await build({entryPoints:['admin/OrderDetail.jsx'],bundle:true,write:false,format:'cjs',platform:'node',external:['react'],logLevel:'silent'});const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
 const order={id:'11111111-1111-4111-8111-111111111111',reference:'CV-000001',version:0,status:'new',expires:Math.floor(Date.now()/1000)+300,history:[],updates:[],snapshot:{contact:{name:'Synthetic',email:'synthetic@example.com'},locker:{name:'Synthetic',area:'Test'},magnetQty:1,subtotalCents:100,items:[]}};
 for(const [state,retryable,status,enabled] of [['failed',1,'new',true],['failed',0,'new',false],['uncertain',0,'new',false],['pending',0,'new',false],['accepted',0,'new',false],['failed',1,'fulfilled',false]]){
  order.status=status;order.updates=[{attempt:'one',version:0,status,state,retryable,updated:1700000000}];const html=renderToStaticMarkup(React.createElement(module.exports.default,{order,onChange:()=>{}}));
  if(enabled){assert.match(html,/>Preview retry<\/button>/);assert.doesNotMatch(html,/<button[^>]*disabled=""[^>]*>Preview retry/);}else assert.match(html,/<button[^>]*disabled=""[^>]*>Preview update/);
 }
});
test('additive migration preserves historical attempts without silently enabling historical failures',()=>{
 const db=new DatabaseSync(':memory:');for(const f of readdirSync('migrations/security').filter(f=>f.endsWith('.sql')&&f<'0010').sort())db.exec(readFileSync('migrations/security/'+f,'utf8'));
 db.prepare('INSERT INTO order_updates(order_id,version,status,state,created,updated,reservation) VALUES(?,?,?,?,?,?,?)').run('legacy-order',2,'new','failed',10,11,'legacy-reservation');
 const before=db.prepare('SELECT * FROM order_updates').get();db.exec(readFileSync('migrations/security/0010_manual_update_attempts.sql','utf8'));assert.deepEqual(db.prepare('SELECT * FROM order_updates').get(),before);
 const old=db.prepare('SELECT * FROM order_update_attempts').get();assert.equal(old.attempt,'legacy-reservation');assert.equal(old.state,'failed');assert.equal(old.rejected,0);assert.equal(old.preview_hash,null);
 // During an ordered rollout, an older security worker still writes the summary.
 db.prepare('INSERT INTO order_updates(order_id,version,status,created,updated,reservation) VALUES(?,?,?,?,?,?)').run('legacy-order',3,'new',12,12,'older-worker');db.prepare("UPDATE order_updates SET state='accepted' WHERE reservation=?").run('older-worker');assert.equal(db.prepare('SELECT state FROM order_update_attempts WHERE attempt=?').get('older-worker').state,'accepted');db.prepare('DELETE FROM order_updates WHERE order_id=?').run('legacy-order');assert.equal(db.prepare('SELECT count(*) n FROM order_update_attempts').get().n,0);db.close();
});
