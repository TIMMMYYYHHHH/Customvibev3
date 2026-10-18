// Recovery keeps component drafts in the open tab. Never persist credentials or replay writes.
export function createSessionRecovery({fetcher=(...args)=>fetch(...args),now=()=>Date.now()}={}){
 let state={status:'active',expiresAt:null},checking=null;const listeners=new Set();
 const set=next=>{state={...state,...next};for(const fn of listeners)fn()};
 function expired(){set({status:'expired'})}
 function observe(data){const recovered=['expired','unavailable','restored'].includes(state.status);set({expiresAt:Number.isFinite(data.expiresAt)?data.expiresAt:null,status:recovered?'restored':'active'});tick()}
 function tick(){if(!state.expiresAt)return;const left=state.expiresAt*1000-now();if(left<=0)expired();else if(left<=60000&&state.status!=='expired')set({status:'expiring'})}
 async function request(path,options){const r=await fetcher(path,options);if(r.status===401){expired();throw Object.assign(Error('Your session expired. Your edits are still in this tab. Sign in using the recovery controls above, then retry.'),{status:401})}return r}
 async function check(){if(checking)return checking;checking=(async()=>{try{const r=await request('/api/session',{cache:'no-store'});if(!r.ok)throw Error('Sign-in check unavailable');const data=await r.json();observe(data);return true}catch(e){if(e.status!==401)set({status:'unavailable'});return false}finally{checking=null}})();return checking}
 return {fetch:request,check,tick,observe,expired,getSnapshot:()=>state,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)}};
}
export const sessionRecovery=createSessionRecovery();
export const adminFetch=(...args)=>sessionRecovery.fetch(...args);
