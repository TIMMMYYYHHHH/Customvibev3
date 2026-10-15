import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {DESTINATION_ACCOUNT,PAGES_PROJECT,createRequest} from './cloudflare-target.mjs';
import {validateProtection} from './deployment-protection.mjs';
const services={AUTH:'customvibe-security',CATALOGUE:'customvibe-catalogue'};
function requireSafe(condition,message){if(!condition)throw new Error(message)}
export function validateConfig(config){
 requireSafe((config.account_id===undefined||config.account_id===DESTINATION_ACCOUNT)&&config.name===PAGES_PROJECT,'Deployment must target the business account and project.');
 requireSafe(config.pages_build_output_dir==='dist/client','Unexpected build output directory.');
 for(const name of ['local','production','preview']){
  const environment=name==='local'?config:config.env?.[name];
  requireSafe(environment?.vars?.SITE_GATE_ENABLED==='true'&&(name==='production'?['true','false']:['false']).includes(environment?.vars?.SUBMISSIONS_ENABLED),'Keep all environments gated; only production may send. Explicit production and preview settings are required.');
  for(const flag of ['ARTWORK_STORAGE_ENABLED','ORDER_RECORDS_ENABLED'])requireSafe(environment?.vars?.[flag]===undefined||(name==='production'?['true','false']:['false']).includes(environment.vars[flag]),'Private storage and order capture must stay off in preview and local environments.');
  for(const [binding,service] of Object.entries(services))requireSafe(environment.services?.some(v=>v.binding===binding&&v.service===service),'Unexpected internal service binding.');
 }
}
export function validateProject(project,{expectedProductionSending,requireSendingCredentials}={}){
 requireSafe(project.name===PAGES_PROJECT&&project.production_branch==='main'&&!project.source,'Expected the business Direct Upload project on main.');
 for(const name of ['production','preview']){
  const config=project.deployment_configs?.[name];
  validateProtection(config,name);
  for(const key of ['SITE_PASSWORD_HASH','SITE_PASSWORD_SALT','SESSION_SECRET'])requireSafe(config.env_vars?.[key]?.type==='secret_text','Private site credentials are missing.');
  for(const [binding,service] of Object.entries(services))requireSafe(config.services?.[binding]?.service===service,'Unexpected live internal service binding.');
 }
 const production=project.deployment_configs.production;
 if(expectedProductionSending!==undefined)requireSafe(production.env_vars.SUBMISSIONS_ENABLED.value===expectedProductionSending,'Production sending does not match the approved configuration.');
 if(requireSendingCredentials??(production.env_vars.SUBMISSIONS_ENABLED.value==='true'))for(const key of ['RESEND_API_KEY','W3FORMS_ACCESS_KEY','TURNSTILE_SECRET_KEY','TURNSTILE_SITE_KEY'])requireSafe(production.env_vars?.[key]?.type==='secret_text','Private production sending credentials are missing.');
}
export function validateDeployment(deployment,expectedProductionSending,expectedCommit){
 requireSafe(deployment?.environment==='production'&&deployment.latest_stage?.status==='success','The production deployment has not succeeded.');
 requireSafe(deployment.env_vars?.SITE_GATE_ENABLED?.value==='true','The deployed production gate must remain on.');
 requireSafe(deployment.env_vars?.SUBMISSIONS_ENABLED?.value===expectedProductionSending,'Deployed sending flag does not match the approved configuration.');
 for(const [binding,service] of Object.entries(services))requireSafe(deployment.services?.[binding]?.service===service,'Unexpected deployed internal service binding.');
 if(expectedCommit)requireSafe(deployment.deployment_trigger?.metadata?.commit_hash===expectedCommit,'The production deployment does not match this commit.');
}
async function main(){
 const phase=process.argv[2]||'before';
 requireSafe(['before','after'].includes(phase),'Use before or after for the deployment check.');
 const config=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
 validateConfig(config);
 const sending=config.env.production.vars.SUBMISSIONS_ENABLED;
 const request=createRequest();
 const identity=await request(`accounts/${DESTINATION_ACCOUNT}`);
 requireSafe(identity.success&&identity.result?.id===DESTINATION_ACCOUNT,'Business account verification failed.');
 const response=await request(`accounts/${DESTINATION_ACCOUNT}/pages/projects/${PAGES_PROJECT}`);
 requireSafe(response.success&&response.result,'Business project verification failed.');
 validateProject(response.result,{requireSendingCredentials:sending==='true',expectedProductionSending:phase==='after'?sending:undefined});
 if(phase==='after')validateDeployment(response.result.canonical_deployment,sending,process.env.GITHUB_SHA);
 console.log('Verified business account, gated fail-closed environments, disabled preview sending, internal services and credential presence'+(phase==='after'?', including the deployed production configuration.':'.'));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1});
