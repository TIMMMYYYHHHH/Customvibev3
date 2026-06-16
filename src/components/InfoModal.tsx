import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

export type InfoModalType = 'privacy' | 'terms' | 'contact';

interface InfoModalProps {
  type: InfoModalType;
  onClose: () => void;
}

const CONTENT: Record<InfoModalType, { title: string; body: React.ReactNode }> = {
  privacy: {
    title: 'Privacy Policy',
    body: (
      <>
        <p>We only collect the information you give us when designing a magnet or requesting a quote: your name, email, phone number, delivery address, and the photos you upload.</p>
        <p>Uploaded photos are used solely to produce your order and are not shared with third parties or used for marketing without your consent.</p>
        <p>We do not sell your personal information. Contact us at hello@customvibe.co.za if you would like your data deleted.</p>
        <p className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold">Placeholder policy. Replace with your finalized privacy policy before launch.</p>
      </>
    ),
  },
  terms: {
    title: 'Terms of Craft',
    body: (
      <>
        <p>By submitting a quote request, you confirm you own the rights to any photos you upload and grant us permission to print them for your order.</p>
        <p>Prices shown are estimates and may be confirmed once delivery costs are calculated. Production begins once your order is confirmed.</p>
        <p>Custom magnets are made to order and are generally non-refundable except in the case of a printing defect or damage in transit.</p>
        <p className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold">Placeholder terms. Replace with your finalized terms of service before launch.</p>
      </>
    ),
  },
  contact: {
    title: 'Get In Touch',
    body: (
      <>
        <p>Email: hello@customvibe.co.za</p>
        <p>Phone / WhatsApp: add your real number here</p>
        <p>Based in Durban, South Africa</p>
        <p className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold">Placeholder contact details. Replace with your real phone number and address.</p>
      </>
    ),
  },
};

export default function InfoModal({ type, onClose }: InfoModalProps) {
  const content = CONTENT[type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-charcoal/45 backdrop-blur-xs"
      id="info-modal-overlay"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-white w-full max-w-lg rounded-[32px] border border-brand-pink-soft shadow-xl p-6 sm:p-9 overflow-hidden z-10 text-left"
        id="info-modal-content-card"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-neutral-100 text-zinc-400 hover:text-brand-charcoal transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-display font-bold text-2xl text-brand-charcoal mb-5">{content.title}</h3>

        <div className="space-y-3 text-xs text-brand-charcoal/80 leading-relaxed font-semibold max-h-[55vh] overflow-y-auto pr-1">
          {content.body}
        </div>
      </motion.div>
    </div>
  );
}
