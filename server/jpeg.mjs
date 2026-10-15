const invalid=()=>{throw new Error('Invalid JPEG')};
export function validateJpeg(content,proof=false,maxLength=1400000){
 let binary;
 if(typeof content==='string'){if(content.length>maxLength||content.length%4)invalid();try{binary=Uint8Array.from(atob(content),c=>c.charCodeAt(0))}catch{invalid()}}else{if(!(content instanceof Uint8Array)||content.length>maxLength)invalid();binary=content}
 const byte=i=>binary[i];
 if(binary.length<20||byte(0)!==255||byte(1)!==216||byte(binary.length-2)!==255||byte(binary.length-1)!==217)invalid();
 let at=2,dimensions=false,components=0;const quant=new Set(),huffman=new Set(),componentTables=new Map();
 while(at<binary.length-2){
  if(byte(at)!==255)invalid();const marker=byte(at+1),length=(byte(at+2)<<8)|byte(at+3),end=at+2+length;
  if(length<2||end>binary.length-2)invalid();
  // Only the baseline JPEG structure emitted by our canvas exporter is supported.
  // Reject EXIF, comments, arbitrary application segments and progressive scans.
  if(![224,219,196,192,218,221].includes(marker))invalid();
  if(marker===224&&(![74,70,73,70,0].every((v,i)=>byte(at+4+i)===v)||length!==16))invalid();
  if(marker===219){let p=at+4;if(p===end)invalid();while(p<end){const table=byte(p++);if(table>3||p+64>end)invalid();for(let i=0;i<64;i++)if(byte(p++)===0)invalid();quant.add(table);}if(p!==end)invalid();}
  if(marker===196){let p=at+4;if(p===end)invalid();while(p<end){const table=byte(p++);if(![0,1,2,3,16,17,18,19].includes(table)||p+16>end)invalid();let count=0,slots=1;for(let i=0;i<16;i++){const n=byte(p++);count+=n;slots=slots*2-n;if(slots<0)invalid();}if(!count||count>256||p+count>end)invalid();p+=count;huffman.add(table);}if(p!==end)invalid();}
  if(marker===192){const h=(byte(at+5)<<8)|byte(at+6),w=(byte(at+7)<<8)|byte(at+8);components=byte(at+9);if(dimensions||byte(at+4)!==8||![1,3].includes(components)||length!==8+3*components||w!==h||w<1||(proof?w>2600:w!==1200))invalid();for(let p=at+10;p<end;p+=3){const id=byte(p),sampling=byte(p+1),table=byte(p+2);if(componentTables.has(id)||!(sampling>>4)||(sampling>>4)>4||!(sampling&15)||(sampling&15)>4||table>3)invalid();componentTables.set(id,table);}dimensions=true;}
  if(marker===221&&length!==4)invalid();
  if(marker===218){
   if(!dimensions||!quant.size||!huffman.size||byte(at+4)!==components||length!==6+2*components||byte(end-3)!==0||byte(end-2)!==63||byte(end-1)!==0)invalid();
   const selected=new Set();for(let p=at+5;p<end-3;p+=2){const id=byte(p),tables=byte(p+1);if(selected.has(id)||!componentTables.has(id)||!quant.has(componentTables.get(id))||!huffman.has(tables>>4)||!huffman.has(16+(tables&15)))invalid();selected.add(id);}
   let p=end,hasData=false;
   while(p<binary.length){const next=binary.indexOf(255,p);if(next<0)invalid();if(next>p)hasData=true;const code=byte(next+1);
    if(code===0){hasData=true;p=next+2;continue;}
    if(code>=208&&code<=215){p=next+2;continue;}
    if(code===217&&next===binary.length-2&&hasData)return content;
    invalid();
   }
   invalid();
  }
  at=end;
 }
 invalid();
}
