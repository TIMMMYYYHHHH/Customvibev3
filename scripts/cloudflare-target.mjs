import {readFile} from 'node:fs/promises';
import {createConnection} from 'node:net';
import {validateProtection} from './deployment-protection.mjs';

export const DESTINATION_ACCOUNT='4f57d4e924674cb87b33d4c884745cf6';
export const PAGES_PROJECT='customvibe-business';
const ADMIN_WORKER='customvibe-admin';
export function requireDestination(env=process.env){
 if(env.CLOUDFLARE_ACCOUNT_ID!==DESTINATION_ACCOUNT)throw new Error('Set CLOUDFLARE_ACCOUNT_ID to the verified destination account before entering credentials.');
 return DESTINATION_ACCOUNT;
}

// A token is never obtained from Wrangler's default login or written to disk.
export function cloudflareErrorCodes(value){
 const errors=Array.isArray(value?.errors)?value.errors:[];
 return [...new Set(errors.map(error=>error?.code).filter(code=>Number.isInteger(code)&&code>=0&&code<=1000000))].slice(0,5);
}

export function createRequest(env=process.env,{diagnostic=false}={}){
 const account=requireDestination(env);
 const socket=env.CUSTOMVIBE_MIGRATION_SOCKET;
 if(diagnostic&&socket)throw new Error('Diagnostic mode requires the explicit API token, without a migration socket.');
 if(!socket&&!env.CLOUDFLARE_API_TOKEN)throw new Error('Provide the destination API token or the temporary migration socket.');
 return async(path,method='GET',body)=>{
  if(path!==`accounts/${account}`&&!path.startsWith(`accounts/${account}/`))throw new Error('Request outside destination account.');
  if(diagnostic&&method!=='GET')throw new Error('Diagnostic requests are read-only.');
  if(!['GET','PATCH','PUT'].includes(method))throw new Error('Credential operation is not allowed.');
  let detail={category:socket?'SOCKET_ERROR':'NETWORK_ERROR'};
  try{
   if(socket)return await new Promise((resolve,reject)=>{
    const connection=createConnection(socket);let response='';
    connection.setTimeout(100000,()=>connection.destroy(new Error('Timed out')));
    connection.on('error',reject);
    connection.on('connect',()=>connection.write(JSON.stringify({op:'api',account,path,method,body})+'\n'));
    connection.on('data',chunk=>{response+=chunk;if(response.length>2000000){connection.destroy(new Error('Response too large'));return}if(response.includes('\n')){connection.end();try{resolve(JSON.parse(response.split('\n')[0]))}catch{reject(new Error('Invalid response'))}}});
    connection.on('end',()=>{if(!response.includes('\n'))reject(new Error('Incomplete response'))});
   });
   const response=await fetch(`https://api.cloudflare.com/client/v4/${path}`,{method,headers:{Authorization:`Bearer ${env.CLOUDFLARE_API_TOKEN}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
   if(!response.ok){
    detail={category:'HTTP_ERROR',...(Number.isInteger(response.status)&&response.status>=100&&response.status<=599?{httpStatus:response.status}:{})};
    if(diagnostic)try{detail.cloudflareCodes=cloudflareErrorCodes(await response.json())}catch{}
    throw new Error('Request rejected');
   }
   detail={category:'INVALID_JSON'};
   return await response.json();
  }catch(cause){
   if(detail.category==='NETWORK_ERROR'){
    if(['AbortError','TimeoutError'].includes(cause?.name)||['ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT'].includes(cause?.cause?.code))detail={category:'TIMEOUT'};
    else if(['ENOTFOUND','EAI_AGAIN'].includes(cause?.cause?.code))detail={category:'DNS_ERROR'};
    else if(['CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE','DEPTH_ZERO_SELF_SIGNED_CERT'].includes(cause?.cause?.code))detail={category:'TLS_ERROR'};
   }
   const error=new Error('Cloudflare request failed. No credential details are displayed.');
   if(diagnostic)error.diagnostic=detail;
   throw error;
  }
 };
}

export async function verifyTarget({scope,project,env=process.env,config,request}={}){
 const account=requireDestination(env);
 const expected=scope==='site'?PAGES_PROJECT:scope==='admin'?ADMIN_WORKER:null;
 if(!expected||project!==expected)throw new Error('Unexpected destination resource.');
 config??=JSON.parse(await readFile(new URL(scope==='site'?'../wrangler.jsonc':'../wrangler.admin.jsonc',import.meta.url),'utf8'));
 if((scope==='admin'||config.account_id!==undefined)&&config.account_id!==account)throw new Error('Configuration does not pin the destination account.');
 if(config.name!==expected)throw new Error('Configuration does not match the destination resource.');
 request??=createRequest(env);
 const path=`accounts/${account}/${scope==='site'?`pages/projects/${expected}`:`workers/scripts/${expected}/settings`}`;
 async function verify(){
  const identity=await request(`accounts/${account}`);
  if(!identity.success||identity.result?.id!==account)throw new Error('Destination account verification failed.');
  const resource=await request(path);
  if(!resource.success||!resource.result||(scope==='site'&&resource.result.name!==expected))throw new Error('Destination resource verification failed.');
  if(scope==='site')for(const name of ['production','preview']){
   const deployment=resource.result.deployment_configs?.[name];
   validateProtection(deployment,name);
  }
  return resource.result;
 }
 await verify();
 return {account,project:expected,async installSecrets(values){
  const resource=await verify();
  if(!Object.keys(values).length||Object.entries(values).some(([name,value])=>!(/^[A-Z][A-Z0-9_]+$/).test(name)||typeof value!=='string'||!value))throw new Error('Invalid secret entry.');
  if(scope==='site'){
   const env_vars=Object.fromEntries(Object.entries(values).map(([name,value])=>[name,{type:'secret_text',value}]));
   const deployment_configs=Object.fromEntries(['production','preview'].map(name=>[name,{env_vars,wrangler_config_hash:resource.deployment_configs[name].wrangler_config_hash}]));
   if(!(await request(path,'PATCH',{deployment_configs})).success)throw new Error('Credential installation failed. No secret output shown.');
  }else for(const [name,text] of Object.entries(values)){
   if(!(await request(`accounts/${account}/workers/scripts/${expected}/secrets`,'PUT',{name,text,type:'secret_text'})).success)throw new Error('Credential installation failed. No secret output shown.');
  }
 }};
}
