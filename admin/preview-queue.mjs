// Bound background artwork reads. Every request still authenticates and consumes its quota once.
export function createPreviewQueue(limit=2){
 let active=0;const pending=[];
 function drain(){
  while(active<limit&&pending.length){
   const job=pending.shift();job.signal?.removeEventListener('abort',job.cancel);
   if(job.signal?.aborted){job.reject(new DOMException('Cancelled','AbortError'));continue}
   active++;
   Promise.resolve().then(job.task).then(job.resolve,job.reject).finally(()=>{active--;drain()});
  }
 }
 return (task,signal)=>new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException('Cancelled','AbortError'));return}
  const job={task,signal,resolve,reject,cancel(){const index=pending.indexOf(job);if(index!==-1){pending.splice(index,1);reject(new DOMException('Cancelled','AbortError'))}}};
  signal?.addEventListener('abort',job.cancel,{once:true});pending.push(job);drain();
 });
}
export const queueArtworkPreview=createPreviewQueue();
