import {summarize,money} from '../src/commerce.mjs';
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
function jpeg(content,proof=false){
 if(typeof content!=='string'||content.length>1400000||content.length%4)invalid();
 let binary;try{binary=atob(content)}catch{invalid()}
 const byte=i=>binary.charCodeAt(i);
 if(binary.length<20||byte(0)!==255||byte(1)!==216||byte(binary.length-2)!==255||byte(binary.length-1)!==217)invalid();
 let at=2,dimensions=false,components=0;const quant=new Set(),huffman=new Set(),componentTables=new Map();
 while(at<binary.length-2){
  if(byte(at)!==255)invalid();const marker=byte(at+1),length=(byte(at+2)<<8)|byte(at+3),end=at+2+length;
  if(length<2||end>binary.length-2)invalid();
  // Only the baseline JPEG structure emitted by our canvas exporter is supported.
  // Reject EXIF, comments, arbitrary application segments and progressive scans.
  if(![224,219,196,192,218,221].includes(marker))invalid();
  if(marker===224&&(binary.slice(at+4,at+9)!=='JFIF\0'||length!==16))invalid();
  if(marker===219){let p=at+4;if(p===end)invalid();while(p<end){const table=byte(p++);if(table>3||p+64>end)invalid();for(let i=0;i<64;i++)if(byte(p++)===0)invalid();quant.add(table);}if(p!==end)invalid();}
  if(marker===196){let p=at+4;if(p===end)invalid();while(p<end){const table=byte(p++);if(![0,1,2,3,16,17,18,19].includes(table)||p+16>end)invalid();let count=0,slots=1;for(let i=0;i<16;i++){const n=byte(p++);count+=n;slots=slots*2-n;if(slots<0)invalid();}if(!count||count>256||p+count>end)invalid();p+=count;huffman.add(table);}if(p!==end)invalid();}
  if(marker===192){const h=(byte(at+5)<<8)|byte(at+6),w=(byte(at+7)<<8)|byte(at+8);components=byte(at+9);if(dimensions||byte(at+4)!==8||![1,3].includes(components)||length!==8+3*components||w!==h||w<1||(proof?w>2600:w!==1200))invalid();for(let p=at+10;p<end;p+=3){const id=byte(p),sampling=byte(p+1),table=byte(p+2);if(componentTables.has(id)||!(sampling>>4)||(sampling>>4)>4||!(sampling&15)||(sampling&15)>4||table>3)invalid();componentTables.set(id,table);}dimensions=true;}
  if(marker===221&&length!==4)invalid();
  if(marker===218){
   if(!dimensions||!quant.size||!huffman.size||byte(at+4)!==components||length!==6+2*components||byte(end-3)!==0||byte(end-2)!==63||byte(end-1)!==0)invalid();
   const selected=new Set();for(let p=at+5;p<end-3;p+=2){const id=byte(p),tables=byte(p+1);if(selected.has(id)||!componentTables.has(id)||!quant.has(componentTables.get(id))||!huffman.has(tables>>4)||!huffman.has(16+(tables&15)))invalid();selected.add(id);}
   let p=end,hasData=false;
   while(p<binary.length){const next=binary.indexOf('\xff',p);if(next<0)invalid();if(next>p)hasData=true;const code=byte(next+1);
    if(code===0){hasData=true;p=next+2;continue;}
    if(code>=208&&code<=215){p=next+2;continue;}
    if(code===217&&next===binary.length-2&&hasData)return content;
    invalid();
   }
   invalid();
  }
  at=end;
 }
 invalid();
}
export function validateOrder(x,catalogue){
 const base=identity(x);if(!plain(x.contact)||!plain(x.locker)||x.consent!==true||!Array.isArray(x.items)||!x.items.length||x.items.length>30)invalid();
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
  const files=item.files.map((f,i)=>{fileCount++;totalBytes+=typeof f==='string'?f.length:0;if(totalBytes>2000000||fileCount>60)invalid();return jpeg(f,item.kind==='puzzle'&&i===0)});
  return {kind:item.kind,name:product.name,qty:item.qty,...(gridSize?{gridSize}:{}),files};
 });
 const sum=summarize(items,catalogue);if(sum.unpriced||sum.magnetQty>100||!Number.isSafeInteger(sum.knownCents)||sum.knownCents<=0)invalid();
 return {...base,contact,locker,items,magnetQty:sum.magnetQty,subtotalCents:sum.knownCents,deliveryCents:null,paymentStatus:'unpaid',consent:true};
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=(heading,text)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escape(heading)}</title></head><body style="margin:0;background:#fffdf8;color:#35233f;font:16px Arial,sans-serif"><main style="max-width:620px;margin:auto;padding:32px"><p style="color:#8c2754;font-weight:bold">customvibe</p><h1 style="font-size:28px">${escape(heading)}</h1><div style="white-space:pre-wrap;line-height:1.6">${escape(text)}</div></main></body></html>`;
export function contactEmail(message){const subject='CustomVibe contact '+message.id;const body=`From: ${message.name}\nEmail: ${message.email}\n\n${message.message}`;return {from:SENDER,to:[DESTINATION],reply_to:message.email,subject,text:body,html:format('A new message',body)};}
export function orderEmails(order){
 const reference='CV-'+order.id;const lines=order.items.map((item,i)=>`${i+1}. ${item.name}${item.gridSize?` (${item.gridSize} x ${item.gridSize})`:''}: quantity ${item.qty}`).join('\n');
 const shared=`Reference: ${reference}\n\n${lines}\n\nMagnet count: ${order.magnetQty}\nMagnet subtotal: ${money(order.subtotalCents)}\nPUDO delivery: price and availability to confirm\nPreferred locker: ${order.locker.name}, ${order.locker.area}\n\nNo payment has been taken. Online payments are coming soon. This is an unpaid request, not yet accepted as an order. We will confirm the artwork, production time, delivery cost and next steps before anything proceeds.`;
 const ownerText=`UNPAID ORDER REQUEST\n\nCustomer: ${order.contact.name}\nEmail: ${order.contact.email}\nPhone: ${order.contact.phone}\n\n${shared}\n\nArtwork: photo files and individual puzzle tiles are 1200 x 1200 pixels. Puzzle proof files show the design layout; do not print the proof as individual tiles. Review source quality before production. Customer gave permission to email these designs for this request.`;
 const customerText=`Hi ${order.contact.name},\n\nWe have received your request for review.\n\n${shared}\n\nKeep this reference. For changes, reply to this email. Please do not submit the same request again.\n\nCustomVibe`;
 const attachments=[];order.items.forEach((item,i)=>item.files.forEach((content,j)=>{const stem=`design-${String(i+1).padStart(2,'0')}`;const suffix=item.kind==='puzzle'?(j===0?'proof':`row-${Math.floor((j-1)/item.gridSize)+1}-col-${(j-1)%item.gridSize+1}`):'photo';attachments.push({filename:`${stem}-${suffix}.jpg`,content,content_type:'image/jpeg'});}));
 return {owner:{from:SENDER,to:[DESTINATION],reply_to:order.contact.email,subject:`Unpaid request ${reference}`,text:ownerText,html:format('A new magnet request',ownerText),attachments},customer:{from:SENDER,to:[order.contact.email],reply_to:DESTINATION,subject:`Your CustomVibe request ${reference}`,text:customerText,html:format('Your request is with us',customerText)}};
}
