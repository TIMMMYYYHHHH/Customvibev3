import {validateBusinessValues} from './business.mjs';
import {validateHandyValues} from './handy.mjs';
import QRCode from 'qrcode';
export const templateIds=['business','qr','wifi','information'];
export const colours={mint:'#B8DDC8',lilac:'#D6C3EC',peach:'#F4B293',cream:'#FFF6E6'};
function field(value,name,max,required=true,trim=true){
 if(typeof value!=='string')value='';
 const text=trim?value.trim():value;
 if((required&&!text.trim())||[...text].length>max||/[\u0000-\u0008\u000b-\u001f\u007f]/u.test(text))throw new Error(`Please check ${name}${max?` (up to ${max} characters)`:''}.`);
 return text;
}
export function validateTemplate(id,input={}){
 if(id==='business'&&input?.businessTemplate!==undefined)return validateBusinessValues(input);
 if(id==='information'&&input?.handyTemplate!==undefined)return validateHandyValues(input);
 if(!templateIds.includes(id))throw new Error('Choose a supported template.');
 const values={title:field(input.title,'title',44),colour:input.colour||'cream'};
 if(!Object.hasOwn(colours,values.colour))throw new Error('Choose a template colour.');
 if(id==='business'||id==='information')values.details=field(input.details,'details',id==='business'?160:240);
 if(id==='qr'){
  values.url=field(input.url,'link',240);let url;try{url=new URL(values.url);}catch{throw new Error('Enter a complete https:// or http:// link.');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Use a public http:// or https:// link without a password.');
  values.url=field(url.href,'encoded link',240);values.details=field(input.details,'details',60,false);
 }
 if(id==='wifi'){
  values.network=field(input.network,'network name',32,true,false);values.password=field(input.password,'password',63,input.security!=='nopass',false);
  if(/[\r\n\t]/.test(values.network+values.password))throw new Error('Network names and passwords must be on one line without tabs.');
  values.security=input.security||'WPA';if(!['WPA','WEP','nopass'].includes(values.security))throw new Error('Choose a Wi-Fi security type.');
  if(values.security==='nopass')values.password='';
 }
 return values;
}
const escapeWifi=value=>value.replace(/[\\;:,\"]/g,'\\$&');
export function qrPayload(id,values){
 if(id==='qr')return values.url;
 if(id==='wifi')return `WIFI:T:${values.security};S:${escapeWifi(values.network)};P:${escapeWifi(values.password)};;`;
 throw new Error('This template has no QR code.');
}
export function qrMatrix(payload){return QRCode.create(payload,{errorCorrectionLevel:'M'}).modules;}
