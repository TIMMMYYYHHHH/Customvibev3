// Synthetic local fixture only. No customer records, artwork or live service access.
import React from 'react';
import {createRoot} from 'react-dom/client';
import OrderDetail from '../../admin/OrderDetail';
import '../../src/fonts.css';
import '../../admin/admin-shell.css';
import '../../admin/orders.css';
import '../../admin/workroom.css';
const now=Math.floor(Date.now()/1000),acceptedAt=now-1800;
const base={acceptedAt,expiresAt:now+3600,complaint:false,source:'webhook',checkedAt:now-300,occurredAt:now-600};
const fixture={id:'11111111-1111-4111-8111-111111111111',reference:'CV-SYNTHETIC',version:2,status:'new',expires:now+86400,artworkExpires:now+3600,ownerSent:true,receiptSent:true,history:[{version:2,status:'new',created:now-60}],updates:[{attempt:'synthetic-manual',version:1,status:'in_progress',state:'accepted',acceptedAt,updated:acceptedAt}],mailDelivery:[{...base,purpose:'owner-notification',attempt:'synthetic-owner',state:'delivered',reason:'server-accepted'},{...base,purpose:'customer-receipt',attempt:'synthetic-receipt',state:'delayed',reason:'delivery-delayed'},{...base,purpose:'manual-update',attempt:'synthetic-manual',state:'failed',reason:'delivery-complaint',complaint:true,occurredAt:null}],snapshot:{contact:{name:'Synthetic fixture only',email:'synthetic@example.invalid',phone:'0000000000'},locker:{name:'Synthetic locker',area:'Fixture'},magnetQty:2,subtotalCents:100,items:[{name:'Synthetic magnet',qty:2,files:[]}]}};
const state=new URLSearchParams(location.search).get('case');
if(state==='expired')fixture.mailDelivery.forEach(row=>row.expiresAt=now);
if(state==='legacy')delete fixture.mailDelivery;
if(state==='unconfirmed')fixture.mailDelivery=fixture.mailDelivery.map(row=>({...row,state:'unconfirmed',reason:'no-delivery-evidence',complaint:false,source:null,checkedAt:null,occurredAt:null}));
if(state==='review')fixture.mailDelivery=fixture.mailDelivery.map(row=>({...row,state:'needs-review',reason:'conflicting-outcomes',occurredAt:null}));
if(state==='manual-untimed')fixture.mailDelivery=fixture.mailDelivery.map(row=>({...row,source:'manual-check',occurredAt:null}));
window.syntheticOrder=fixture;
createRoot(document.getElementById('root')).render(<div className="cv-admin admin-workroom"><main id="admin-main" className="cv-orders"><p className="cv-note">Synthetic local fixture. No real customer data.</p><OrderDetail order={fixture} onChange={async()=>{}}/></main></div>);
