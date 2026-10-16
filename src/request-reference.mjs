const alphabet='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
// A display label only. Full UUIDs remain the storage, authorization and retry keys.
// Preserve the old format for drafts created before this version was introduced.
export function requestReference(request){
 if(!request||!uuid.test(request.id))throw Error('Invalid request identity');
 if(request.referenceVersion===undefined)return 'CV-'+request.id;
 if(request.referenceVersion!==1)throw Error('Invalid reference version');
 const hex=request.id.replaceAll('-','');
 // Skip UUID version and variant nibbles, leaving 80 random bits from UUID v4.
 let value=BigInt('0x'+(hex.slice(0,12)+hex.slice(13,16)+hex.slice(17)).slice(0,20));
 let code='';for(let n=0;n<16;n++){code=alphabet[Number(value&31n)]+code;value>>=5n;}
 return 'CV-'+code.match(/.{4}/g).join('-');
}
