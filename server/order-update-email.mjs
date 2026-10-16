export const statusLabels={new:'New request',in_progress:'In progress',ready_to_ship:'Ready to ship',shipped:'Shipped'};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function orderUpdateEmail(order){
 const label=statusLabels[order.status];if(!label)throw Error('Invalid status');
 const subject=`CustomVibe update ${order.reference}: ${label}`;
 const messages={new:'We have received your magnet request and will review your artwork and delivery details.',in_progress:'We are working on your magnets.',ready_to_ship:'Your magnets are ready to ship. We will let you know when they have been dispatched.',shipped:'Your magnets have been dispatched. Please contact us if you need help with your delivery.'};
 const text=`Hi ${order.snapshot.contact.name},\n\n${messages[order.status]}\n\nReference: ${order.reference}\nStatus: ${label}\nMagnet count: ${order.snapshot.magnetQty}.\n\nNo payment has been taken through the website. Reply to this email if you have any questions.\n\nCustomVibe`;
 return {from:'CustomVibe <orders@customvibe.co.za>',to:order.snapshot.contact.email,reply_to:'orders@customvibe.co.za',subject,text,html:`<!doctype html><html><body style="font:16px Arial,sans-serif;color:#35233f;background:#fffdf8"><main style="max-width:600px;margin:auto;padding:32px"><h1>${escape(label)}</h1><div style="white-space:pre-wrap;line-height:1.6">${escape(text)}</div></main></body></html>`,version:order.version};
}
