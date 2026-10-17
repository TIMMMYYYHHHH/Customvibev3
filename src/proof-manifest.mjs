// Stable face positions shared by the admin editor and trusted proof service.
export function proofRows(snapshot){return snapshot.items.flatMap((item,n)=>{
 const count=item.kind==='puzzle'?item.gridSize**2+1:item.designMode==='assisted'?1:item.faceCount||item.files.length||1;
 return Array.from({length:count},(_,j)=>({key:`${n}-${j}`,item,itemId:item.id||`item-${n+1}`,copies:item.qty*(item.designQuantities?.[j]??1),name:item.files[j]?.name||`design-${String(n+1).padStart(2,'0')}-face-${j+1}.jpg`,proof:item.kind==='puzzle'&&j===0}));
});}
export function reusableProofFiles(order){
 if(order.proof?.revision)return order.proof.items.flatMap(i=>i.files);
 return order.snapshot.items.flatMap(item=>Array.from({length:proofRows({items:[item]}).length},(_,j)=>item.designMode==='assisted'?null:item.files[j]?{...item.files[j],requestId:order.id}:null));
}
