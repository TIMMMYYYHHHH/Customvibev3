// Tab memory only: never persist customer details or artwork to browser storage.
export function createSubmissionState(){
 const empty=()=>({attempt:null,pending:false,busy:false,result:null,error:'',uncertain:false,manualReview:false,uploads:null,resume:null});
 let snapshot=empty();
 const listeners=new Set();
 return {resetCompleted(){if(!snapshot.result?.ok||snapshot.busy)return false;this.update(empty());return true;},getSnapshot:()=>snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},update(patch){snapshot={...snapshot,...patch};for(const fn of listeners)fn();},rejected(status,message){
  const editable=status===400&&!snapshot.uncertain;
  this.update({error:message,...(editable?{attempt:null,pending:false}:{}),uncertain:snapshot.uncertain||status>=500});
 }};
}
