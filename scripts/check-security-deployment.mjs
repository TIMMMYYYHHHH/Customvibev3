// Metadata-only private service guard. No customer rows or credential values are emitted.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequest,DESTINATION_ACCOUNT} from './cloudflare-target.mjs';
import {currentWorkerVersion} from './release-manifest.mjs';
export function validateSecurity(config,settings){
 if(config.account_id!==DESTINATION_ACCOUNT||config.name!=='customvibe-security'||config.workers_dev!==false||config.preview_urls!==false||config.routes?.length||config.limits?.cpu_ms!==1000)throw Error('Unexpected private security target, exposure or CPU limit.');
 const bindings=settings?.bindings||[];
 for(const db of config.d1_databases||[])if(!bindings.some(b=>b.name===db.binding&&b.type==='d1'&&b.id===db.database_id))throw Error('Security database destination mismatch.');
 for(const kv of config.kv_namespaces||[])if(!bindings.some(b=>b.name===kv.binding&&b.type==='kv_namespace'&&b.namespace_id===kv.id))throw Error('Security lockout store mismatch.');
 for(const bucket of config.r2_buckets||[])if(!bindings.some(b=>b.name===bucket.binding&&b.type==='r2_bucket'&&b.bucket_name===bucket.bucket_name))throw Error('Private artwork bucket mismatch.');
}
export async function checkSecurity({request=createRequest(),expectedVersion=process.env.EXPECTED_SECURITY_VERSION}={}){
 const config=JSON.parse(await readFile(new URL('../wrangler.security.jsonc',import.meta.url),'utf8'));
 const response=await request(`accounts/${DESTINATION_ACCOUNT}/workers/scripts/customvibe-security/settings`);
 if(!response.success)throw Error('Security settings observation failed.');
 validateSecurity(config,response.result);
 const version=currentWorkerVersion(await request(`accounts/${DESTINATION_ACCOUNT}/workers/scripts/customvibe-security/deployments`));
 if(expectedVersion&&version!==expectedVersion)throw Error('Current security version does not match the upload receipt.');
 return {component:'security',account:DESTINATION_ACCOUNT,id:version,observedAt:new Date().toISOString()};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)checkSecurity().then(()=>console.log('Verified private security destination, storage bindings, CPU configuration and current version.')).catch(()=>{console.error('Security protection/version check failed; no credential details are displayed.');process.exitCode=1;});
