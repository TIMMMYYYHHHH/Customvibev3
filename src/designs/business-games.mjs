const root='/assets/business-games/';
export const businessExamples=[
 ['01-plumber','Business contact'],['02-salon','Book a visit'],['03-cafe','View the menu'],
 ['04-wifi','Guest Wi-Fi'],['05-review','Customer reviews'],['06-bakery','Order on WhatsApp'],
 ['07-hours','Opening hours'],['08-offer','Thank-you offer'],['09-groomer','Next appointment']
].map(([id,label])=>({id,label,url:root+id+(['02-salon','03-cafe','04-wifi','05-review'].includes(id)?'.svg':'.webp')}));
export const gameArtworkUrl=symbol=>{
 if(!['X','O'].includes(symbol))throw Error('Unknown game piece.');
 return root+`game-${symbol.toLowerCase()}.png`;
};
