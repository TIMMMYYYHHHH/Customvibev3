import test from 'node:test';import assert from 'node:assert/strict';import {loadImage,releasePhotos} from '../src/artwork.js';
test('completed request releases removed and active originals while keeping public assets cached',async()=>{
 const OriginalImage=globalThis.Image,originalRevoke=URL.revokeObjectURL;const revoked=[];let loads=0;
 globalThis.Image=class{set src(value){loads++;this.onload();}};URL.revokeObjectURL=src=>revoked.push(src);
 try{await loadImage('blob:removed');await loadImage('blob:active');await loadImage('/assets/reusable.png');releasePhotos([{src:'blob:active'}]);assert.deepEqual(new Set(revoked),new Set(['blob:removed','blob:active']));await loadImage('/assets/reusable.png');assert.equal(loads,3);await loadImage('blob:removed');assert.equal(loads,4);}finally{globalThis.Image=OriginalImage;URL.revokeObjectURL=originalRevoke;}
});
