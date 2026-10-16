import React,{useEffect,useRef,useState} from 'react';
import {Plus,Minus} from '@phosphor-icons/react';
import StageSelect from './StageSelect';
import StageFeedback from './StageFeedback';
import {createStageMover} from './stage-move.mjs';
import {api} from './api.mjs';
import OrderDetail from './OrderDetail';
import {statusLabels} from '../server/order-update-email.mjs';
import './orders.css';
const stages=Object.entries(statusLabels).map(([value,label])=>({value,label}));
function OrderCard({order,locked,onMove,onDrag,onDragEnd}){
 const [target,setTarget]=useState(order.status),[expanded,setExpanded]=useState(false);
 useEffect(()=>setTarget(order.status),[order.status]);
 return <article className="cv-order-card" draggable={!locked} onDragStart={event=>{if(event.target.closest('button,[role=combobox],.cv-card-email')){event.preventDefault();return}event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',order.id);onDrag(order.id)}} onDragEnd={onDragEnd} aria-label={`${order.reference}, ${order.snapshot.contact.name}`}>
  <a className="cv-order-open" draggable={!locked} href={'/orders?order='+order.id}><div className="cv-card-meta"><span className="cv-reference">{order.reference}</span><span className="cv-unpaid">Unpaid</span></div><h3>{order.snapshot.contact.name}</h3><strong>{order.snapshot.magnetQty} {order.snapshot.magnetQty===1?'magnet':'magnets'}</strong><footer><time dateTime={new Date(order.created*1000).toISOString()}>{new Date(order.created*1000).toLocaleDateString('en-ZA',{day:'numeric',month:'short'})}</time><span>Open request</span></footer></a>
  {(!order.ownerSent||!order.receiptSent)&&<small className="cv-email-note">Email delivery needs checking</small>}
  <a className="cv-card-email" draggable={false} href={'/orders?order='+order.id+'#customer-update'} aria-label={'Email update for '+order.reference} aria-disabled={locked||undefined} tabIndex={locked?-1:undefined} onClick={event=>{if(locked)event.preventDefault()}}>Email update <span aria-hidden="true">›</span></a>
  <button className="cv-card-move" type="button" aria-expanded={expanded} disabled={locked} onClick={()=>setExpanded(!expanded)}>Move request <span aria-hidden="true">{expanded?<Minus size={18}/>:<Plus size={18}/>}</span></button>
  {expanded&&<div className="cv-card-move-controls"><StageSelect label={'Move '+order.reference+' to'} value={target} onChange={setTarget} disabled={locked} options={stages}/><button className="cv-btn" type="button" disabled={locked||target===order.status} onClick={()=>{onMove(order,target);setExpanded(false)}}>Save stage</button></div>}
 </article>;
}
export default function Orders(){
 const [orders,setOrders]=useState([]),[order,setOrder]=useState(null),[next,setNext]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(true),[query,setQuery]=useState(''),[stage,setStage]=useState('all'),[moveState,setMoveState]=useState(null),[dragging,setDragging]=useState(null),[over,setOver]=useState(null);
 const generation=useRef(0),mover=useRef(null);
 if(!mover.current)mover.current=createStageMover(api,setMoveState,updated=>setOrders(old=>old.map(item=>item.id===updated.id?updated:item)));
 const locked=busy||['saving','error','conflict'].includes(moveState?.state);
 const id=new URLSearchParams(location.search).get('order');
 async function load(before){const g=++generation.current;setBusy(true);setError('');try{if(id){const result=await api('/api/orders/'+id);if(g===generation.current)setOrder(result)}else{const result=await api('/api/orders'+(before?'?before='+before:''));if(g===generation.current){setOrders(old=>before?[...old,...result.orders.filter(n=>!old.some(o=>o.id===n.id))]:result.orders);setNext(result.next)}}}catch(e){if(g===generation.current){setError(e.message);if(e.message.includes('session expired')){setOrder(null);setOrders([])}}}finally{if(g===generation.current)setBusy(false)}}
 useEffect(()=>{load();return()=>{generation.current++}},[id]);
 useEffect(()=>{const check=setInterval(async()=>{try{await api('/api/session')}catch(e){generation.current++;setOrder(null);setOrders([]);setError(e.message);setBusy(false)}},60000);return()=>clearInterval(check)},[]);
 function drop(event,target){event.preventDefault();const dropped=orders.find(item=>item.id===dragging&&item.id===event.dataTransfer.getData('text/plain'));setDragging(null);setOver(null);if(dropped&&!locked)mover.current.move(dropped,target);}
 if(id)return <main className="cv-orders">{error?<div role="alert" className="cv-error">{error} <a href={'/orders?order='+id}>Sign in or reload</a></div>:order?<OrderDetail key={order.id} order={order} onChange={load}/>:<p role="status">Loading request…</p>}</main>;
 const filtered=orders.filter(o=>(o.reference+' '+o.snapshot.contact.name).toLowerCase().includes(query.toLowerCase()));
 return <main className="cv-orders"><div className="cv-page-heading"><div><p className="cv-eyebrow">FROM REQUEST TO LITTLE JOYS</p><h1>Your order <span>workroom.</span></h1><p>A little care at every step.</p></div><button className="cv-btn secondary" disabled={locked} onClick={()=>load()}>{busy?'Loading…':'Refresh requests'}</button></div><div className="cv-board-tools"><label>Find a request<input type="search" placeholder="Name or reference" value={query} onChange={e=>setQuery(e.target.value)}/></label><StageSelect label="Show stage" value={stage} onChange={setStage} options={[{value:'all',label:'All stages'},...stages]}/><p>{orders.length} loaded · Unpaid requests</p></div><p className="cv-board-help">Drag a card to its next stage, or choose <strong>Move request</strong>. Stage changes never send email. Choose <strong>Email update</strong> to review and send a customer message.</p>{error&&<div role="alert" className="cv-error">{error} <a href="/orders">Sign in or reload</a></div>}<StageFeedback state={moveState} mover={mover.current}/>
 <div className="cv-board">{stages.filter(({value})=>stage==='all'||stage===value).map(({value:s,label})=><section className={'cv-column stage-'+s+(over===s?' is-drop-target':'')+(dragging?' is-dragging':'')} key={s} aria-label={label} onDragOver={event=>{if(dragging&&!locked){event.preventDefault();event.dataTransfer.dropEffect='move';setOver(s)}}} onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOver(null)}} onDrop={event=>drop(event,s)}><h2><span/>{label}<small>{filtered.filter(o=>o.status===s).length}</small></h2><div className="cv-column-body">{filtered.filter(o=>o.status===s).map(o=><OrderCard key={o.id} order={o} locked={locked} onMove={(item,target)=>mover.current.move(item,target)} onDrag={setDragging} onDragEnd={()=>{setDragging(null);setOver(null)}}/>)}{!filtered.some(o=>o.status===s)&&<p className="cv-empty">{busy?'Loading…':dragging?'Drop request here':'No requests here yet.'}</p>}</div></section>)}</div>{next&&<button className="cv-btn secondary" disabled={locked} onClick={()=>load(next)}>Load older requests</button>}<p className="cv-board-foot">Open a request for artwork, print quantities, activity and manual customer updates.</p></main>;
}
