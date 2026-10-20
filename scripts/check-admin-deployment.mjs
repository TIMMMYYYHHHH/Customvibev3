// Read-only guard. Never print credentials or secret values.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequest,DESTINATION_ACCOUNT} from './cloudflare-target.mjs';
import {currentWorkerVersion} from './release-manifest.mjs';
export function validateAdmin(config,settings){
 if(config.account_id!==DESTINATION_ACCOUNT||config.name!=='customvibe-admin'||config.workers_dev!==false||config.preview_urls!==false||config.assets?.run_worker_first!==true)throw Error('Unexpected admin deployment target or protection.');
 const bindings=settings?.bindings||[];
 for(const name of ['SITE_GATE_ENABLED','ADMIN_SEND_ENABLED'])if(!bindings.some(b=>b.name===name&&b.text==='true'))throw Error('Unexpected admin operating setting: '+name);
 if(!bindings.some(b=>b.name==='AUTH'&&b.service==='customvibe-security'))throw Error('Unexpected authentication service.');
 for(const name of ['ADMIN_PASSWORD_HASH','ADMIN_SESSION_SECRET','RESEND_API_KEY'])if(!bindings.some(b=>b.name===name&&b.type==='secret_text'))throw Error('Required existing credential missing: '+name);
}
export async function checkAdmin({request=createRequest(),expectedVersion=process.env.EXPECTED_ADMIN_VERSION}={}){
 const config=JSON.parse(await readFile(new URL('../wrangler.admin.jsonc',import.meta.url),'utf8'));
 const response=await request(`accounts/${DESTINATION_ACCOUNT}/workers/scripts/customvibe-admin/settings`);
 if(!response.success)throw Error('Business credential cannot verify existing admin settings.');
 validateAdmin(config,response.result);
 const version=currentWorkerVersion(await request(`accounts/${DESTINATION_ACCOUNT}/workers/scripts/customvibe-admin/deployments`));
 if(expectedVersion&&version!==expectedVersion)throw Error('Current admin version does not match the upload receipt.');
 return {component:'admin',account:DESTINATION_ACCOUNT,id:version,observedAt:new Date().toISOString()};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)checkAdmin().then(()=>console.log('Verified admin target, gate, authentication, manual-send availability, credential presence and current version.')).catch(()=>{console.error('Admin protection/version check failed; no credential details are displayed.');process.exitCode=1;});
