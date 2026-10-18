// Local-only fixture: real rendering, validation and archive preparation; no customer submission.
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {handyDesigns,defaultHandyValues} from '../../src/designs/handy.mjs';
import {renderHandy} from '../../src/designs/handy-render.mjs';
import {preparePrivateArtwork} from '../../src/order-artwork.mjs';
import {validateOrder} from '../../server/submission-model.mjs';
import {orderRecord} from '../../server/order-record.mjs';
import {defaultContent} from '../../src/content/model.mjs';
import {downloadOrderArchive} from '../../admin/order-archive.mjs';
import OrderDetail from '../../admin/OrderDetail';
import '../../src/fonts.css';import '../../admin/workroom.css';
const content=structuredClone(defaultContent);content.products.find(p=>p.id==='information').status='available';
const realFetch=window.fetch.bind(window);let files=[],savedOrder;
window.fetch=async(path,options={})=>{const url=new URL(path,location.href);if(url.origin!==location.origin)throw Error('External requests disabled in local verification');if(url.pathname.startsWith('/api/artwork/'))return new Response(files[Number(url.pathname.split('/').at(-1))],{headers:{'content-type':'image/jpeg'}});if(url.pathname.startsWith('/api/')){if(options.method&&options.method!=='GET')return Response.json({error:'Changes and emails disabled in local verification'},{status:403});return Response.json(savedOrder)}return realFetch(path,options)};
function App(){const [state,setState]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[zip,setZip]=useState('');
 async function run(){setBusy(true);setError('');try{
  const basket=handyDesigns.map(d=>({id:crypto.randomUUID(),kind:'information',qty:2,printVersion:1,designMode:'self',values:defaultHandyValues(d.id),preview:'deliberately-invalid-stale-preview'}));
  basket[6].values.entries=['Art club','Library','Soccer','Music','Pizza night'];
  const prepared=await preparePrivateArtwork(basket,[],()=>{throw Error('Unexpected photo renderer')},content);files=prepared.uploads;
  if(files.length!==9)throw Error('Expected exactly nine independent print files');
  for(let i=0;i<files.length;i++){
   const fresh=await renderHandy(basket[i].values);const bytes=Uint8Array.from(atob(fresh.url.split(',')[1]),c=>c.charCodeAt(0));
   if(bytes.length!==files[i].length||bytes.some((b,j)=>b!==files[i][j]))throw Error('Preview and checkout print rendering differ');
   const bitmap=await createImageBitmap(new Blob([files[i]],{type:'image/jpeg'}));if(bitmap.width!==1200||bitmap.height!==1200)throw Error('Incorrect print dimensions');bitmap.close();
  }
  const id=crypto.randomUUID(),order=validateOrder({id,createdAt:Math.floor(Date.now()/1000),contact:{name:'Local Handy print check',email:'sample@example.com',phone:'0000000000'},locker:{name:'Sample locker',area:'Durban'},consent:true,items:prepared.items},content,true);
  if(order.magnetQty!==18||order.items.some((item,i)=>JSON.stringify(item.values)!==JSON.stringify(basket[i].values)))throw Error('Order details or quantities changed');
  const snapshot=orderRecord(order,true),proofItems=snapshot.items.map(i=>({...i,files:i.files.map(f=>({...f,requestId:id,copies:i.qty}))}));
  savedOrder={id,reference:'LOCAL-HANDY',status:'new',version:0,created:order.createdAt,expires:order.createdAt+1209600,history:[],updates:[],snapshot,proof:{status:'awaiting_approval',revision:1,digest:'local-verification-only',items:proofItems}};
  const archive=await downloadOrderArchive(savedOrder,index=>Promise.resolve(new Response(files[index],{headers:{'content-type':'image/jpeg'}})));
  setZip(URL.createObjectURL(new Blob([archive],{type:'application/zip'})));setState(savedOrder);
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 return <div style={{padding:28,maxWidth:1300,margin:'auto',fontFamily:'DM Sans Variable, sans-serif'}}><h1>Local print verification</h1><p>Synthetic examples only. No orders are submitted and no email is sent.</p><button onClick={run} disabled={busy||!!state}>{busy?'Checking nine designs…':'Run nine-design print check'}</button>{error&&<p role="alert">{error}</p>}{state&&<><p role="status">PASS: all nine designs rendered afresh despite stale previews, 1200 × 1200 JPEGs, exact saved wording, 18 copies using nine files, matching print bytes and a complete private-download archive.</p><a href={zip} download="handy-local-print-check.zip">Download local print check</a><OrderDetail order={state} onChange={async()=>{}}/></>}</div>;
}
createRoot(document.getElementById('root')).render(<App/>);
