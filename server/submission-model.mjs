import {requestReference} from '../src/request-reference.mjs';
import {ARTWORK_LIMITS as limits,ORDER_LIMITS,artworkHash} from '../src/artwork-policy.mjs';
import {validateJpeg as jpeg} from './jpeg.mjs';
import {summarize,money,photoPrice} from '../src/commerce.mjs';
import {emailLayout,escapeHTML,paragraph,note,details,row,signoff,unpaid} from './email-layout.mjs';
import {emailOrderSummary} from './email-order-summary.mjs';
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
 const base=identity(x);if(x.referenceVersion!==undefined){if(![1,2].includes(x.referenceVersion))invalid();base.referenceVersion=x.referenceVersion;}if(!plain(x.contact)||!plain(x.locker)||x.consent!==true||!Array.isArray(x.items)||!x.items.length||x.items.length>ORDER_LIMITS.entries)invalid();
 const contact={name:line(x.contact.name,100),email:email(x.contact.email),phone:line(x.contact.phone,30)};
 if(!/^\+?[\d ()-]{7,30}$/.test(contact.phone)||contact.phone.replace(/\D/g,'').length<7||contact.phone.replace(/\D/g,'').length>15)invalid();
 const locker={name:line(x.locker.name,140),area:line(x.locker.area,140)};let totalBytes=0,fileCount=0;
 const items=x.items.map(item=>{
  if(!plain(item)||!Number.isSafeInteger(item.qty)||item.qty<1)invalid();
  const personal=['photo','puzzle'].includes(item.kind),product=catalogue.products.find(p=>p.id===(item.kind==='photo'?'photos':item.kind));
  if(!product||product.status!=='available'||(!personal&&!canPurchase(product)))invalid();
  const gridSize=item.kind==='puzzle'?item.gridSize:undefined;if(item.kind==='puzzle'&&![3,5].includes(gridSize))invalid();
  const expected=item.kind==='photo'?1:item.kind==='puzzle'?gridSize**2+1:0;
  if(!Array.isArray(item.files)||item.files.length!==expected)invalid();
  const files=item.files.map((f,i)=>{fileCount++;if(privateArtwork){if(!plain(f)||!Number.isSafeInteger(f.size)||f.size<20||f.size>limits.fileBytes||!artworkHash(f.sha256))invalid();totalBytes+=f.size;if(totalBytes>limits.requestBytes||fileCount>limits.files)invalid();return {size:f.size,sha256:f.sha256}}totalBytes+=typeof f==='string'?f.length:0;if(totalBytes>2000000||fileCount>60)invalid();return jpeg(f,item.kind==='puzzle'&&i===0)});
  return {kind:item.kind,name:product.name,qty:item.qty,...(gridSize?{gridSize}:{}),files};
 });
 const sum=summarize(items,catalogue);if(sum.unpriced||!Number.isSafeInteger(sum.magnetQty)||!Number.isSafeInteger(sum.knownCents)||sum.knownCents<=0)invalid();
 // Allocate the shared personalised bundle total proportionally, rounding cumulative cents.
 // This preserves the submitted line prices without changing the overall bundle price.
 let pieces=0,allocated=0;const personalTotal=photoPrice(sum.pricedQty,catalogue.pricing);
 for(const item of items){if(['photo','puzzle'].includes(item.kind)){pieces+=item.qty*(item.kind==='puzzle'?item.gridSize**2:1);const total=Math.round(personalTotal*pieces/sum.pricedQty);item.lineCents=total-allocated;allocated=total;}else item.lineCents=catalogue.products.find(p=>p.id===item.kind).priceCents*item.qty;}
 return {...base,contact,locker,items,magnetQty:sum.magnetQty,subtotalCents:sum.knownCents,deliveryCents:null,paymentStatus:'unpaid',consent:true};
}
export function orderEmails(order,privateArtwork=false,assignedReference){
 if(order.referenceVersion===2&&!/^CV-[0-9]{6,}$/.test(assignedReference||''))throw Error('Order number has not been assigned');
 const reference=order.referenceVersion===2?assignedReference:requestReference(order),summary=emailOrderSummary(order);
 const next='We will check your artwork and confirm production timing, delivery cost and next steps.';
 const customerSubject=`Your CustomVibe order ${reference}`,ownerSubject=`New unpaid order ${reference}`;
 const customerFooter='Need to change something? Reply to this email and keep your reference handy. Please do not submit the same order again.';
 const ownerFooter='Internal notification. Reply to this email to contact the customer. Customer updates remain manual in Orders.';
 const printNote='Print photos and individual puzzle tiles are 1200 × 1200 pixels. Puzzle proofs show the layout and are not print tiles. Check source quality before production.';
 const artworkUrl=`https://admin.customvibe.co.za/artwork?request=${encodeURIComponent(order.id)}`;
 const artworkNote=privateArtwork?'Admin sign-in required. Artwork expires 14 days after upload began. Download the print files before expiry. The customer consented to private storage for this order.':'Print files are attached. The customer gave permission to email these designs for this order.';
 const customerText=`Hi ${order.contact.name},\n\nThank you for your order. We have received your magnet designs and details.\n\nReference: ${reference}\n\n${unpaid}\n${next}\n\n${summary.text}\n\n${customerFooter}\n\n${signoff}\nCustomVibe`;
 const ownerText=`NEW UNPAID ORDER\n\nReference: ${reference}\nCustomer: ${order.contact.name}\nEmail: ${order.contact.email}\nPhone: ${order.contact.phone}\n\n${summary.text}\n\n${unpaid}\n${next}\n\n${privateArtwork?'Review order and artwork: '+artworkUrl+'\n':''}${artworkNote}\n\n${printNote}\n\n${ownerFooter}\n\n${signoff}\nCustomVibe`;
 const customerDesign=emailLayout({subject:customerSubject,preheader:'Your magnet designs and details are with us. No payment has been taken.',kind:'ack',heading:'Your order is with us.',label:'Order received',reference,body:paragraph(`Hi ${order.contact.name},`)+paragraph('Thank you for your order. We have received your magnet designs and details.')+note('Payment status: Unpaid',`No payment has been taken through the website. ${next}`)+summary.html,footer:customerFooter});
 const action=privateArtwork?`<p style="margin:28px 0 12px"><a class="email-button" href="${escapeHTML(artworkUrl)}" style="display:inline-block;background:#ae2e5b;color:#fff;padding:16px 24px;border:0;border-radius:8px;font:600 18px/1.5 'Trebuchet MS',Arial,sans-serif;text-decoration:none">Review order &amp; artwork</a></p>`:'';
 const ownerDesign=emailLayout({subject:ownerSubject,preheader:`${order.magnetQty} ${order.magnetQty===1?'magnet':'magnets'}. Unpaid. ${privateArtwork?'Private artwork expires after 14 days.':'Print files attached.'}`,kind:'owner',heading:'A new magnet order.',label:'Owner notification · unpaid',reference,body:paragraph(`${order.contact.name} has submitted an order for ${order.magnetQty} ${order.magnetQty===1?'magnet':'magnets'}.`)+details(row('Customer email',order.contact.email)+row('Phone',order.contact.phone))+summary.html+note('Next steps',`${unpaid} ${next} Keep the customer updated through the manual email controls.`)+action+paragraph(artworkNote)+paragraph(printNote),footer:ownerFooter});
 const attachments=[];if(!privateArtwork)order.items.forEach((item,i)=>item.files.forEach((content,j)=>{const stem=`design-${String(i+1).padStart(2,'0')}`;const suffix=item.kind==='puzzle'?(j===0?'proof':`row-${Math.floor((j-1)/item.gridSize)+1}-col-${(j-1)%item.gridSize+1}`):'photo';attachments.push({filename:`${stem}-${suffix}.jpg`,content,content_type:'image/jpeg'});}));
 return {owner:{from:SENDER,to:[DESTINATION],reply_to:order.contact.email,subject:ownerSubject,text:ownerText,...ownerDesign,attachments:[...attachments,...ownerDesign.attachments]},customer:{from:SENDER,to:[order.contact.email],reply_to:'orders@customvibe.co.za',subject:customerSubject,text:customerText,...customerDesign}};
}

export function artworkManifest(order){return order.items.flatMap((item,i)=>item.files.map((f,j)=>({...f,proof:item.kind==='puzzle'&&j===0,name:`design-${String(i+1).padStart(2,'0')}-${item.kind==='puzzle'?(j===0?'proof':`row-${Math.floor((j-1)/item.gridSize)+1}-col-${(j-1)%item.gridSize+1}`):'photo'}.jpg`})))}

// Keep signed grants and retry identities compatible with requests begun before price snapshots.
export function fingerprintPayload(submission){return JSON.stringify(Array.isArray(submission.items)?{...submission,items:submission.items.map(({lineCents,...item})=>item)}:submission)}
