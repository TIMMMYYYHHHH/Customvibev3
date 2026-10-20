import {validProviderMessageId} from './mail-receipt.mjs';
// Restricted bare-mailbox subset already used by the app. No display-name parsing.
export async function recipientBinding(providerMessageId,envelope){
 if(!validProviderMessageId(providerMessageId)||!envelope||!Array.isArray(envelope.to)||envelope.to.length!==1||['cc','bcc'].some(k=>envelope[k]!==undefined&&(!Array.isArray(envelope[k])||envelope[k].length!==0)))return null;
 const address=envelope.to[0];
 if(typeof address!=='string'||address.length>254||!/^[-A-Za-z0-9.!#$%&'*+/=?^_`{|}~]+@[A-Za-z0-9.-]+$/.test(address))return null;
 const [local,domain]=address.split('@'),labels=domain.split('.');
 if(local.length>64||local.startsWith('.')||local.endsWith('.')||local.includes('..')||labels.length<2||labels.some(s=>!s||s.length>63||!/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(s)))return null;
 const bytes=new TextEncoder().encode(JSON.stringify(['cv-recipient-v1',providerMessageId,local+'@'+domain.toLowerCase()]));
 const recipientDigest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 return {recipientCount:1,recipientDigest};
}
