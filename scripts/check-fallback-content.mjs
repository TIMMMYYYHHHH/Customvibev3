// Local validation only. Never writes, repairs or contacts a catalogue service.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {defaultContent,validateContent} from '../src/content/model.mjs';
import {validateStoredContent} from '../server/content.mjs';
import {upgradeCollections} from '../src/designs/products.mjs';

const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const pointer=value=>value.replaceAll('~','~0').replaceAll('/','~1');
function differingPaths(actual,expected,path=''){
 if(isDeepStrictEqual(actual,expected))return [];
 if(!record(actual)||!record(expected))return [path];
 return [...new Set([...Object.keys(actual),...Object.keys(expected)])].sort()
  .flatMap(key=>differingPaths(actual[key],expected[key],path+'/'+pointer(key)));
}

export function inspectFallbackContent(input){
 const errors=[],structuralDrift=[],defaultDifferences=[];
 try{validateContent(input)}catch(error){errors.push('model: '+error.message)}
 if(!errors.length)try{validateStoredContent(input)}catch(error){errors.push('storage: '+error.message)}
 if(!errors.length){
  const products=new Map(input.products.map(p=>[p.id,p]));
  // Existing upgrade rules supply expectations, but their result is never applied.
  for(const expected of upgradeCollections(structuredClone(input.products))){
   const actual=products.get(expected.id);
   if(!actual){structuralDrift.push({id:expected.id,field:'id',expected:expected.id,actual:null});continue}
   for(const field of ['count','pricingMode','printVersion','artworkEdition']){
    if(!isDeepStrictEqual(actual[field],expected[field]))structuralDrift.push({id:actual.id,field,expected:expected[field]??null,actual:actual[field]??null});
   }
  }
  const {products:defaults,...defaultFields}=defaultContent,{products:inputProducts,...inputFields}=input;
  defaultDifferences.push(...differingPaths(inputFields,defaultFields));
  if(!isDeepStrictEqual(inputProducts.map(p=>p.id),defaults.map(p=>p.id)))defaultDifferences.push('/products/order');
  const modelProducts=new Map(defaults.map(p=>[p.id,p]));
  for(const id of [...new Set([...products.keys(),...modelProducts.keys()])].sort()){
   defaultDifferences.push(...differingPaths(products.get(id),modelProducts.get(id),'/products/'+pointer(id)));
  }
 }
 return {valid:errors.length===0&&structuralDrift.length===0,errors,structuralDrift,defaultDifferences:defaultDifferences.sort()};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==2)throw Error('Usage: node scripts/check-fallback-content.mjs');
  let input;try{input=JSON.parse(await readFile(new URL('../data/site-content.json',import.meta.url),'utf8'))}catch{throw Error('Cannot read or parse the committed fallback catalogue')}
  const report=inspectFallbackContent(input);process.stdout.write(JSON.stringify(report,null,2)+'\n');if(!report.valid)process.exitCode=1;
 }catch(error){console.error(error.message);process.exitCode=1}
}
