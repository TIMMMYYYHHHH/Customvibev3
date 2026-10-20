import test from 'node:test';
import assert from 'node:assert/strict';
import {removeBasketItem,restoreBasketItem,basketImageSources,mergeBasketDesigns} from '../src/basket-undo.mjs';
const photo={id:'photo-a',src:'blob:original',x:.2,y:.7,zoom:1.8,rotation:90,qty:3,format:'puzzle',gridSize:3};
const puzzle={id:'design-photo-a',sourceId:photo.id,kind:'puzzle',qty:3,gridSize:3,preview:'data:preview',tiles:['data:tile']};
const pack={id:'pack',kind:'alphabet',qty:2,style:'clay',designIds:['a','c'],designQuantities:[4,2]};
const template={id:'template',kind:'business',qty:2,values:{entries:['Local cafe'],qr:{mode:'wifi',network:'Local guest',password:'Synthetic-only',security:'WPA'}}};
test('removal and undo restore exact position, quantity, selection, template, QR and crop references',()=>{
 const basket=[pack,puzzle,template],photos=[photo];
 for(const item of basket){
  const removed=removeBasketItem(basket,photos,item.id);
  assert.equal(removed.basket.length,2);assert.equal(removed.removal.item,item);
  const restored=restoreBasketItem(removed.basket,removed.photos,removed.removal);
  assert.deepEqual(restored.basket,basket);assert.deepEqual(restored.photos,photos);
  assert.equal(restored.basket[basket.indexOf(item)],item);
  assert.equal(restored.photos[0],photo);
 }
 assert.deepEqual(basket,[pack,puzzle,template]);assert.equal(photos[0],photo);
});
test('a shared source photo stays in the studio while another entry needs it',()=>{
 const other={...puzzle,id:'other-copy'};
 const removed=removeBasketItem([puzzle,other],[photo],puzzle.id);
 assert.equal(removed.photos[0],photo);assert.equal(removed.removal.photos.length,0);
 const restored=restoreBasketItem(removed.basket,removed.photos,removed.removal);
 assert.deepEqual(restored.basket,[puzzle,other]);assert.deepEqual(restored.photos,[photo]);
});
test('undo never overwrites newer entries or duplicates a restored identity',()=>{
 const removed=removeBasketItem([pack,puzzle,template],[photo],puzzle.id);
 const changed={...pack,qty:9},extra={id:'new',kind:'thank-you',qty:1};
 const restored=restoreBasketItem([changed,template,extra],removed.photos,removed.removal);
 assert.deepEqual(restored.basket,[changed,puzzle,template,extra]);
 assert.deepEqual(restoreBasketItem(restored.basket,restored.photos,removed.removal),{basket:restored.basket,photos:restored.photos});
});
test('photo regeneration preserves mixed basket positions and appends only new photos',()=>{
 const revised={...puzzle,qty:4},newPhoto={...puzzle,id:'design-b',sourceId:'b'};
 assert.deepEqual(mergeBasketDesigns([pack,puzzle,template],[revised,newPhoto]),[pack,revised,template,newPhoto]);
 assert.deepEqual(mergeBasketDesigns([puzzle,pack,template],[]),[pack,template]);
});
test('image source inventory includes originals and shared reference/preview/tile URLs',()=>{
 assert.deepEqual(new Set(basketImageSources([{...puzzle,preview:'blob:preview',tiles:['blob:tile'],reference:'blob:reference'}],[photo])),new Set(['blob:original','blob:preview','blob:tile','blob:reference']));
});
