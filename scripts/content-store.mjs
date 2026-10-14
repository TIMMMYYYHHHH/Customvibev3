import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {defaultContent,validateContent} from '../src/content/model.mjs';
export function contentStore(file){
 let queue=Promise.resolve();
 const read=async()=>{try{return validateContent(JSON.parse(await readFile(file,'utf8')))}catch(e){if(e.code==='ENOENT')return structuredClone(defaultContent);throw e}};
 const save=content=>{
  const task=queue.then(async()=>{
   validateContent(content);const current=await read();
   if(content.revision!==current.revision){const e=new Error('Content changed in another tab. Reload the saved version before saving again.');e.status=409;throw e;}
   const next={...content,revision:current.revision+1};await mkdir(dirname(file),{recursive:true});
   await writeFile(file+'.tmp',JSON.stringify(next,null,2));await rename(file+'.tmp',file);return next;
  });queue=task.catch(()=>{});return task;
 };
 return {read,save};
}
export function contentPlugin(root){
 const store=contentStore(new URL('./data/site-content.json',root).pathname);
 return {name:'customvibe-local-content',
  configureServer(server){server.middlewares.use(async(req,res,next)=>{
   if(!['/content.json','/api/content'].includes(req.url?.split('?')[0]))return next();
   res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
   try{
    if(req.method==='GET'&&req.url==='/content.json'){res.end(JSON.stringify(await store.read()));return;}
    if(req.method!=='PUT'||req.url!=='/api/content'){res.statusCode=405;res.end(JSON.stringify({error:'Method not allowed.'}));return;}
    const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
    const sameOrigin=req.headers.origin&&new URL(req.headers.origin).host===req.headers.host;
    if(!local||!sameOrigin||req.headers['x-customvibe-admin']!=='1'){res.statusCode=403;res.end(JSON.stringify({error:'Admin saves are available only from this computer’s local prototype.'}));return;}
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>25*1024*1024){const e=new Error('Content is too large. Use smaller images.');e.status=413;throw e;}}
    res.end(JSON.stringify(await store.save(JSON.parse(raw))));
   }catch(e){res.statusCode=e.status||400;res.end(JSON.stringify({error:e.message}));}
  })},
  async generateBundle(){this.emitFile({type:'asset',fileName:'content.json',source:JSON.stringify(await store.read())})}
 };
}
