// Memory-only draft identity survives transient failures while this order stays open.
export async function createProofUpload({rows,draft,reusable,version,hash}){
 const files=[],bytes=[],selection=[];
 for(let i=0;i<rows.length;i++){
  const row=rows[i],d=draft[row.key];
  if(d){selection.push({upload:files.length});files.push({name:row.name,proof:row.proof,size:d.bytes.length,sha256:await hash(d.bytes)});bytes.push(d.bytes);}
  else if(reusable[i])selection.push({requestId:reusable[i].requestId,index:reusable[i].index});
  else throw Error('Choose finished artwork for every missing face.');
 }
 return {body:{version,requestId:crypto.randomUUID(),owner:Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''),files,selection},bytes,prepared:false,next:0};
}
export async function submitProofUpload(session,{prepare,upload,publish}){
 if(!session.prepared){await prepare(session.body);session.prepared=true;}
 for(;session.next<session.bytes.length;session.next++)await upload(session.body,session.next,session.bytes[session.next]);
 return publish(session.body);
}
