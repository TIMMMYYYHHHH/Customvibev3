import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequest,DESTINATION_ACCOUNT} from './cloudflare-target.mjs';
import {currentWorkerVersion} from './release-manifest.mjs';
export function validateCatalogue(config,settings){
 if(config.account_id!==DESTINATION_ACCOUNT||config.name!=='customvibe-catalogue'||config.workers_dev!==false||config.preview_urls!==false||config.routes?.length)throw Error('Unexpected catalogue target or public exposure.');
 if(!settings?.bindings?.some(b=>b.name==='CONTENT_DB'&&b.type==='d1'&&b.id===config.d1_databases[0].database_id))throw Error('Existing catalogue database does not match.');
}
export async function checkCatalogue({request=createRequest(),expectedVersion=process.env.EXPECTED_CATALOGUE_VERSION}={}){
 const config=JSON.parse(await readFile(new URL('../wrangler.catalogue.jsonc',import.meta.url),'utf8'));
 const response=await request(`accounts/${DESTINATION_ACCOUNT}/workers/scripts/customvibe-catalogue/settings`);
 if(!response.success)throw Error('Catalogue settings observation failed.');
 validateCatalogue(config,response.result);
 const version=currentWorkerVersion(await request(`accounts/${DESTINATION_ACCOUNT}/workers/scripts/customvibe-catalogue/deployments`));
 if(expectedVersion&&version!==expectedVersion)throw Error('Current catalogue version does not match the upload receipt.');
 return {component:'catalogue',account:DESTINATION_ACCOUNT,id:version,observedAt:new Date().toISOString()};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)checkCatalogue().then(()=>console.log('Verified private catalogue, database destination and current version.')).catch(()=>{console.error('Catalogue protection/version check failed; no credential details are displayed.');process.exitCode=1;});
