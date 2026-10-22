import {withShippingAgreement} from './helpers/shipping.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {preparePrivateArtwork} from '../src/order-artwork.mjs';
import {validateOrder,artworkManifest} from '../server/submission-model.mjs';import {defaultContent} from '../src/content/model.mjs';
const image='data:image/jpeg;base64,'+readFileSync('tests/fixtures/print-tile.jpg').toString('base64');
test('over-capacity orders fail before any print rendering or upload preparation',async()=>{
 let renders=0;
 const render=async()=>{renders++;return {tiles:Array(25).fill(image)}};
 await assert.rejects(()=>preparePrivateArtwork(Array.from({length:3},()=>({kind:'puzzle',sourceId:'test',gridSize:5,qty:5,preview:image})),[{id:'test'}],render),/78 artwork files/);
 assert.equal(renders,0);
});
test('private puzzle preparation retains full JPEG bytes and provides all tiles plus proof',async()=>{
 const {items,uploads}=await preparePrivateArtwork([{kind:'puzzle',sourceId:'test',gridSize:3,qty:1,preview:image}],[{id:'test'}],async()=>({tiles:Array(9).fill(image)}));
 assert.equal(uploads.length,10);assert.equal(items[0].files.length,10);assert.deepEqual(Buffer.from(uploads[1]),readFileSync('tests/fixtures/print-tile.jpg'));
 const order=validateOrder(withShippingAgreement({id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),contact:{name:'Test',email:'test@example.com',phone:'0821234567'},locker:{name:'Test locker',area:'Durban'},consent:true,items},defaultContent),defaultContent,true);
 assert.equal(order.magnetQty,9);assert.equal(artworkManifest(order)[9].name,'design-01-row-3-col-3.jpg');
});

test('125 magnets reuse one puzzle artwork set through preparation and server validation',async()=>{
 const {items,uploads}=await preparePrivateArtwork([{kind:'puzzle',sourceId:'test',gridSize:5,qty:5,preview:image}],[{id:'test'}],async()=>({tiles:Array(25).fill(image)}));
 assert.equal(uploads.length,26);
 const order=validateOrder(withShippingAgreement({id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),contact:{name:'Test',email:'test@example.com',phone:'0821234567'},locker:{name:'Test locker',area:'Durban'},consent:true,items},defaultContent),defaultContent,true);
 assert.equal(order.magnetQty,125);assert.equal(order.subtotalCents,500000);assert.equal(order.items[0].lineCents,500000);
});
