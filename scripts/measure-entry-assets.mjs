import {readFile} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export async function measureEntryAssets(entry,{root=dirname(resolve(entry))}={}){
 entry=resolve(entry);root=resolve(root);const html=await readFile(entry,'utf8'),queue=[],seen=new Set(),files=[];
 const local=(from,url)=>{if(/^(?:[a-z]+:|\/\/)/i.test(url))return null;const path=resolve(url.startsWith('/')?root:dirname(from),url.replace(/^\//,'').split(/[?#]/)[0]);if(!path.startsWith(root+'/'))throw Error('Asset escapes output directory');return path};
 for(const tag of html.matchAll(/<(?:script|link)\b[^>]*>/g)){
  if(!/^<script\b/.test(tag[0])&&!/rel="(?:stylesheet|modulepreload)"/.test(tag[0]))continue;
  const url=tag[0].match(/(?:src|href)="([^"]+)"/)?.[1];if(url){const path=local(entry,url);if(path)queue.push(path)}
 }
 while(queue.length){const path=queue.shift();if(seen.has(path)||!path.match(/\.(js|css)$/))continue;seen.add(path);const bytes=await readFile(path),kind=path.endsWith('.css')?'css':'js';files.push({path:relative(root,path),kind,raw:bytes.length,gzip:gzipSync(bytes).length,sha256:createHash('sha256').update(bytes).digest('hex')});
  if(kind==='js')for(const match of bytes.toString().matchAll(/\b(?:import|export)\s*(?:[^"'();]*?\bfrom\s*)?["']([^"']+)["']/g)){const dependency=local(path,match[1]);if(dependency)queue.push(dependency)}
 }
 files.sort((a,b)=>a.path.localeCompare(b.path));const totals=kind=>files.filter(f=>f.kind===kind).reduce((sum,f)=>({raw:sum.raw+f.raw,gzip:sum.gzip+f.gzip}),{raw:0,gzip:0});
 const selectedRouteStyles=[...html.matchAll(/<link\b(?=[^>]*\bdata-cv-route-style=)[^>]*\bhref="([^"]+)"[^>]*>/g)].map(match=>relative(root,local(entry,match[1])));
 return {entry,files,selectedRouteStyles,js:totals('js'),css:totals('css'),note:'Local compressed initial asset closure, not live transfer or a runtime performance score.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),rootArg=args.find(arg=>arg.startsWith('--root=')),entries=args.filter(arg=>!arg.startsWith('--root='));console.log(JSON.stringify(await Promise.all((entries.length?entries:['dist/client/index.html','dist/admin/preview.html']).map(entry=>measureEntryAssets(entry,rootArg?{root:rootArg.slice(7)}:{}))),null,2));
}
