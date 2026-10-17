export function previewPath(url){const parsed=new URL(url,'https://preview.invalid');const path=parsed.searchParams.get('page')||'/';return /^\/(?!\/)[a-z0-9/_-]*(?:#[a-z0-9-]+)?$/i.test(path)?path:'/'}
export function previewURL(path){return '/preview?page='+encodeURIComponent(path)}
export function installPreviewRouting(){
 const push=history.pushState.bind(history),replace=history.replaceState.bind(history);
 const convert=url=>{if(url==null)return url;const u=new URL(url,location.href);if(u.origin!==location.origin)throw Error('Preview navigation stays on this website.');return u.pathname==='/preview'?u.href:previewURL(u.pathname+u.hash)};
 history.pushState=(state,title,url)=>push(state,title,convert(url));history.replaceState=(state,title,url)=>replace(state,title,convert(url));
}
