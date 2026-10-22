import {MAGNET_FACE_CM} from '../print-dimensions.mjs';
import QRCode from 'qrcode';
const field=(label,x,y,size,width,limit,sample,color,extra={})=>({label,x,y,size,width,limit,sample,color,weight:600,...extra});
// Edition 1 layouts use the original 1254 px square coordinates. Never shrink text to fit.
export const businessDesigns=[
 {id:'01-plumber',name:'Business contact',fields:[field('Business name line 1',627,155,100,1060,22,'COASTAL','#fff6e6'),field('Business name line 2',627,265,100,1060,22,'PLUMBING','#fff6e6',{optional:true}),field('Short description',627,410,64,940,32,'Your local plumber','#fff6e6',{weight:400}),field('Phone number',627,628,75,930,24,'Call 000 000 0000','#092b46')]},
 {id:'02-salon',name:'Book a visit',qr:[852,806,371],fields:[field('Business name',80,230,65,570,24,'STUDIO BLOOM','#480e23',{align:'left'})]},
 {id:'03-cafe',name:'View the menu',qr:[846,787,354],fields:[field('Business name',627,100,46,660,28,'THE DAILY TABLE','#fff6e6')]},
 {id:'04-wifi',name:'Guest Wi-Fi',qr:[417,600,420],wifi:true,fields:[field('Business name',627,190,82,1090,28,'SALT & SHORE','#16415a')]},
 {id:'05-review',name:'Customer reviews',qr:[826,744,368],fields:[field('Business name',946,138,42,480,25,'PETAL & STEM','#fff6e6'),field('Headline line 1',936,332,76,540,18,'Loved your','#fff6e6'),field('Headline line 2',936,455,76,540,18,'flowers?','#fff6e6')]},
 {id:'06-bakery',name:'Order on WhatsApp',fields:[field('Business name',627,135,84,1120,28,'BUTTER & CRUMB','#401d0b'),field('WhatsApp number',627,1090,78,1060,24,'000 000 0000','#ffe390')]},
 {id:'07-hours',name:'Opening hours',fields:[field('Business name',627,280,70,930,28,'THE LITTLE EDIT','#ffdbc2'),field('Opening hours line 1',627,715,82,1010,28,'Mon–Fri 9–5','#ffdbc2'),field('Opening hours line 2',627,925,82,1010,28,'Saturday 9–1','#ffdbc2')]},
 {id:'08-offer',name:'Thank-you offer',fields:[field('Business name',365,168,42,570,25,'LITTLE JOYS','#62427d'),field('Discount',420,560,210,710,4,'10%','#df3d30',{format:'discount'}),field('Offer code',435,1109,46,660,20,'THANKYOU','#ffffff',{prefix:'Use code '})]},
 {id:'09-groomer',name:'Next appointment',fields:[field('Business name line 1',315,325,65,500,18,'PAWS &','#4a5643'),field('Business name line 2',315,410,65,500,18,'POLISH','#4a5643',{optional:true}),field('Next appointment',130,1084,58,990,32,'Tue 24 Nov, 10:00','#4a5643',{align:'left',optional:true})]}
].map(d=>({...d,image:'/assets/business/v1/'+d.id+'.png'}));
export const businessTemplate=id=>businessDesigns.find(d=>d.id===id);
export function defaultBusinessValues(id){const d=businessTemplate(id);return {businessTemplate:id,edition:1,entries:d.fields.map(()=>''),...(d.qr?{qr:d.wifi?{mode:'wifi',network:'',password:'',security:'WPA'}:{mode:'url',url:''}}:{})};}
export function sampleBusinessValues(id){const d=businessTemplate(id);return {...defaultBusinessValues(id),entries:d.fields.map(f=>f.sample),...(d.qr?{qr:d.wifi?{mode:'wifi',network:'Guest Wi-Fi',password:'Welcome123',security:'WPA'}:{mode:'url',url:'https://customvibe.co.za'}}:{})};}
export function businessFieldError(field,text){
 if(typeof text!=='string'||[...text].length>field.limit||/[^\u0020-\u007e\u00a0-\u024f\u2010-\u2027\u20ac]/u.test(text))return `${field.label}: use letters, numbers and punctuation on one line, up to ${field.limit} characters.`;
 if(field.format==='discount'&&text&&!/^(?:[1-9]\d?|100)%$/.test(text))return 'Discount: enter a percentage from 1% to 100%.';
 return '';
}
function qrValues(design,input,incomplete){
 if(!design.qr)return undefined;
 if(!input||!['url',...(design.wifi?['wifi']:[])].includes(input.mode))throw Error('Choose a QR code action.');
 if(input.mode==='url'){
  const url=typeof input.url==='string'?input.url.trim():'';
  if(!url&&incomplete)return {mode:'url',url:''};
  let parsed;try{parsed=new URL(url)}catch{throw Error('Enter a complete https:// or http:// link for the QR code.')}
  if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||url.length>240||/[\u0000-\u0020\u007f]/u.test(url))throw Error('Use a public https:// or http:// link without a password.');
  return {mode:'url',url};
 }
 const {network,password,security}=input;
 if(!['WPA','nopass'].includes(security))throw Error('Choose the Wi-Fi security type.');
 if(typeof network!=='string'||new TextEncoder().encode(network).length>32||/[\u0000-\u001f\u007f]/u.test(network)||(!incomplete&&!network.trim()))throw Error('Enter a Wi-Fi network name, up to 32 bytes.');
 if(security==='nopass')return {mode:'wifi',network,password:'',security};
 if(typeof password!=='string'||password.length>63||/[^\x20-\x7e]/.test(password)||(!incomplete&&password.length<8))throw Error('Enter the Wi-Fi password, using 8 to 63 characters.');
 return {mode:'wifi',network,password,security};
}
const escapeWifi=text=>text.replace(/[\\;:,\"]/g,'\\$&');
export function businessPayload(values){const q=values.qr;if(!q)return '';return q.mode==='url'?q.url:`WIFI:T:${q.security};S:${escapeWifi(q.network)};P:${escapeWifi(q.password)};;`;}
export function businessMatrix(values){const payload=businessPayload(values);if(!payload)return null;const modules=QRCode.create(payload,{errorCorrectionLevel:'M'}).modules;if(modules.size>49)throw Error(`This QR code has too much detail for a ${MAGNET_FACE_CM} cm magnet. Please use a shorter link or shorter Wi-Fi details.`);return modules;}
export function validateBusinessValues(input,{incomplete=false}={}){
 const design=businessTemplate(input?.businessTemplate);
 if(!design||input.edition!==1)throw Error('Choose a current business magnet design.');
 if(!Array.isArray(input.entries)||input.entries.length!==design.fields.length)throw Error('Please check the details for this design.');
 const entries=design.fields.map((f,i)=>{const text=input.entries[i],error=businessFieldError(f,text);if(error)throw Error(error);if(!incomplete&&!f.optional&&!text.trim())throw Error(`Add ${f.label.toLowerCase()}.`);return text;});
 const qr=qrValues(design,input.qr,incomplete),clean={businessTemplate:design.id,edition:1,entries,...(qr?{qr}:{})};
 if(qr&&(!incomplete||qr.mode==='url'&&qr.url||qr.mode==='wifi'&&qr.network&&(qr.password.length>=8||qr.security==='nopass')))businessMatrix(clean);
 return clean;
}
export function businessDetails(values){if(!values?.businessTemplate)return [];const clean=validateBusinessValues(values),d=businessTemplate(clean.businessTemplate);return [...d.fields.map((f,i)=>({label:f.label,value:clean.entries[i]})),...(clean.qr?.mode==='url'?[{label:'QR link',value:clean.qr.url}]:clean.qr?[{label:'QR action',value:'Join Wi-Fi'},{label:'Network name',value:clean.qr.network},{label:'Network security',value:clean.qr.security==='nopass'?'Open network':'WPA/WPA2/WPA3 Personal'},{label:'Wi-Fi password',value:clean.qr.password}]:[])];}
