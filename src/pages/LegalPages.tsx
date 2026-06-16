import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface LegalPageProps {
  title: string;
  children: React.ReactNode;
}

function LegalPageLayout({ title, children }: LegalPageProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-12 py-16">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-pink-text hover:underline mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>
      <div className="bg-white rounded-[32px] border border-brand-pink-soft shadow-xs p-8 sm:p-10 space-y-4">
        <h1 className="font-display font-bold text-3xl text-brand-charcoal mb-2">{title}</h1>
        <div className="space-y-3 text-xs sm:text-sm text-brand-charcoal/80 leading-relaxed font-semibold">
          {children}
        </div>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <p>We only collect the information you give us when designing a magnet or requesting a quote: your name, email, phone number, delivery address, and the photos you upload.</p>
      <p>Uploaded photos are used solely to produce your order and are not shared with third parties or used for marketing without your consent.</p>
      <p>We do not sell your personal information. Contact us at hello@customvibe.co.za if you would like your data deleted.</p>
      <p className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold">Placeholder policy. Replace with your finalized privacy policy before launch.</p>
    </LegalPageLayout>
  );
}

export function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Craft">
      <p>By submitting a quote request, you confirm you own the rights to any photos you upload and grant us permission to print them for your order.</p>
      <p>Prices shown are estimates and may be confirmed once delivery costs are calculated. Production begins once your order is confirmed.</p>
      <p>Custom magnets are made to order and are generally non-refundable except in the case of a printing defect or damage in transit.</p>
      <p className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold">Placeholder terms. Replace with your finalized terms of service before launch.</p>
    </LegalPageLayout>
  );
}

export function ContactPage() {
  return (
    <LegalPageLayout title="Get In Touch">
      <p>Email: hello@customvibe.co.za</p>
      <p>Phone / WhatsApp: add your real number here</p>
      <p>Based in Durban, South Africa</p>
      <p className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold">Placeholder contact details. Replace with your real phone number and address.</p>
    </LegalPageLayout>
  );
}
