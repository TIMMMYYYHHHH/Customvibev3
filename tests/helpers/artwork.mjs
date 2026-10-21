import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
export function artworkEnv(){
 const db=new DatabaseSync(':memory:');for(const file of readdirSync('migrations/security').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('migrations/security/'+file,'utf8'));
 const prepare=(sql,args=[])=>({bind(...v){return prepare(sql,v)},run:async()=>({meta:db.prepare(sql).run(...args)}),first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)})});let queue=Promise.resolve();
 const DB={prepare,batch(statements){const result=queue.then(async()=>{db.exec('BEGIN');try{const rows=[];for(const s of statements)rows.push(await s.all());db.exec('COMMIT');return rows}catch(e){db.exec('ROLLBACK');throw e}});queue=result.catch(()=>{});return result}};
 const objects=new Map(),checksums=new Map();const ARTWORK={async put(key,bytes,options={}){const checksum=options.sha256===undefined?undefined:await crypto.subtle.digest('SHA-256',bytes);if(checksum&&Buffer.from(checksum).toString('hex')!==options.sha256)throw Error('Checksum mismatch');objects.set(key,new Uint8Array(bytes));if(checksum)checksums.set(key,checksum);else checksums.delete(key);return {key}},async head(key){const bytes=objects.get(key);return bytes?{size:bytes.length,checksums:{sha256:checksums.get(key)}}:null},async get(key){const bytes=objects.get(key);return bytes?{body:new Blob([bytes]).stream(),size:bytes.length}:null},async delete(keys){for(const key of Array.isArray(keys)?keys:[keys]){objects.delete(key);checksums.delete(key)}}};
 return {DB,ARTWORK,objects,sql:db};
}
export const tile=readFileSync('tests/fixtures/print-tile.jpg');
export async function sha(bytes){return Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex')}
export async function manifest(id=crypto.randomUUID()) {return {id,owner:'a'.repeat(64),key:'b'.repeat(64),files:[{size:tile.length,sha256:await sha(tile),proof:false,name:'design-01-photo.jpg'}]};}
