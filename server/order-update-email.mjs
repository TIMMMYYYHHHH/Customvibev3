export const statusLabels={new:'New request',in_progress:'In progress',ready_to_ship:'Ready to ship',shipped:'Shipped'};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function orderUpdateEmail(order){
 const label=statusLabels[order.status];if(!label)throw Error('Invalid status');
 const subject=`CustomVibe test update ${order.reference}: ${label}`;
 const text=`Hi ${order.snapshot.contact.name},\n\nThis is a gated test update for ${order.reference}.\nThe dashboard stage is now: ${label}.\nMagnet count: ${order.snapshot.magnetQty}.\n\nNo payment has been taken. This is an unpaid test request, not an accepted order. A test stage change does not confirm production, courier booking or dispatch. We will agree the artwork, timing, delivery cost and next steps separately.\n\nCustomVibe`;
 return {from:'CustomVibe <orders@customvibe.co.za>',to:order.snapshot.contact.email,reply_to:'orders@customvibe.co.za',subject,text,html:`<!doctype html><html><body style="font:16px Arial,sans-serif;color:#35233f;background:#fffdf8"><main style="max-width:600px;margin:auto;padding:32px"><h1>${escape(label)}</h1><div style="white-space:pre-wrap;line-height:1.6">${escape(text)}</div></main></body></html>`,version:order.version};
}
