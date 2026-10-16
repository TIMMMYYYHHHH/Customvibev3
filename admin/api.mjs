export async function api(path,body){
 const options={cache:'no-store'};
 if(body!==undefined){const s=await fetch('/api/session',{cache:'no-store'});if(!s.ok)throw Error('Your session expired. Sign in again.');const {csrf}=await s.json();Object.assign(options,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(body)});}
 const r=await fetch(path,options);if(r.status===401)throw Error('Your session expired. Sign in again.');let data;try{data=await r.json()}catch{throw Error('Could not load this request. Try refreshing.')}if(!r.ok)throw Object.assign(Error(data.error||'Something went wrong. Try refreshing.'),{status:r.status});return data;
}
