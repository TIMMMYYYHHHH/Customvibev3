import React from 'react';
import { Star, Quote } from 'lucide-react';

// Placeholder social proof section. Replace the three cards below with real
// customer reviews (name, quote, optional photo) once you have them.
const PLACEHOLDER_SLOTS = [1, 2, 3];

export default function Testimonials() {
  return (
    <section className="bg-white border-t border-brand-pink-soft py-section-sm px-4 md:px-8" id="testimonials-section">
      <div className="max-w-7xl mx-auto text-center space-y-10">
        <div className="space-y-2">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-brand-charcoal">What Your Tribe Will Say</h2>
          <p className="text-xs text-brand-charcoal/60 font-semibold max-w-md mx-auto">
            Real customer reviews build trust faster than anything else. Swap these placeholder cards for your own once orders start coming in.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {PLACEHOLDER_SLOTS.map((slot) => (
            <div
              key={slot}
              className="border-2 border-dashed border-brand-pink/40 rounded-card p-6 flex flex-col items-center gap-3 text-center bg-[#fff8f9]"
            >
              <Quote className="w-6 h-6 text-brand-pink-text" />
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-3.5 h-3.5 text-brand-pink/40" />
                ))}
              </div>
              <p className="text-xs text-brand-charcoal/50 font-semibold">
                Add a real customer quote here
              </p>
              <p className="text-label-xs text-zinc-400 uppercase tracking-wider font-bold">
                Customer name, City
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
