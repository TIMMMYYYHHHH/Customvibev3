// Tab memory only: never persist customer details or artwork to browser storage.
export function createSubmissionState(){
 let snapshot={attempt:null,pending:false,busy:false,result:null,error:'',uncertain:false};
 const listeners=new Set();
 return {getSnapshot:()=>snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},update(patch){snapshot={...snapshot,...patch};for(const fn of listeners)fn();},rejected(status,message){
  const editable=status===400&&!snapshot.uncertain;
  this.update({error:message,...(editable?{attempt:null,pending:false}:{}),uncertain:snapshot.uncertain||status>=500});
 }};
}
