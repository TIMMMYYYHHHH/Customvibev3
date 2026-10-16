// Resolve only the static inline PNGs included with the actual sending payload.
// Preview documents cannot run scripts, submit forms, connect or load remote assets.
export function emailPreviewDocument(mail){
 const html=mail.html.replace(/src="cid:([^"]+)"/g,(match,id)=>{
  const asset=mail.attachments?.find(item=>item.content_id===id);
  return asset?.content_type==='image/png'&&/^[A-Za-z0-9+/=]+$/.test(asset.content)?`src="data:image/png;base64,${asset.content}"`:match;
 });
 return html.replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">`);
}
