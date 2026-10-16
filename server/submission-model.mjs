import {requestReference} from '../src/request-reference.mjs';
import {ARTWORK_LIMITS as limits,artworkHash} from '../src/artwork-policy.mjs';
import {validateJpeg as jpeg} from './jpeg.mjs';
import {summarize,money,photoPrice} from '../src/commerce.mjs';
import {canPurchase} from '../src/content/model.mjs';
export const MAX_BODY=2100000;
export const DESTINATION='customvibe03@gmail.com';
export const SENDER='CustomVibe <orders@customvibe.co.za>';
const invalid=()=>{throw new Error('Invalid request')};
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
function text(v,max){if(typeof v!=='string'||!v.trim()||v.length>max||/[\x00-\x08\x0b-\x1f\x7f]/.test(v))invalid();return v.trim();}
function line(v,max){const s=text(v,max);if(/[\r\n]/.test(s))invalid();return s;}
function email(v){const s=line(v,254);if(!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(s))invalid();return s;}
function identity(x){if(!plain(x)||typeof x.id!=='string'||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x.id)||!Number.isSafeInteger(x.createdAt)||x.createdAt<Math.floor(Date.now()/1000)-82800||x.createdAt>Math.floor(Date.now()/1000)+60)invalid();return {id:x.id,createdAt:x.createdAt};}
export function validateContact(x){return {...identity(x),name:line(x.name,100),email:email(x.email),message:text(x.message,5000)};}
export function validateOrder(x,catalogue,privateArtwork=false){
 const base=identity(x);if(x.referenceVersion!==undefined){if(x.referenceVersion!==1)invalid();base.referenceVersion=1;}if(!plain(x.contact)||!plain(x.locker)||x.consent!==true||!Array.isArray(x.items)||!x.items.length||x.items.length>30)invalid();
 const contact={name:line(x.contact.name,100),email:email(x.contact.email),phone:line(x.contact.phone,30)};
 if(!/^\+?[\d ()-]{7,30}$/.test(contact.phone)||contact.phone.replace(/\D/g,'').length<7||contact.phone.replace(/\D/g,'').length>15)invalid();
 const locker={name:line(x.locker.name,140),area:line(x.locker.area,140)};let totalBytes=0,fileCount=0;
 const items=x.items.map(item=>{
  if(!plain(item)||!Number.isInteger(item.qty)||item.qty<1||item.qty>100)invalid();
  const personal=['photo','puzzle'].includes(item.kind),product=catalogue.products.find(p=>p.id===(item.kind==='photo'?'photos':item.kind));
  if(!product||product.status!=='available'||(!personal&&!canPurchase(product)))invalid();
  const gridSize=item.kind==='puzzle'?item.gridSize:undefined;if(item.kind==='puzzle'&&![3,5].includes(gridSize))invalid();
  const expected=item.kind==='photo'?1:item.kind==='puzzle'?gridSize**2+1:0;
  if(!Array.isArray(item.files)||item.files.length!==expected)invalid();
  const files=item.files.map((f,i)=>{fileCount++;if(privateArtwork){if(!plain(f)||!Number.isSafeInteger(f.size)||f.size<20||f.size>limits.fileBytes||!artworkHash(f.sha256))invalid();totalBytes+=f.size;if(totalBytes>limits.requestBytes||fileCount>limits.files)invalid();return {size:f.size,sha256:f.sha256}}totalBytes+=typeof f==='string'?f.length:0;if(totalBytes>2000000||fileCount>60)invalid();return jpeg(f,item.kind==='puzzle'&&i===0)});
  return {kind:item.kind,name:product.name,qty:item.qty,...(gridSize?{gridSize}:{}),files};
 });
 const sum=summarize(items,catalogue);if(sum.unpriced||sum.magnetQty>100||!Number.isSafeInteger(sum.knownCents)||sum.knownCents<=0)invalid();
 // Allocate the shared personalised bundle total proportionally, rounding cumulative cents.
 // This preserves the submitted line prices without changing the overall bundle price.
 let pieces=0,allocated=0;const personalTotal=photoPrice(sum.pricedQty,catalogue.pricing);
 for(const item of items){if(['photo','puzzle'].includes(item.kind)){pieces+=item.qty*(item.kind==='puzzle'?item.gridSize**2:1);const total=Math.round(personalTotal*pieces/sum.pricedQty);item.lineCents=total-allocated;allocated=total;}else item.lineCents=catalogue.products.find(p=>p.id===item.kind).priceCents*item.qty;}
 return {...base,contact,locker,items,magnetQty:sum.magnetQty,subtotalCents:sum.knownCents,deliveryCents:null,paymentStatus:'unpaid',consent:true};
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=(heading,text)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escape(heading)}</title></head><body style="margin:0;background:#fffdf8;color:#35233f;font:16px Arial,sans-serif"><main style="max-width:620px;margin:auto;padding:32px"><p style="color:#8c2754;font-weight:bold">customvibe</p><h1 style="font-size:28px">${escape(heading)}</h1><div style="white-space:pre-wrap;line-height:1.6">${escape(text)}</div></main></body></html>`;
export function orderEmails(order,privateArtwork=false){
 const reference=requestReference(order);const lines=order.items.map((item,i)=>`${i+1}. ${item.name}${item.gridSize?` (${item.gridSize} x ${item.gridSize})`:''}: quantity ${item.qty}`).join('\n');
 const shared=`Reference: ${reference}\n\n${lines}\n\nMagnet count: ${order.magnetQty}\nMagnet subtotal: ${money(order.subtotalCents)}\nPUDO delivery: price and availability to confirm\nPreferred locker: ${order.locker.name}, ${order.locker.area}\n\nNo payment has been taken. Online payments are coming soon. This is an unpaid request, not yet accepted as an order. We will confirm the artwork, production time, delivery cost and next steps before anything proceeds.`;
 let ownerText=`UNPAID ORDER REQUEST\n\nCustomer: ${order.contact.name}\nEmail: ${order.contact.email}\nPhone: ${order.contact.phone}\n\n${shared}\n\nArtwork: photo files and individual puzzle tiles are 1200 x 1200 pixels. Puzzle proof files show the design layout; do not print the proof as individual tiles. Review source quality before production. Customer gave permission to email these designs for this request.`;
 if(privateArtwork)ownerText=ownerText.replace('Customer gave permission to email these designs for this request.',`Private artwork: https://admin.customvibe.co.za/artwork?request=${order.id}\nAdmin sign-in required. Test artwork expires seven days after upload began. Download the print tiles before expiry. Customer consented to private storage for this request.`);
 const customerText=`Hi ${order.contact.name},\n\nWe have received your request for review.\n\n${shared}\n\nKeep this reference. For changes, reply to this email. Please do not submit the same request again.\n\nCustomVibe`;
 const attachments=[];if(!privateArtwork)order.items.forEach((item,i)=>item.files.forEach((content,j)=>{const stem=`design-${String(i+1).padStart(2,'0')}`;const suffix=item.kind==='puzzle'?(j===0?'proof':`row-${Math.floor((j-1)/item.gridSize)+1}-col-${(j-1)%item.gridSize+1}`):'photo';attachments.push({filename:`${stem}-${suffix}.jpg`,content,content_type:'image/jpeg'});}));
 return {owner:{from:SENDER,to:[DESTINATION],reply_to:order.contact.email,subject:`Unpaid request ${reference}`,text:ownerText,html:format('A new magnet request',ownerText),...(privateArtwork?{}:{attachments})},customer:{from:SENDER,to:[order.contact.email],reply_to:'orders@customvibe.co.za',subject:`Your CustomVibe request ${reference}`,text:customerText,html:format('Your request is with us',customerText)}};
}

export function artworkManifest(order){return order.items.flatMap((item,i)=>item.files.map((f,j)=>({...f,proof:item.kind==='puzzle'&&j===0,name:`design-${String(i+1).padStart(2,'0')}-${item.kind==='puzzle'?(j===0?'proof':`row-${Math.floor((j-1)/item.gridSize)+1}-col-${(j-1)%item.gridSize+1}`):'photo'}.jpg`})))}

// Keep signed grants and retry identities compatible with requests begun before price snapshots.
export function fingerprintPayload(submission){return JSON.stringify(Array.isArray(submission.items)?{...submission,items:submission.items.map(({lineCents,...item})=>item)}:submission)}
