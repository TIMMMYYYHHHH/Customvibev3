import {PUBLIC_CONTACT_EMAIL} from '../../shared/business-constants.mjs';
import React,{useEffect,useRef,useState} from 'react';
import {BrandDoodle} from './ReferenceThread';
import './contact.css';
import {useFormService,FormSecurity,useDraftProtection} from '../FormService';

export default function Contact({standalone=false}){
 const Heading=standalone?'h1':'h2';
 const form=useRef(null),dialog=useRef(null),submitButton=useRef(null),restoreFocus=useRef(false);
 const service=useFormService('contact');
 const [values,setValues]=useState(()=>service.attempt||{name:'',email:'',message:''});
 useDraftProtection('contact',['name','email','message'].some(key=>!!values[key]?.trim()));
 const [errors,setErrors]=useState({});
 const [status,setStatus]=useState('');
 useEffect(()=>{if(service.result&&!dialog.current?.open)dialog.current?.showModal();},[service.result]);
 useEffect(()=>{if(!service.result&&restoreFocus.current){restoreFocus.current=false;form.current?.elements.namedItem('name')?.focus();}},[service.result]);
 function dismissSuccess(){if(service.resetCompleted()){restoreFocus.current=true;dialog.current?.close();setValues({name:'',email:'',message:''});setErrors({});setStatus('');}}
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
 async function submit(event){
  event.preventDefault();
  if(service.pending){await service.submit(async()=>values);return;}
  const next=Object.fromEntries(['name','email','message'].map(name=>[name,values[name]]).map(([name,value])=>[name,validate(name,value)]));
  setErrors(next);setStatus('');
  const first=Object.keys(next).find(name=>next[name]);
  if(first){form.current.elements.namedItem(first)?.focus();return;}
  await service.submit(async()=>values);
 }
 const fieldProps=name=>({id:`contact-${name}`,name,value:values[name],required:true,'aria-invalid':!!errors[name],'aria-describedby':errors[name]?`contact-${name}-error`:undefined,onChange:event=>change(name,event.target.value),onBlur:event=>setErrors(previous=>({...previous,[name]:validate(name,event.target.value)}))});
 const error=name=>errors[name]&&<span className="contact-field-error" id={`contact-${name}-error`}>{errors[name]}</span>;
 return <section className="contact-section content" id="contact" aria-labelledby="contact-title">
  <div className="contact-intro">
   <p className="overline">CONTACT US</p>
   <Heading id="contact-title">Good things start<br/>with a <span>hello.</span></Heading>
   <p>A question about your magnets? A gift idea you’re dreaming up? Tell us what’s on your mind.</p>
   <div className="contact-direct"><span>Prefer email?</span><a href={"mailto:"+PUBLIC_CONTACT_EMAIL}>{PUBLIC_CONTACT_EMAIL}</a></div>
   {!standalone&&<span className="contact-scribble">Let’s make something personal.<BrandDoodle kind="heart" className="contact-heart berry"/></span>}
  </div>
  <form className="contact-form" ref={form} onSubmit={submit} noValidate aria-label="Contact us">
   {standalone&&<div className="contact-form-heading"><h2>Leave us a little note.</h2><p>All fields are required.</p></div>}
   <fieldset disabled={service.busy||service.pending||!!service.result} className="contact-fieldset"><legend className="sr-only">Your message</legend><div className="contact-fields">
    <div className="contact-field"><label htmlFor="contact-name">Your name</label><input {...fieldProps('name')} type="text" autoComplete="name" maxLength={100} placeholder="Your name"/>{error('name')}</div>
    <div className="contact-field"><label htmlFor="contact-email">Email address</label><input {...fieldProps('email')} type="email" autoComplete="email" maxLength={254} placeholder="you@example.com"/>{error('email')}</div>
   </div>
   <div className="contact-field"><label htmlFor="contact-message">Your message</label><textarea {...fieldProps('message')} rows={5} maxLength={5000} placeholder="What’s on your mind?"/>{error('message')}</div>
   </fieldset>
   {!service.result&&<><p className="small-copy">Read how we handle your information in our <a href="/privacy">privacy policy</a>.</p><FormSecurity service={service} kind="contact"/><button ref={submitButton} className="action" type="submit" disabled={service.manualReview||service.busy||!service.token||!service.config?.available}>{service.manualReview?'Message needs checking':service.busy?'Sending message…':service.pending?'Check or retry message':'Send message'}</button></>}
   {service.result&&<button ref={submitButton} className="action" type="button" onClick={()=>dialog.current?.showModal()}>View confirmation</button>}
   {status&&<p className="contact-status" role="alert">{status}</p>}
  </form>
  {service.result&&<dialog ref={dialog} className="contact-success-modal" aria-labelledby="contact-success-title" aria-describedby="contact-success-description" onCancel={event=>{event.preventDefault();dismissSuccess();}} onKeyDown={event=>{if(event.key==='Tab'){event.preventDefault();dialog.current?.querySelector('button')?.focus();}}}>
   <div className="contact-success-status"><span className="contact-success-mark" aria-hidden="true">✓</span><span>Thank you for your note</span></div><h2 id="contact-success-title">Message received.</h2><p id="contact-success-description">Your message has been submitted. We’ll reply using the email address you provided.</p><button className="action" type="button" autoFocus onClick={dismissSuccess}>Close confirmation</button>
  </dialog>}
 </section>;
}
