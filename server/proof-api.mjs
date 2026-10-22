export const proofCall=(env,path,body)=>env.AUTH.fetch('https://auth.internal/proofs/'+path,{method:'POST',body:JSON.stringify(body)});
export const proofHash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const fail=(status,error)=>Response.json({error},{status});
export async function proofAPI(request,env){
 if(new URL(request.url).hostname!=='customvibe.co.za')return fail(403,'Private artwork is only available on the live website.');
 return fail(410,'Separate customer artwork approval is no longer required. Contact CustomVibe with your order reference if you need help.');
}
