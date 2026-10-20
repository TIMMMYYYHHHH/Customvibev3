// Read-only, bounded diagnostic for the exact pre-upload settings request.
// Never serialize provider responses, bindings, messages, exception text or credentials.
import {pathToFileURL} from 'node:url';
import {createRequest,DESTINATION_ACCOUNT,cloudflareErrorCodes} from './cloudflare-target.mjs';

export async function diagnoseAdmin({env=process.env}={}){
 const check='ADMIN_SETTINGS_READ';
 let request;
 try{request=createRequest(env,{diagnostic:true})}catch{return {ok:false,check,category:'CONFIGURATION_ERROR'}}
 try{
  const response=await request(`accounts/${DESTINATION_ACCOUNT}/workers/scripts/customvibe-admin/settings`);
  return response?.success===true
   ?{ok:true,check,category:'READ_OK'}
   :{ok:false,check,category:'API_ERROR',cloudflareCodes:cloudflareErrorCodes(response)};
 }catch(error){
  const detail=error.diagnostic;
  const categories=['HTTP_ERROR','INVALID_JSON','TIMEOUT','DNS_ERROR','TLS_ERROR','NETWORK_ERROR'];
  const category=categories.includes(detail?.category)?detail.category:'NETWORK_ERROR';
  return {ok:false,check,category,
   ...(Number.isInteger(detail?.httpStatus)&&detail.httpStatus>=100&&detail.httpStatus<=599?{httpStatus:detail.httpStatus}:{}),
   ...(Array.isArray(detail?.cloudflareCodes)?{cloudflareCodes:cloudflareErrorCodes({errors:detail.cloudflareCodes.map(code=>({code}))})}:{})};
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await diagnoseAdmin();
 console.log(JSON.stringify(result));
 if(!result.ok)process.exitCode=1;
}
