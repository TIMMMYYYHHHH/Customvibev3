import source from '../../public/assets/fonts/PatrickHand-Regular.ttf?inline';
let ready;
export function loadHandyFont(){return ready ||= (async()=>{
 const bytes=Uint8Array.from(atob(source.split(',')[1]),c=>c.charCodeAt(0));
 const face=new FontFace('CustomVibe Handwriting',bytes,{weight:'400',style:'normal'});
 await face.load();document.fonts.add(face);
})().catch(error=>{ready=null;throw error});}
