import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {preparePrivateArtwork} from '../src/order-artwork.mjs';
import {validateOrder,artworkManifest} from '../server/submission-model.mjs';import {defaultContent} from '../src/content/model.mjs';
const image='data:image/jpeg;base64,'+readFileSync('tests/fixtures/print-tile.jpg').toString('base64');
test('private puzzle preparation retains full JPEG bytes and provides all tiles plus proof',async()=>{
 const {items,uploads}=await preparePrivateArtwork([{kind:'puzzle',sourceId:'test',gridSize:3,qty:1,preview:image}],[{id:'test'}],async()=>({tiles:Array(9).fill(image)}));
 assert.equal(uploads.length,10);assert.equal(items[0].files.length,10);assert.deepEqual(Buffer.from(uploads[1]),readFileSync('tests/fixtures/print-tile.jpg'));
 const order=validateOrder({id:crypto.randomUUID(),createdAt:Math.floor(Date.now()/1000),contact:{name:'Test',email:'test@example.com',phone:'0821234567'},locker:{name:'Test locker',area:'Durban'},consent:true,items},defaultContent,true);
 assert.equal(order.magnetQty,9);assert.equal(artworkManifest(order)[9].name,'design-01-row-3-col-3.jpg');
});
