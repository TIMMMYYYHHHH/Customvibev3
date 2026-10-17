// LOCAL ONLY: no public deployment, credentials, production bindings or email code.
import {artworkService} from '../../security/artwork.mjs';
export default {async fetch(request, env) {
  let statements=0,calls=0,reads=0,writes=0;
  const originals=new WeakMap();
  function wrap(statement) {
    const proxy={bind(...args){return wrap(statement.bind(...args));}};
    for(const method of ['first','all','run','raw']) proxy[method]=(...args)=>{statements++;calls++;return statement[method](...args);};
    originals.set(proxy,statement);return proxy;
  }
  const DB={prepare:sql=>wrap(env.DB.prepare(sql)),batch:items=>{statements+=items.length;calls++;return env.DB.batch(items.map(item=>originals.get(item)));}};
  const ARTWORK={put:(...args)=>{writes++;return env.ARTWORK.put(...args);},get:(...args)=>{reads++;return env.ARTWORK.get(...args);},delete:(...args)=>env.ARTWORK.delete(...args)};
  const response=await artworkService(request,{DB,ARTWORK});
  const headers=new Headers(response.headers);
  headers.set('X-Local-Measurement',JSON.stringify({statements,calls,reads,writes}));
  return new Response(response.body,{status:response.status,headers});
}};
