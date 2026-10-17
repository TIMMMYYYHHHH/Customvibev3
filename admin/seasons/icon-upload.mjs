// Decode and resize locally. Never upload to a service or retain the source file.
export async function prepareIcon(file){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose a PNG, JPG or WebP image.');
 if(file.size>2*1024*1024)throw Error('Choose an image smaller than 2 MB.');
 let bitmap;try{bitmap=await createImageBitmap(file)}catch{throw Error('This image could not be opened. Try another file.')}
 try{const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const context=canvas.getContext('2d');const scale=Math.min(128/bitmap.width,128/bitmap.height);const w=bitmap.width*scale,h=bitmap.height*scale;context.drawImage(bitmap,(128-w)/2,(128-h)/2,w,h);return {image:canvas.toDataURL('image/png')}}finally{bitmap.close()}
}
