export function sixMonthsAfter(seconds){
 const date=new Date(seconds*1000),day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+6);
 const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,last));return Math.floor(date.getTime()/1000);
}
export const artworkExpiry=row=>row.artwork_expires??row.expires;
export function retainedSnapshot(snapshot){
 return {...snapshot,items:snapshot.items.map(({files,values,brief,hasReference,...item})=>({...item,files:[]}))};
}
