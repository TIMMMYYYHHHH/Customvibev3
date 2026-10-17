import {readFile} from 'node:fs/promises';
import {createRequest,DESTINATION_ACCOUNT} from './cloudflare-target.mjs';
const config=JSON.parse(await readFile(new URL('../wrangler.catalogue.jsonc',import.meta.url),'utf8'));
if(config.account_id!==DESTINATION_ACCOUNT||config.name!=='customvibe-catalogue'||config.workers_dev!==false||config.preview_urls!==false||config.routes?.length)throw Error('Unexpected catalogue target or public exposure.');
const request=createRequest(),response=await request(`accounts/${DESTINATION_ACCOUNT}/workers/scripts/customvibe-catalogue/settings`);
if(!response.success||!response.result.bindings.some(b=>b.name==='CONTENT_DB'&&b.type==='d1'&&b.id===config.d1_databases[0].database_id))throw Error('Existing catalogue database does not match.');
console.log('Verified existing private catalogue and its database destination.');
