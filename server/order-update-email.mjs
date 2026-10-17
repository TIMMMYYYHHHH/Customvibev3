import {emailLayout,escapeHTML,paragraph,note,details,row,signoff,unpaid} from './email-layout.mjs';
export const statusLabels={new:'New order',in_progress:'In progress',ready_to_ship:'Ready to ship',shipped:'Shipped'};
const copy={
 new:['We have your order.','We have received your magnet order and will check your artwork and delivery details.','We will check your artwork and keep you updated as your magnets take shape.'],
 in_progress:['Your magnets are in progress.','We are working on your magnets.','We will let you know when your magnets are ready to ship.'],
 ready_to_ship:['Your magnets are ready to ship.','Your magnets are ready to ship.','We will let you know when they have been dispatched.'],
 shipped:['Your magnets have been dispatched.','Your magnets have been dispatched.','Reply to this email if you need help with your delivery.']
};
export function orderUpdateEmail(order){
 const label=statusLabels[order.status];if(!label)throw Error('Invalid status');
 const [heading,message,next]=copy[order.status],subject=`CustomVibe update ${order.reference}: ${label}`;
 const footer='Questions about your magnets? Reply to this email and include your order reference.';
 const text=`Hi ${order.snapshot.contact.name},\n\n${message}\n\nReference: ${order.reference}\nCurrent stage: ${label}\nMagnet count: ${order.snapshot.magnetQty}\n\n${next}\n\n${unpaid}\n\n${footer}\n\n${signoff}\nCustomVibe`;
 const design=emailLayout({subject,preheader:message,kind:order.status,heading,label:'Customer update',reference:order.reference,body:paragraph(`Hi ${order.snapshot.contact.name},`)+paragraph(message)+details(row('Current stage',label)+row('Magnet count',order.snapshot.magnetQty))+note('What happens next',next)+paragraph(unpaid),footer});
 return {from:'CustomVibe <orders@customvibe.co.za>',to:order.snapshot.contact.email,reply_to:'orders@customvibe.co.za',subject,text,...design,version:order.version};
}

export function proofUpdateEmail(order,token){
 if(!/^[a-f0-9]{64}$/.test(token)||order.proof?.status!=='awaiting_approval')throw Error('Proof is not ready');
 const url='https://customvibe.co.za/proof#'+token,subject=`Review your CustomVibe designs ${order.reference}`,message=`Your magnet designs are ready to review. Please check every design and quantity in revision ${order.proof.revision}, then approve it for printing or request changes.`,footer='Your link is private and expires with your artwork. Use the website access password if prompted. If the link is no longer available, reply to us for help.';
 const text=`Hi ${order.snapshot.contact.name},\n\n${message}\n\nReview your designs: ${url}\n\n${unpaid}\n\n${footer}\n\n${signoff}\nCustomVibe`;
 const design=emailLayout({subject,preheader:'Your approval is needed before printing.',kind:'new',heading:'A little look before we print.',label:'Design approval',reference:order.reference,body:paragraph(`Hi ${order.snapshot.contact.name},`)+paragraph(message)+`<p><a href="${escapeHTML(url)}" style="display:inline-block;background:#ae2e5b;color:#fff;padding:16px 24px;border-radius:8px;text-decoration:none">Review your designs</a></p>`+paragraph(unpaid),footer});
 return {from:'CustomVibe <orders@customvibe.co.za>',to:order.snapshot.contact.email,reply_to:'orders@customvibe.co.za',subject,text,...design,version:order.version};
}
