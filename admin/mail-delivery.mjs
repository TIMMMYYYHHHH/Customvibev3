const second=value=>Number.isSafeInteger(value)&&value>0;
const purposes=new Set(['owner-notification','customer-receipt','manual-update']);
const labels={
 unconfirmed:{'no-delivery-evidence':'Delivery unconfirmed','provider-accepted':'Delivery unconfirmed'},
 delayed:{'delivery-delayed':'Delivery delayed'},
 delivered:{'server-accepted':'Recipient server accepted','delivery-complaint':'Recipient server accepted'},
 failed:{'delivery-bounced':'Delivery failed: bounced','delivery-failed':'Delivery failed','delivery-suppressed':'Delivery failed: suppressed','delivery-complaint':'Delivery failed'},
 'needs-review':{'delivery-complaint':'Needs review','conflicting-outcomes':'Needs review','evidence-capacity':'Needs review','event-id-conflict':'Needs review'},
};
// Read only the private detail projection. Missing legacy evidence has no outcome.
export function mailDeliveryDetail(projection,purpose,attempt,now){
 if(!Array.isArray(projection)||!purposes.has(purpose)||!second(now))return null;
 const matches=projection.filter(row=>row?.purpose===purpose&&(purpose!=='manual-update'||typeof attempt==='string'&&row.attempt===attempt));
 if(matches.length!==1)return null;
 const row=matches[0],label=Object.hasOwn(labels,row.state||'')&&Object.hasOwn(labels[row.state],row.reason||'')?labels[row.state][row.reason]:null;
 if(!label||typeof row.attempt!=='string'||!row.attempt||typeof row.complaint!=='boolean'||row.reason==='delivery-complaint'&&!row.complaint||!second(row.acceptedAt)||row.acceptedAt>now||!second(row.expiresAt)||row.expiresAt<=now||row.expiresAt<=row.acceptedAt)return null;
 const source=row.reason!=='no-delivery-evidence'&&['webhook','manual-check'].includes(row.source)&&second(row.checkedAt)&&row.checkedAt>=row.acceptedAt&&row.checkedAt<=now?row.source:null;
 const checkedAt=source?row.checkedAt:null;
 const occurredAt=source&&!row.complaint&&row.state!=='needs-review'&&second(row.occurredAt)&&row.occurredAt<=checkedAt?row.occurredAt:null;
 return {label,acceptedAt:row.acceptedAt,complaint:row.complaint,source,checkedAt,occurredAt};
}
