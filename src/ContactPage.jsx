import React from 'react';
import Contact from './storefront/Contact';
import './storefront/storefront.css';

export default function ContactPage(){
 return <div className="storefront"><main className="concept happy-chaos thread-brand contact-page">
  <Contact standalone/>
  <aside className="contact-help content" aria-label="More ways to get help">
   <div><h2>Already sent a request?</h2><p>Email <a href="mailto:orders@customvibe.co.za">orders@customvibe.co.za</a> and include your request reference.</p></div>
   <div><h2>A quick question?</h2><p>Find answers about your magnets, artwork and delivery in <a href="/help">our help guide</a>.</p></div>
  </aside>
 </main></div>;
}
