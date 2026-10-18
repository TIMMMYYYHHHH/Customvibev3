import {statusLabels} from '../server/order-update-email.mjs';
export function orderGroups(orders){
 const groups=Object.fromEntries(Object.keys(statusLabels).map(stage=>[stage,[]]));for(const order of orders)groups[order.status]?.push(order);
 groups.fulfilled.sort((a,b)=>(b.fulfilledAt||0)-(a.fulfilledAt||0)||b.reference.localeCompare(a.reference));return groups;
}
export function readOrderView(storage){try{return storage.getItem('cv-orders-view')==='table'?'table':'board'}catch{return 'board'}}
export function mergeOrderPage(previous,page,append=false){
 return {orders:append?[...previous.orders,...page.orders.filter(n=>!previous.orders.some(o=>o.id===n.id))]:page.orders,next:page.next,fulfilledCount:page.fulfilledCount||0,fulfilledNext:append?previous.fulfilledNext:page.fulfilledNext,older:append?previous.older:false};
}
