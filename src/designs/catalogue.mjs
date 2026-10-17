import {collectionLabels} from './artwork.mjs';
export const packIds=['alphabet','counting','words','colours','reminders','thanks'];
// Versioned print masters. All faces are rendered from these same definitions for previews and orders.
export function collectionDesigns(id){
 const entries=id==='alphabet'?[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(title=>({title})):id==='counting'?Array.from({length:10},(_,i)=>({number:i+1})):collectionLabels(id).map(title=>({title}));
 return (entries||[]).map((values,i)=>({id:`${id}-${i+1}`,version:1,template:id,values:{...values,colour:['mint','lilac','peach','cream'][i%4]}}));
}
