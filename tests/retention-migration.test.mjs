import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {artworkEnv} from './helpers/artwork.mjs';

test('fourteen-day migration extends active owner records without reviving expired data or changing order history',()=>{
 const {sql}=artworkEnv(),now=Math.floor(Date.now()/1000),created=now-86400;
 for(const [id,expires] of [['active',created+604800],['expired',now-1]]){
  sql.prepare('INSERT INTO artwork_requests(id,owner,manifest,bytes,created,expires,reservation) VALUES (?,?,?,?,?,?,?)').run(id,'owner','[]',0,created,expires,id);
  sql.prepare('INSERT INTO orders(id,fingerprint,snapshot,created,expires,status,version) VALUES (?,?,?,?,?,?,?)').run(id,'hash','{}',created,expires,'ready_to_ship',4);
  sql.prepare('INSERT INTO order_history(order_id,version,status,created) VALUES (?,?,?,?)').run(id,4,'ready_to_ship',created);
 }
 const path='migrations/security/0006_fourteen_day_retention.sql';
 sql.exec(existsSync(path)?readFileSync(path,'utf8'):'SELECT 1');
 for(const table of ['artwork_requests','orders']){
  assert.equal(sql.prepare(`SELECT expires FROM ${table} WHERE id='active'`).get().expires,created+1209600);
  assert.equal(sql.prepare(`SELECT expires FROM ${table} WHERE id='expired'`).get().expires,now-1);
 }
 assert.deepEqual({...sql.prepare("SELECT status,version FROM orders WHERE id='active'").get()},{status:'ready_to_ship',version:4});
 assert.equal(sql.prepare('SELECT count(*) AS n FROM order_history').get().n,2);
 sql.exec(readFileSync(path,'utf8'));
 assert.equal(sql.prepare("SELECT expires FROM orders WHERE id='active'").get().expires,created+1209600);
});
