import React,{useRef,useState} from 'react';
import {BrandDoodle} from './ReferenceThread';
import './contact.css';
import {useFormService,FormSecurity} from '../FormService';

export default function Contact({standalone=false}){
 const Heading=standalone?'h1':'h2';
 const form=useRef(null);
 const service=useFormService('contact');
 const [values,setValues]=useState(()=>service.attempt||{name:'',email:'',message:''});
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
   <div className="contact-direct"><span>Prefer email?</span><a href="mailto:hello@customvibe.co.za">hello@customvibe.co.za</a></div>
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
   {!service.result&&<><p className="small-copy">Please keep photos and payment details out of this form. W3Forms stores your message and emails it to CustomVibe. Read our <a href="/privacy">privacy policy</a>.</p><FormSecurity service={service} kind="contact"/><button className="action" type="submit" disabled={service.manualReview||service.busy||!service.token||!service.config?.available}>{service.manualReview?'Contact us to check delivery':service.busy?'Sending…':service.pending?'Check or retry message':'Send message'}</button>{service.pending&&service.attempt&&<p className="small-copy">Message reference: {service.attempt.id}</p>}</>}
   {service.result&&<p className="contact-status" role="status">Your message has been sent for delivery to CustomVibe. Thank you. Reference: {service.result.reference}</p>}
   {status&&<p className="contact-status" role="alert">{status}</p>}
  </form>
 </section>;
}
