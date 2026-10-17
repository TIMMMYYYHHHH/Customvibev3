import http from 'node:http';import fs from 'node:fs';
let status='awaiting_approval';
http.createServer(async(req,res)=>{
 if(req.url==='/api/proof/files/0'){res.writeHead(200,{'Content-Type':'image/jpeg'});res.end(fs.readFileSync('tests/fixtures/print-tile.jpg'));return;}
 if(req.url.startsWith('/api/proof')){
  let raw='';for await(const b of req)raw+=b;const body=raw?JSON.parse(raw):{};
  if(req.url==='/api/proof/approve'){if(!body.confirmed){res.writeHead(400);res.end('{}');return;}status='approved';}
  if(req.url==='/api/proof/changes')status='changes_requested';
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(req.method==='GET'?{status,revision:1,digest:'fixture-digest',csrf:'fixture-csrf',expires:Math.floor(Date.now()/1000)+86400,items:[{name:'Business magnet',kind:'business',qty:6,files:[{slot:0,name:'design-01-business-1.jpg',proof:false}]}]}:{ok:true}));return;
 }
 if(req.url.startsWith('/api/')){res.writeHead(403);res.end();return;}
 const upstream=await fetch('http://localhost:5189'+(req.url==='/proof'?'/tests/fixtures/proof-review.html':req.url));res.writeHead(upstream.status,Object.fromEntries([...upstream.headers].filter(([k])=>!['content-length','content-encoding'].includes(k))));res.end(Buffer.from(await upstream.arrayBuffer()));
}).listen(5191,'127.0.0.1');
