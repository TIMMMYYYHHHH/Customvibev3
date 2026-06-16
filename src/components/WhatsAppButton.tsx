import React from 'react';
import { MessageCircle } from 'lucide-react';

// TODO: replace with your real WhatsApp Business number in international
// format with no leading zero or symbols, e.g. "27821234567".
const WHATSAPP_NUMBER = '27000000000';
const DEFAULT_MESSAGE = "Hi CustomVibe! I'd like to ask about custom fridge magnets.";

export default function WhatsAppButton() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      id="whatsapp-floating-button"
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#25D366] shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
    >
      <MessageCircle className="w-7 h-7 text-white" fill="white" strokeWidth={0} />
    </a>
  );
}
