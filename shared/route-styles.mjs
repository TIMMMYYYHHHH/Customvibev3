// Build metadata and document composition only. No filesystem, network or customer state.
const keys=['editor','handy','business','basket','checkout'];
const safeHref=value=>typeof value==='string'&&/^\/assets\/[a-zA-Z0-9_-]+\.css$/.test(value);
export function validateRouteStyles(value){
 if(!value||value.version!==1||Object.keys(value).length!==6)throw Error('Invalid route stylesheet catalogue.');
 for(const key of keys){const paths=value[key];if(!Array.isArray(paths)||paths.some(path=>!safeHref(path))||new Set(paths).size!==paths.length||(key==='checkout'?!paths.length:paths.length))throw Error('Invalid route stylesheet catalogue.');}
 return value;
}
export function routeStyleCatalogue(manifest,entry){
 const collect=start=>{const seen=new Set(),visiting=new Set(),css=[];function walk(key){
  if(visiting.has(key))throw Error('Cyclic route stylesheet manifest.');if(seen.has(key))return;
  const node=manifest?.[key];if(!node)throw Error('Missing route stylesheet manifest entry: '+key);
  visiting.add(key);for(const dependency of node.imports||[])walk(dependency);
  for(const file of node.css||[]){const href='/'+file;if(!safeHref(href))throw Error('Unsafe route stylesheet path.');if(!css.includes(href))css.push(href)}
  visiting.delete(key);seen.add(key);
 }walk(start);return css};
 const eager=new Set(collect(entry)),checkout=collect('src/Checkout.jsx').filter(path=>!eager.has(path));
 return validateRouteStyles({version:1,editor:[],handy:[],business:[],basket:[],checkout});
}
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function composeRouteStyles(template,catalogue,path){
 validateRouteStyles(catalogue);
 const clean=template.replace(/<link\b(?=[^>]*\bdata-cv-route-style=)[^>]*>\s*/gi,'').replace(/<meta\b(?=[^>]*\bname=["']cv-route-styles["'])[^>]*>\s*/gi,'');
 const links=(path.split('#')[0].replace(/\/$/,'')==='/checkout'?catalogue.checkout:[]).map(href=>`<link rel="stylesheet" data-cv-route-style="checkout" href="${href}">`).join('');
 const fragment=`<meta name="cv-route-styles" content="${escape(JSON.stringify(catalogue))}">${links}`;
 const anchor=/<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*>/i;
 if(!anchor.test(clean))throw Error('Missing common stylesheet anchor.');
 return clean.replace(anchor,tag=>fragment+tag);
}
