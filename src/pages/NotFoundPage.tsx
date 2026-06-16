import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-5">
      <h1 className="font-display font-bold text-4xl text-brand-charcoal">Page Not Found</h1>
      <p className="text-sm text-zinc-500 font-semibold">
        That page wandered off the fridge. Let's get you back to designing magnets.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-charcoal hover:bg-brand-pink hover:text-brand-charcoal text-white font-display font-bold text-xs shadow-md"
      >
        <Compass className="w-4 h-4" /> Back to Home
      </Link>
    </div>
  );
}
