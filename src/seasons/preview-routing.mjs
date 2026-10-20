import {millis} from './time.mjs';
export function previewPath(url){const parsed=new URL(url,'https://preview.invalid');const path=parsed.searchParams.get('page')||'/';return /^\/(?!\/)[a-z0-9/_-]*(?:#[a-z0-9-]+)?$/i.test(path)?path:'/'}
export function previewURL(path){return '/preview?page='+encodeURIComponent(path)}
export function installPreviewRouting(){
 const push=history.pushState.bind(history),replace=history.replaceState.bind(history);
 const convert=url=>{
  if(url==null)return url;const u=new URL(url,location.href);if(u.origin!==location.origin)throw Error('Preview navigation stays on this website.');
  if(u.pathname==='/preview')return u.href;
  const at=new URLSearchParams(location.search).getAll('at');
  return previewURL(u.pathname+u.hash)+(at.length===1&&Number.isFinite(millis(at[0]))?'&at='+encodeURIComponent(at[0]):'');
 };
 history.pushState=(state,title,url)=>push(state,title,convert(url));history.replaceState=(state,title,url)=>replace(state,title,convert(url));
}
