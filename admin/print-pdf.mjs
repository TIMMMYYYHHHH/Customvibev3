import {PDFDocument,StandardFonts,rgb,degrees} from 'pdf-lib';
import {assertPrintJob,PRINT_PAGE,PRINT_LIMITS} from './print-layout.mjs';

// exportPrintPdf(job, Map<file.name,Uint8Array JPEG>, {logoBytes:Uint8Array})
// returns a PDF Uint8Array. No fetches, browser persistence or customer details.
// JPEG streams are embedded verbatim once per master. All geometry uses the
// immutable model shared by the SVG preview. Logo is the existing 3:2 v2 PNG.
export const mmToPoints=value=>value*72/25.4;
const berry=rgb(174/255,46/255,91/255),plum=rgb(41/255,20/255,56/255);
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
function localPoint(brand,x,y){const a=brand.rotation*Math.PI/180;return {x:mmToPoints(brand.xMm+x*Math.cos(a)-y*Math.sin(a)),y:mmToPoints(PRINT_PAGE.heightMm-brand.yMm-x*Math.sin(a)-y*Math.cos(a))};}
export async function exportPrintPdf(job,artwork,{logoBytes}={}){
 assertPrintJob(job);
 if(!(artwork instanceof Map))throw Error('Prepared artwork is unavailable. Prepare the sheet again.');
 if(job.pages.length>PRINT_LIMITS.pages)throw Error('The PDF exceeds the print batch page limit.');
 // Validate every source before creating pages. Partial output never escapes.
 for(const file of job.files){
  const bytes=artwork.get(file.name);
  if(!(bytes instanceof Uint8Array))throw Error(`Artwork is missing: ${file.name}. Prepare the sheet again.`);
  if(bytes.length!==file.size||bytes.length>PRINT_LIMITS.fileBytes)throw Error('Artwork size changed. Prepare the sheet again.');
  if(bytes[0]!==0xff||bytes[1]!==0xd8||bytes[bytes.length-2]!==0xff||bytes[bytes.length-1]!==0xd9)throw Error('Artwork is not a complete JPEG. Prepare the sheet again.');
  if(file.sha256&&await digest(bytes)!==file.sha256)throw Error('Artwork hash changed. Prepare the sheet again.');
 }
 const pdf=await PDFDocument.create();pdf.setTitle('CustomVibe print sheets');pdf.setAuthor('CustomVibe');pdf.setCreator('CustomVibe');
 const font=await pdf.embedFont(StandardFonts.Helvetica),images=new Map();
 for(const file of job.files){const image=await pdf.embedJpg(artwork.get(file.name));if(image.width!==image.height)throw Error('Printable artwork must be square. Prepare the current artwork again.');images.set(file.name,image);}
 let logo;
 if(logoBytes===undefined)throw Error('The current print logo is required. Prepare the sheet again.');
 if(logoBytes!==undefined){if(!(logoBytes instanceof Uint8Array)||logoBytes.length>1000000)throw Error('Invalid print logo.');try{logo=await pdf.embedPng(logoBytes);}catch{throw Error('The print logo PNG is unavailable. Prepare the sheet again.');}}
 for(const sheet of job.pages){
  const page=pdf.addPage([mmToPoints(PRINT_PAGE.widthMm),mmToPoints(PRINT_PAGE.heightMm)]);
  for(const placement of sheet.placements){
   page.drawImage(images.get(placement.file.name),{x:mmToPoints(placement.xMm),y:mmToPoints(PRINT_PAGE.heightMm-placement.yMm-placement.imageMm),width:mmToPoints(placement.imageMm),height:mmToPoints(placement.imageMm)});
   if(job.calibration.showGuides){const points=placement.outer.polygon;for(let n=0;n<points.length;n++){const a=points[n],b=points[(n+1)%points.length];page.drawLine({start:{x:mmToPoints(a.xMm),y:mmToPoints(PRINT_PAGE.heightMm-a.yMm)},end:{x:mmToPoints(b.xMm),y:mmToPoints(PRINT_PAGE.heightMm-b.yMm)},thickness:mmToPoints(.15),color:plum});}}
   for(const brand of placement.branding){
    const rotation=degrees(-brand.rotation);
    if(logo){const p=localPoint(brand,brand.logoXMm,brand.logoYMm+brand.logoHeightMm);page.drawImage(logo,{...p,width:mmToPoints(brand.logoMm),height:mmToPoints(brand.logoHeightMm),rotate:rotation});}
    page.drawText(brand.text,{...localPoint(brand,brand.textXMm,brand.textYMm),size:brand.fontSizePt,font,color:berry,rotate:rotation});
   }
  }
 }
 assertPrintJob(job);
 return pdf.save();
}
