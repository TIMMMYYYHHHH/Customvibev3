import test from 'node:test';
import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import {collectionDesigns} from '../src/designs/catalogue.mjs';
import {validateTemplate,qrPayload,qrMatrix} from '../src/designs/templates.mjs';
test('complete print masters cover every advertised pack face',()=>{
 assert.deepEqual(collectionDesigns('alphabet').map(d=>d.values.title),[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']);
 assert.deepEqual(collectionDesigns('counting').map(d=>d.values.number),Array.from({length:10},(_,i)=>i+1));
 for(const kind of ['words','colours','reminders','thanks'])assert.equal(collectionDesigns(kind).length,4);
 assert.equal(new Set(collectionDesigns('alphabet').map(d=>d.id)).size,26);
 assert.ok(collectionDesigns('alphabet').every(d=>d.version===1));
});
test('template validation preserves readable Unicode and rejects overflow and unsafe links',()=>{
 assert.equal(validateTemplate('business',{title:'Adéle & Co',details:'Call 012 345 6789'}).title,'Adéle & Co');
 assert.throws(()=>validateTemplate('business',{title:'a'.repeat(45),details:'Call us'}),/title/i);
 assert.throws(()=>validateTemplate('qr',{title:'Scan me',url:'javascript:alert(1)'}),/link/i);
 assert.throws(()=>validateTemplate('qr',{title:'Scan me',url:'https://user:password@example.com'}),/link/i);
 assert.throws(()=>validateTemplate('information',{title:'Contacts',details:'a'.repeat(241)}),/details/i);
});
test('Wi-Fi QR escapes punctuation without trimming passwords',()=>{
 const v=validateTemplate('wifi',{title:'Guest Wi-Fi',network:'Guest;Room:1',password:' p\\a;s:s ',security:'WPA'});
 assert.equal(v.password,' p\\a;s:s ');
 assert.equal(qrPayload('wifi',v),'WIFI:T:WPA;S:Guest\\;Room\\:1;P: p\\\\a\\;s\\:s ;;');
});
test('QR matrices decode to exact intended payload with four-module quiet zone',()=>{
 for(const [id,values] of [['qr',{title:'Scan',url:'https://example.com/menu'}],['wifi',{title:'Wi-Fi',network:'Guest;Room:1',password:' pass;word ',security:'WPA'}]]){
  const v=validateTemplate(id,values),payload=qrPayload(id,v),matrix=qrMatrix(payload),scale=8,size=(matrix.size+8)*scale;
  const rgba=new Uint8ClampedArray(size*size*4).fill(255);
  for(let y=0;y<matrix.size;y++)for(let x=0;x<matrix.size;x++)if(matrix.data[y*matrix.size+x])for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){const i=(((y+4)*scale+dy)*size+(x+4)*scale+dx)*4;rgba[i]=rgba[i+1]=rgba[i+2]=0;}
  assert.equal(jsQR(rgba,size,size)?.data,payload);
 }
});
