// Keep the original version until the server confirms the move or the owner reloads.
// A retry first reads the server so a lost response cannot create a second change.
export function createStageMover(request,onState,onSaved){
 let pending=null,busy=false,conflict=false;
 const report=(state,extra={})=>onState({state,id:pending?.order.id,target:pending?.target,...extra});
 async function run(reconcile=false){
  if(busy||!pending||conflict)return;
  busy=true;report('saving');
  const {order,target}=pending,root='/api/orders/'+order.id;
  try{
   if(reconcile){
    const current=await request(root);
    if(current.version===order.version+1&&current.status===target){onSaved(current);report('saved');pending=null;return;}
    if(current.version!==order.version||current.status!==order.status)throw Object.assign(Error('This order changed elsewhere. Reload it before choosing a stage.'),{status:409});
   }
   await request(root+'/status',{status:target,version:order.version});
   // Read the authoritative state and history, including any subsequent change.
   const current=await request(root);onSaved(current);
   report(current.version===order.version+1&&current.status===target?'saved':'reloaded',{target:current.status});pending=null;
  }catch(error){conflict=error.status===409;report(conflict?'conflict':'error',{message:error.message});}
  finally{busy=false;}
 }
 return {
  move(order,target){if(busy||pending||order.status===target)return Promise.resolve();pending={order:{...order},target};return run();},
  retry(){return run(true);},
  async reload(){if(busy||!pending)return;busy=true;report('saving');try{const current=await request('/api/orders/'+pending.order.id);onSaved(current);report('reloaded');pending=null;conflict=false;}catch(error){report(conflict?'conflict':'error',{message:error.message});}finally{busy=false;}}
 };
}
