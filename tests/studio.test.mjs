import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudio,studioReducer,mergeStudioItems,createDesignItems} from '../src/studio-state.mjs';
import {summarize} from '../src/commerce.mjs';
const photo={id:'coast',src:'coast.jpg',name:'Coast',x:.2,y:.7,zoom:1.8,rotation:90,qty:2,gridSize:5,format:'photo'};
test('designer opens directly without a separate upload stage',()=>{
 const s=createStudio();assert.equal(s.step,'make');
});
test('changing one photo to a puzzle leaves every other photo and crop untouched',()=>{
 let s=studioReducer(createStudio(),{type:'photos',value:[photo,{...photo,id:'friends'}]});
 s=studioReducer(s,{type:'update-photo',id:'coast',patch:{format:'puzzle',gridSize:3}});
 assert.equal(s.photos[0].format,'puzzle');assert.equal(s.photos[1].format,'photo');
 assert.equal(s.photos[0].zoom,1.8);assert.equal(s.photos[0].rotation,90);
 s=studioReducer(s,{type:'settings',patch:{selected:'friends'}});
 assert.equal(s.photos[0].gridSize,3);assert.deepEqual(s.photos[1],{...photo,id:'friends'});
});
test('removing all photos keeps the empty designer available',()=>{
 let s=studioReducer(createStudio(),{type:'photos',value:[photo,{...photo,id:'friends'}]});
 s=studioReducer(s,{type:'photos',value:ps=>ps.filter(p=>p.id!=='coast')});assert.equal(s.selected,'friends');
 s=studioReducer(s,{type:'photos',value:[]});assert.equal(s.step,'make');assert.equal(s.selected,null);
});
test('mixed review renders every photo using its own format, grid and quantity',async()=>{
 const calls=[];const render=async(p,options)=>{calls.push([p.id,options]);return {url:`preview-${p.id}`,tiles:options.puzzle?Array(options.gridSize**2).fill('tile'):[]};};
 const items=await createDesignItems([photo,{...photo,id:'friends',format:'puzzle',qty:1,gridSize:3}],render);
 assert.deepEqual(calls,[['coast',{puzzle:false,gridSize:5}],['friends',{puzzle:true,gridSize:3}]]);
 assert.equal(items[0].kind,'photo');assert.equal(items[1].kind,'puzzle');assert.equal(items[1].sourceId,'friends');
 assert.equal(summarize(items).magnetQty,11);assert.equal(summarize(items).photoQty,2);assert.equal(summarize(items).pricedQty,11);assert.equal(summarize(items).knownCents,44000);
});
test('revising a format replaces the old design and preserves premade packs',()=>{
 const pack={id:'abc',kind:'alphabet',qty:1};
 const old={id:'design-coast',sourceId:'coast',kind:'photo',qty:2};
 const next={...old,kind:'puzzle',gridSize:3,qty:1};
 assert.deepEqual(mergeStudioItems([old,pack],[next]),[pack,next]);
 assert.deepEqual(mergeStudioItems([old,pack],[]),[pack]);
});
