import React,{useRef,useState} from 'react';
import {BrandDoodle} from './ReferenceThread';
import './contact.css';

export default function Contact(){
 const form=useRef(null);
 const [values,setValues]=useState({name:'',email:'',message:''});
 const [errors,setErrors]=useState({});
 const [status,setStatus]=useState('');
 function validate(name,value){
  if(!value.trim())return {name:'Please enter your name.',email:'Please enter your email address.',message:'Tell us a little about how we can help.'}[name];
  if(name==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))return 'Enter an email address like you@example.com.';
  return '';
 }
 function change(name,value){
  setValues(previous=>({...previous,[name]:value}));
  setStatus('');
  if(errors[name])setErrors(previous=>({...previous,[name]:validate(name,value)}));
 }
 function submit(event){
  event.preventDefault();
  const next=Object.fromEntries(Object.entries(values).map(([name,value])=>[name,validate(name,value)]));
  setErrors(next);setStatus('');
  const first=Object.keys(next).find(name=>next[name]);
  if(first){form.current.elements.namedItem(first)?.focus();return;}
  // Delivery will be connected separately. Never imply an unsent message arrived.
  setStatus('Message sending is not available yet. Your message is still here.');
 }
 const fieldProps=name=>({id:`contact-${name}`,name,value:values[name],required:true,'aria-invalid':!!errors[name],'aria-describedby':errors[name]?`contact-${name}-error`:undefined,onChange:event=>change(name,event.target.value),onBlur:event=>setErrors(previous=>({...previous,[name]:validate(name,event.target.value)}))});
 const error=name=>errors[name]&&<span className="contact-field-error" id={`contact-${name}-error`}>{errors[name]}</span>;
 return <section className="contact-section content" id="contact" aria-labelledby="contact-title">
  <div className="contact-intro">
   <p className="overline">CONTACT US</p>
   <h2 id="contact-title">Good things start<br/>with a hello.</h2>
   <p>A question about your magnets? A gift idea you’re dreaming up? We’d love to hear from you.</p>
   <span className="contact-scribble">Let’s make something personal.<BrandDoodle kind="heart" className="contact-heart berry"/></span>
  </div>
  <form className="contact-form" ref={form} onSubmit={submit} noValidate aria-label="Contact us">
   <div className="contact-fields">
    <div className="contact-field"><label htmlFor="contact-name">Your name</label><input {...fieldProps('name')} type="text" autoComplete="name" maxLength={100} placeholder="Your name"/>{error('name')}</div>
    <div className="contact-field"><label htmlFor="contact-email">Email address</label><input {...fieldProps('email')} type="email" autoComplete="email" maxLength={254} placeholder="you@example.com"/>{error('email')}</div>
   </div>
   <div className="contact-field"><label htmlFor="contact-message">Your message</label><textarea {...fieldProps('message')} rows={5} maxLength={5000} placeholder="What’s on your mind?"/>{error('message')}</div>
   <button className="action" type="submit">Send message</button>
   {status&&<p className="contact-status" role="alert">{status}</p>}
  </form>
 </section>;
}
