import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {DESTINATION_ACCOUNT,PAGES_PROJECT,createRequest} from './cloudflare-target.mjs';
const services={AUTH:'customvibe-security',CATALOGUE:'customvibe-catalogue'};
function requireSafe(condition,message){if(!condition)throw new Error(message)}
export function validateConfig(config){
 requireSafe((config.account_id===undefined||config.account_id===DESTINATION_ACCOUNT)&&config.name===PAGES_PROJECT,'Deployment must target the business account and project.');
 requireSafe(config.pages_build_output_dir==='dist/client','Unexpected build output directory.');
 requireSafe(config.vars?.SITE_GATE_ENABLED==='true'&&config.vars?.SUBMISSIONS_ENABLED==='false','Keep the site gate on and sending off.');
 for(const [binding,service] of Object.entries(services))requireSafe(config.services?.some(v=>v.binding===binding&&v.service===service),'Unexpected internal service binding.');
}
export function validateProject(project){
 requireSafe(project.name===PAGES_PROJECT&&project.production_branch==='main'&&!project.source,'Expected the business Direct Upload project on main.');
 for(const name of ['production','preview']){
  const config=project.deployment_configs?.[name];
  requireSafe(config?.fail_open===false&&config.env_vars?.SITE_GATE_ENABLED?.value==='true'&&config.env_vars?.SUBMISSIONS_ENABLED?.value==='false','Both environments must stay gated, sending-disabled and fail closed.');
  for(const key of ['SITE_PASSWORD_HASH','SITE_PASSWORD_SALT','SESSION_SECRET'])requireSafe(config.env_vars?.[key]?.type==='secret_text','Private site credentials are missing.');
  for(const [binding,service] of Object.entries(services))requireSafe(config.services?.[binding]?.service===service,'Unexpected live internal service binding.');
 }
}
async function main(){
 validateConfig(JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8')));
 const request=createRequest();
 const identity=await request(`accounts/${DESTINATION_ACCOUNT}`);
 requireSafe(identity.success&&identity.result?.id===DESTINATION_ACCOUNT,'Business account verification failed.');
 const response=await request(`accounts/${DESTINATION_ACCOUNT}/pages/projects/${PAGES_PROJECT}`);
 requireSafe(response.success&&response.result,'Business project verification failed.');
 validateProject(response.result);
 console.log('Verified business account, protected environments, internal services and credential presence.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1});
