export const ORDER_NOTES_LIMIT=1000;
export function validateOrderNotes(value){
 if(value===undefined)return '';
 if(typeof value!=='string'||value.length>ORDER_NOTES_LIMIT||/[\x00-\x08\x0b-\x1f\x7f]/.test(value))throw new Error('Please keep your order notes to 1,000 characters of plain text.');
 return value.trim();
}
