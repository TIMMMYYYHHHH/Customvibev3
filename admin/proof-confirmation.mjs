export function proofConfirmation(action,order){
 const revision=order.proof?.revision||0;
 if(action==='revoke')return {title:'Revoke historical review links?',label:'Revoke links',body:`For ${order.reference}, historical links and sessions for revision ${revision} will be invalidated. Artwork and recorded history stay unchanged. No email is sent.`};
 return {title:revision?'Publish replacement artwork?':'Prepare artwork revision?',label:revision?'Publish replacement':'Prepare artwork',body:`For ${order.reference}, this creates artwork revision ${revision+1}. ${revision?'Previous review links and sessions will be invalidated. ':''}The saved order stage stays the same. No email is sent. Customer design previews take place during designing and checkout. The original artwork expiry date stays the same.`};
}
