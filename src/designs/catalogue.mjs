export const packIds=['alphabet','counting','words','colours','reminders','thanks'];
const messages={words:['apple','tree','sun','cat'],colours:['green','blue','pink','orange'],reminders:['You’ve got this','One thing at a time','Good things ahead','Make room for joy'],thanks:['Thank you','My favourite human','You are loved','Best day ever']};
// Versioned print masters. All faces are rendered from these same definitions for previews and orders.
export function collectionDesigns(id){
 const entries=id==='alphabet'?[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(title=>({title})):id==='counting'?Array.from({length:10},(_,i)=>({number:i+1})):messages[id]?.map(title=>({title}));
 return (entries||[]).map((values,i)=>({id:`${id}-${i+1}`,version:1,template:id,values:{...values,colour:['mint','lilac','peach','cream'][i%4]}}));
}
