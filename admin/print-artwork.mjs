import {ARTWORK_LIMITS as limits} from '../src/artwork-policy.mjs';
const unavailable='Some artwork is unavailable. No print sheet was created. Retry after checking the current artwork.';
function checkReady(job,signal,now){
 if(signal?.aborted)throw Error('Print preparation was cancelled.');
 if(!Number.isSafeInteger(job.expiresAt)||job.expiresAt*1000<=now())throw Error('This artwork has expired. No print sheet was created.');
}
export function assertCurrentPrintOrder(job,current,now=Date.now()){
 const revision=current.proof?.revision??0,digest=revision?(current.proof.digest??null):null;
 if(current.id!==job.orderId||current.version!==job.version||revision!==job.revision||digest!==(job.digest??null))throw Error('The order or artwork changed. Prepare a new print sheet from the current revision.');
 const expires=current.artworkExpires??current.expires;
 if(!Number.isSafeInteger(expires)||expires*1000<=now||job.expiresAt*1000<=now)throw Error('This artwork has expired. Prepare a new sheet only after artwork is available.');
}
/** Reads only current, authenticated files. The returned map stays in memory. */
export async function readPrintArtwork(job,fetchFile,{signal,now=Date.now}={}){
 checkReady(job,signal,now);
 if(!Array.isArray(job.files)||!job.files.length||job.files.length>limits.files||job.files.reduce((sum,f)=>sum+f.size,0)>limits.requestBytes)throw Error('Artwork exceeds the print download limit.');
 const files=new Map();
 for(const file of job.files){
  checkReady(job,signal,now);
  if(files.has(file.name)||!Number.isSafeInteger(file.size)||file.size<1||file.size>limits.fileBytes||file.sha256!==undefined&&!/^[a-f0-9]{64}$/.test(file.sha256))throw Error('Invalid print artwork manifest.');
  const response=await fetchFile(file,{signal});
  if(!response.ok||!response.headers.get('content-type')?.toLowerCase().startsWith('image/jpeg')||!response.body)throw Error(unavailable);
  const reader=response.body.getReader(),parts=[];let size=0;
  try{
   while(true){
    checkReady(job,signal,now);
    const {done,value}=await reader.read();if(done)break;
    size+=value.length;if(size>file.size)throw Error('Artwork size changed. No print sheet was created.');
    parts.push(value);
   }
  }catch(error){await reader.cancel().catch(()=>{});throw error;}
  if(size!==file.size)throw Error('Artwork download was incomplete. No print sheet was created.');
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  if(file.sha256){
   const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
   if(actual!==file.sha256)throw Error('Artwork verification failed. No print sheet was created.');
  }
  checkReady(job,signal,now);files.set(file.name,bytes);
 }
 return files;
}
