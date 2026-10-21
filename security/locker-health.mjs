// Read only the existing successful refresh marker and the fixed system object.
const key='system/lockers/directory-v1.json',minute=60000;
const unknown=()=>({state:'unknown',reason:'missing_summary'});
export async function inspectLockerSnapshot(env,{now=Date.now(),deadlineMs=2000}={}){
 if(!Number.isSafeInteger(now)||now<=0||!Number.isInteger(deadlineMs)||deadlineMs<1||deadlineMs>2000||!env?.DB||!env.ARTWORK)return unknown();
 let timer,expired=false;
 const read=async()=>{
  try{
   const row=await env.DB.prepare('SELECT updated_at FROM locker_refresh WHERE id=1').first();
   if(expired)return unknown();
   if(!Number.isSafeInteger(row?.updated_at)||row.updated_at<=0)return unknown();
   if(row.updated_at>now)return {state:'unknown',reason:'future_timestamp'};
   const object=await env.ARTWORK.head(key);
   if(expired)return unknown();
   if(object===null)return {state:'critical',reason:'snapshot_missing'};
   if(!Number.isSafeInteger(object?.size)||object.size<1||object.size>3000000)return unknown();
   const age=now-row.updated_at;
   return age>=365*minute?{state:age>=375*minute?'critical':'warning',reason:'snapshot_stale'}:{state:'healthy',reason:'available'};
  }catch{return unknown();}
 };
 try{return await Promise.race([read(),new Promise(resolve=>{timer=setTimeout(()=>{expired=true;resolve(unknown());},deadlineMs);})]);}
 finally{clearTimeout(timer);}
}
