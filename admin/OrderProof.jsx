import React from 'react';

const labels={awaiting_design:'Submitted artwork',prepared:'Prepared artwork',awaiting_approval:'Prepared artwork',changes_requested:'Historical change request',approved:'Prepared artwork'};

export default function OrderProof({order}){
 return <section className="cv-proof">
  <h2>Artwork information</h2>
  <strong>{labels[order.proof?.status]||'Submitted artwork'}{order.proof?.revision?` · Revision ${order.proof.revision}`:''}</strong>
  <p>Check crop and source quality before production.</p>
  {order.proof?.events?.filter(e=>e.kind==='changes').map((e,i)=><p key={i}><strong>Revision {e.revision} changes:</strong> {e.message}</p>)}
  {order.snapshot.items.filter(i=>i.brief).map(i=><p key={i.id}><strong>{i.name} brief:</strong> {i.brief}</p>)}
 </section>;
}
