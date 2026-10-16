// Read-only guard for the existing business Worker. Never print credentials or secret values.
import {readFile} from 'node:fs/promises';
import {createRequest,DESTINATION_ACCOUNT} from './cloudflare-target.mjs';
const config=JSON.parse(await readFile(new URL('../wrangler.admin.jsonc',import.meta.url),'utf8'));
if(config.account_id!==DESTINATION_ACCOUNT||config.name!=='customvibe-admin'||config.workers_dev!==false||config.preview_urls!==false||config.assets.run_worker_first!==true)throw Error('Unexpected admin deployment target or protection.');
const request=createRequest();
const response=await request(`accounts/${DESTINATION_ACCOUNT}/workers/scripts/customvibe-admin/settings`);
if(!response.success)throw Error('Business credential cannot verify existing admin settings.');
const bindings=response.result.bindings;
for(const name of ['SITE_GATE_ENABLED','ADMIN_SEND_ENABLED'])if(!bindings.some(b=>b.name===name&&b.text==='true'))throw Error('Unexpected admin operating setting: '+name);
if(!bindings.some(b=>b.name==='AUTH'&&b.service==='customvibe-security'))throw Error('Unexpected authentication service.');
for(const name of ['ADMIN_PASSWORD_HASH','ADMIN_SESSION_SECRET','RESEND_API_KEY'])if(!bindings.some(b=>b.name===name&&b.type==='secret_text'))throw Error('Required existing credential missing: '+name);
console.log('Verified existing business admin target, gate, authentication binding, manual-send availability and credential presence.');
