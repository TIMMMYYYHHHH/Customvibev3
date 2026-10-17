const dialog=document.querySelector('#site-login');
const trigger=document.querySelector('.login-link');
if(dialog&&typeof dialog.showModal==='function'){
  const open=()=>{dialog.showModal();document.querySelector('#password').focus()};
  trigger.addEventListener('click',event=>{event.preventDefault();open()});
  dialog.querySelector('.close-login').addEventListener('click',event=>{event.preventDefault();dialog.close()});
  dialog.addEventListener('close',()=>trigger.focus());
  if(dialog.open){dialog.removeAttribute('open');open()}
}
