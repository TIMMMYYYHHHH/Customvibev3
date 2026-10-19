// Display-only derivatives. Never crop, overwrite sources or touch print masters.
// Run with Node 22 and sharp 0.35.5 from the authoring environment (NODE_PATH).
// Normal builds use the checked-in files and do not need sharp.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

const sharp=createRequire(import.meta.url)('sharp');
if(sharp.versions.sharp!=='0.35.5'||sharp.versions.vips!=='8.18.7'||sharp.versions.webp!=='1.6.0'){
 throw new Error('Use sharp 0.35.5, libvips 8.18.7 and libwebp 1.6.0 to reproduce the approved display files.');
}
const check=process.argv.includes('--check');
const root=new URL('../public/assets/cutouts/',import.meta.url);
const output=new URL('display/',root);
const names=['05-sunglasses','02-wedding','03-beach','04-pink-group','01-restaurant'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest={generator:{sharp:sharp.versions.sharp,vips:sharp.versions.vips,webp:sharp.versions.webp,kernel:'lanczos3',quality:94,alphaQuality:100,effort:6},images:[]};
if(!check)await mkdir(output,{recursive:true});
for(const name of names){
 const source=`${name}-square.webp`;
 const original=await readFile(new URL(source,root));
 const metadata=await sharp(original).metadata();
 if(metadata.width!==1254||metadata.height!==1254||!metadata.hasAlpha)throw new Error(`Unexpected source dimensions or alpha: ${source}`);
 const entry={source,sha256:hash(original),width:1254,height:1254,bytes:original.length,variants:[]};
 for(const width of [320,640]){
  // Resize the entire square canvas, preserving its transparent padding and bounds.
  const resized=sharp(original).resize(width,width,{kernel:'lanczos3'});
  const bytes=await resized.clone().webp({quality:94,alphaQuality:100,effort:6}).toBuffer();
  const expectedAlpha=await resized.clone().extractChannel('alpha').raw().toBuffer();
  const actualAlpha=await sharp(bytes).extractChannel('alpha').raw().toBuffer();
  if(!expectedAlpha.equals(actualAlpha))throw new Error(`Alpha changed during WebP encoding: ${source} ${width}`);
  const file=`${name}-square-${width}.webp`;
  if(check){
   if(!bytes.equals(await readFile(new URL(file,output))))throw new Error(`Derivative differs: ${file}`);
  }else await writeFile(new URL(file,output),bytes);
  entry.variants.push({file,width,height:width,bytes:bytes.length,sha256:hash(bytes)});
 }
 if(!original.equals(await readFile(new URL(source,root))))throw new Error(`Source changed: ${source}`);
 manifest.images.push(entry);
}
const json=JSON.stringify(manifest,null,2)+'\n';
if(check){
 if(json!==await readFile(new URL('manifest.json',output),'utf8'))throw new Error('Manifest differs');
}else await writeFile(new URL('manifest.json',output),json);
console.log(`${check?'Verified':'Generated'} 10 display derivatives; alpha and 5 original files preserved.`);
console.log(`Five 320px files: ${manifest.images.reduce((total,image)=>total+image.variants[0].bytes,0)} bytes.`);
