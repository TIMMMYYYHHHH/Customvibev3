// Local-only fixture. Every application API is synthetic; unexpected requests fail closed.
import React,{StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {SubmissionProvider,useSubmissionSnapshot} from '../../src/FormService';
import {ContentProvider} from '../../src/content/ContentProvider';
import {defaultContent} from '../../src/content/model.mjs';
import Contact from '../../src/storefront/Contact';
import {App} from '../../src/App';
import {Checkout} from '../../src/Checkout';
import {loadImage,makePhoto,renderPhoto} from '../../src/artwork';
import '../../src/shop-base.css';import '../../src/shop.css';import '../../src/studio.css';import '../../src/consistency.css';
if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname))throw Error('Local fixture only');
const params=new URLSearchParams(location.search);
const fixture=window.recoveryFixture={configMode:params.get('config')||'failed',sendMode:'uncertain',reads:0,sends:[],widgets:[],removed:[],uploads:0,releases:[]};
fixture.makeTurnstile=()=>({render(element,options){const id=fixture.widgets.length;fixture.widgets.push(options);queueMicrotask(()=>options.callback('synthetic-'+id));return id;},remove(id){fixture.removed.push(id);}});
if(!params.has('script'))window.turnstile=fixture.makeTurnstile();
const json=value=>Response.json(value);
window.__CV_ADMIN_PREVIEW__=params.has('preview');
window.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'?input:input.url,location.origin);
 if(url.origin!==location.origin)throw Error('External request blocked');
 if(url.pathname==='/content.json')return json(defaultContent);
 if(url.pathname==='/api/season')return json({});
 if(url.pathname==='/api/forms'){
  fixture.reads++;
  if(fixture.configMode==='failed')throw Error('Synthetic offline');
  if(fixture.configMode==='signin')return new Response('<p>Sign in</p>',{status:401,headers:{'Content-Type':'text/html'}});
  if(fixture.configMode==='html')return new Response('<p>Sign in</p>',{headers:{'Content-Type':'text/html'}});
  if(fixture.configMode==='unavailable')return json({available:false});
  if(fixture.configMode==='held')return new Promise(resolve=>{fixture.releases.push(()=>resolve(json({available:false})));});
  return json({available:true,csrf:'synthetic',siteKey:'synthetic',artworkStorage:params.has('private')});
 }
 if(url.pathname==='/api/artwork/init')return json({ok:true,grant:'synthetic-grant',resume:'synthetic-resume'});
 if(url.pathname==='/api/artwork/upload'){fixture.uploads++;return json({ok:true});}
 if(url.pathname==='/api/contact'||url.pathname==='/api/order-request'){
  const body=JSON.parse(options.body);fixture.sends.push(body);
  if(fixture.sendMode==='success')return json({ok:true,reference:'synthetic-reference',receiptSent:true});
  return Response.json({error:'Synthetic uncertain outcome. Keep the same request.',manualReview:fixture.sendMode==='manual'},{status:503});
 }
 throw Error('Unexpected request blocked: '+url.pathname);
};
const source='/assets/brand-icon.png',image=await loadImage(source),photo=makePhoto(source,'Local sample',image.naturalWidth,image.naturalHeight);
photo.rotation=90;photo.zoom=1.25;
const preview=await renderPhoto(photo),basket=[{id:photo.id,sourceId:photo.id,kind:'photo',qty:2,preview:preview.url}];
fixture.photo=photo;
const order=params.has('order');
function State(){const snapshot=useSubmissionSnapshot(order?'order':'contact');fixture.snapshot=snapshot;return <output id="submission-state">{JSON.stringify(snapshot)}</output>;}
function Fixture(){
 const [visible,setVisible]=useState(true),[draft,setDraft]=useState({contact:{name:'Local customer',email:'fixture@example.com',phone:'0821234567'},locker:{name:'Local locker',area:'Durban'},notes:'Keep this order note.'});
 fixture.draft=draft;
 return <><p>Local recovery fixture. No real messages.</p><button onClick={()=>setVisible(value=>!value)}>Toggle form</button><State/>{visible&&(order?<Checkout basket={basket} photos={[photo]} draft={draft} setDraft={setDraft} go={()=>{}}/>:<Contact standalone/>)}</>;
}
createRoot(document.getElementById('root')).render(<StrictMode><ContentProvider>{params.has('app')?<App initialPage={params.get('app')}/>:<SubmissionProvider><Fixture/></SubmissionProvider>}</ContentProvider></StrictMode>);
