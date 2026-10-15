// Local browser fixture only. No provider requests or emails are sent.
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {Checkout} from '../../src/Checkout';import {SubmissionProvider} from '../../src/FormService';import {ContentProvider} from '../../src/content/ContentProvider';import {defaultContent} from '../../src/content/model.mjs';import {loadImage,makePhoto,renderPhoto} from '../../src/artwork';
import '../../src/shop-base.css';import '../../src/shop.css';import '../../src/studio.css';import '../../src/consistency.css';
let count=0,lastId='';
window.turnstile={render:(el,opts)=>{queueMicrotask(()=>opts.callback('simulated-check'));return 1},remove:()=>{}};
window.fetch=async(url,init)=>{
 if(url==='/content.json')return Response.json(defaultContent);
 if(url==='/api/forms')return Response.json({available:true,csrf:'simulated',siteKey:'simulated'});
 if(url==='/api/order-request'){const {payload}=JSON.parse(init.body);count++;document.querySelector('#calls').textContent=`Simulated sends: ${count}. Same reference on retry: ${!lastId||lastId===payload.id}`;
 if(count===1)return Response.json({error:'Simulated validation error. Correct your details.'},{status:400});
 lastId=payload.id;if(count===2)return Response.json({error:'Simulated timeout. Retry this request.'},{status:503});
 return Response.json({ok:true,reference:'CV-'+payload.id,receiptSent:true});}
 throw Error('Unexpected network call blocked by local fixture');
};
const src='/assets/brand-icon.png',img=await loadImage(src),photo=makePhoto(src,'Public sample',img.naturalWidth,img.naturalHeight),preview=await renderPhoto(photo);
const basket=[{id:photo.id,sourceId:photo.id,kind:'photo',qty:1,preview:preview.url}];
function Fixture(){const [visible,setVisible]=useState(true),[draft,setDraft]=useState({contact:{name:'Test customer',email:'test@example.com',phone:'0821234567'},locker:{name:'Test locker',area:'Durban'}});return <><p>Local simulated check. No email is sent.</p><p id="calls">Simulated sends: 0</p><button onClick={()=>setVisible(x=>!x)}>Toggle checkout view</button>{visible&&<div className="shop-shell"><Checkout basket={basket} photos={[photo]} draft={draft} setDraft={setDraft} go={()=>setVisible(false)}/></div>}</>;}
createRoot(document.getElementById('root')).render(<ContentProvider><SubmissionProvider><Fixture/></SubmissionProvider></ContentProvider>);
