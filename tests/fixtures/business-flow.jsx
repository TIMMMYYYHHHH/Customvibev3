import jsQR from 'jsqr';
import {businessPayload} from '../../src/designs/business.mjs';
// Local-only fixture: real rendering, validation and archive preparation; no customer submission.
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {businessDesigns,sampleBusinessValues} from '../../src/designs/business.mjs';
import {renderBusiness} from '../../src/designs/business-render.mjs';
import {preparePrivateArtwork} from '../../src/order-artwork.mjs';
import {validateOrder} from '../../server/submission-model.mjs';
import {orderRecord} from '../../server/order-record.mjs';
import {defaultContent} from '../../src/content/model.mjs';
import {downloadOrderArchive} from '../../admin/order-archive.mjs';
import OrderDetail from '../../admin/OrderDetail';
import '../../src/fonts.css';import '../../admin/workroom.css';
const content=structuredClone(defaultContent);content.products.find(p=>p.id==='business').status='available';
const realFetch=window.fetch.bind(window);let files=[],savedOrder;
window.fetch=async(path,options={})=>{const url=new URL(path,location.href);if(url.origin!==location.origin)throw Error('External requests disabled in local verification');if(url.pathname.startsWith('/api/artwork/'))return new Response(files[Number(url.pathname.split('/').at(-1))],{headers:{'content-type':'image/jpeg'}});if(url.pathname.startsWith('/api/')){if(options.method&&options.method!=='GET')return Response.json({error:'Changes and emails disabled in local verification'},{status:403});return Response.json(savedOrder)}return realFetch(path,options)};
function App(){const [state,setState]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[zip,setZip]=useState('');
 async function run(){setBusy(true);setError('');try{
  const basket=businessDesigns.map(d=>({id:crypto.randomUUID(),kind:'business',qty:2,printVersion:1,designMode:'self',values:sampleBusinessValues(d.id),preview:'deliberately-invalid-stale-preview'}));

  const prepared=await preparePrivateArtwork(basket,[],()=>{throw Error('Unexpected photo renderer')},content);files=prepared.uploads;
  if(files.length!==9)throw Error('Expected exactly nine independent print files');
  for(let i=0;i<files.length;i++){
   const fresh=await renderBusiness(basket[i].values);const bytes=Uint8Array.from(atob(fresh.url.split(',')[1]),c=>c.charCodeAt(0));
   if(bytes.length!==files[i].length||bytes.some((b,j)=>b!==files[i][j])){
    const pixels=async data=>{const bmp=await createImageBitmap(new Blob([data],{type:'image/jpeg'}));const c=document.createElement('canvas');c.width=c.height=1200;const cx=c.getContext('2d');cx.drawImage(bmp,0,0);bmp.close();return cx.getImageData(0,0,1200,1200).data;};
    const a=await pixels(bytes),b=await pixels(files[i]);let total=0,max=0,changed=0;for(let j=0;j<a.length;j++){const diff=Math.abs(a[j]-b[j]);total+=diff;max=Math.max(max,diff);if(diff>10)changed++;}
    if(max>5||total/a.length>.001)throw Error('Print difference '+basket[i].values.businessTemplate+': average '+total/a.length+', max '+max+', channels >10 '+changed);
   }
   const bitmap=await createImageBitmap(new Blob([files[i]],{type:'image/jpeg'}));if(bitmap.width!==1200||bitmap.height!==1200)throw Error('Incorrect print dimensions');if(basket[i].values.qr){const canvas=document.createElement('canvas');canvas.width=canvas.height=1200;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);const decoded=jsQR(ctx.getImageData(0,0,1200,1200).data,1200,1200);if(decoded?.data!==businessPayload(basket[i].values))throw Error('Printed QR did not decode exactly: '+basket[i].values.businessTemplate); }bitmap.close();
  }
  const id=crypto.randomUUID(),order=validateOrder({id,createdAt:Math.floor(Date.now()/1000),contact:{name:'Local Business print check',email:'sample@example.com',phone:'0000000000'},locker:{name:'Sample locker',area:'Durban'},consent:true,items:prepared.items},content,true);
  if(order.magnetQty!==18||order.items.some((item,i)=>JSON.stringify(item.values)!==JSON.stringify(basket[i].values)))throw Error('Order details or quantities changed');
  const snapshot=orderRecord(order,true),proofItems=snapshot.items.map(i=>({...i,files:i.files.map(f=>({...f,requestId:id,copies:i.qty}))}));
  savedOrder={id,reference:'LOCAL-BUSINESS',status:'new',version:0,created:order.createdAt,expires:order.createdAt+1209600,history:[],updates:[],snapshot,proof:{status:'awaiting_approval',revision:1,digest:'local-verification-only',items:proofItems}};
  const archive=await downloadOrderArchive(savedOrder,index=>Promise.resolve(new Response(files[index],{headers:{'content-type':'image/jpeg'}})));
  setZip(URL.createObjectURL(new Blob([archive],{type:'application/zip'})));setState(savedOrder);
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 return <div style={{padding:28,maxWidth:1300,margin:'auto',fontFamily:'DM Sans Variable, sans-serif'}}><h1>Local print verification</h1><p>Synthetic examples only. No orders are submitted and no email is sent.</p><button onClick={run} disabled={busy||!!state}>{busy?'Checking nine designs…':'Run nine-design print check'}</button>{error&&<p role="alert">{error}</p>}{state&&<><p role="status">PASS: all nine designs rendered afresh despite stale previews, 1200 × 1200 JPEGs, exact saved wording, 18 copies using nine files, matching rendered print pixels, four exactly decoded QR codes and a complete private-download archive.</p><a href={zip} download="business-local-print-check.zip">Download local print check</a><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,margin:"24px 0"}}>{files.map((bytes,i)=><img key={i} style={{width:"100%"}} src={URL.createObjectURL(new Blob([bytes],{type:"image/jpeg"}))} alt={businessDesigns[i].name}/>)}</div><OrderDetail order={state} onChange={async()=>{}}/></>}</div>;
}
createRoot(document.getElementById('root')).render(<App/>);
