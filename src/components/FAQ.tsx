import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

// Placeholder marker for facts that aren't in the codebase yet (turnaround
// time, shipping cost) — swap these out once you have real numbers.
function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-brand-pink-light/50 text-brand-charcoal px-1.5 py-0.5 rounded-md border border-dashed border-brand-pink-text/50">
      {children}
    </span>
  );
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What size are CustomVibe magnets?',
    answer: 'Every magnet is a 7.5cm square, finished with a high-gloss protective coating and a heavy-duty 3mm rubber backing so it grips firmly to your fridge.',
  },
  {
    question: 'What photos can I upload?',
    answer: 'Any standard photo file (JPG, PNG, HEIC, etc.) works. Upload it in the Design Studio and you can crop, zoom, and reposition it before ordering.',
  },
  {
    question: 'How does pricing work?',
    answer: 'Pricing is bundled: the more magnets you order in one go, the cheaper each one gets, down to R40 per magnet for orders of 10 or more. Use the pricing calculator on the homepage to see your exact total before requesting a quote.',
  },
  {
    question: 'How do I actually order?',
    answer: 'Design your magnets in the Design Studio, then submit a quote request with your delivery details. We confirm final pricing and delivery cost with you directly before production starts.',
  },
  {
    question: 'How long does an order take to arrive?',
    answer: <>Typical turnaround is <Placeholder>add real production + delivery turnaround time</Placeholder> from order confirmation.</>,
  },
  {
    question: 'Do you deliver nationwide in South Africa?',
    answer: <>Yes — we&apos;re based in Durban and ship across South Africa. Delivery cost is <Placeholder>add real shipping cost or how it&apos;s calculated</Placeholder> and is confirmed with your quote.</>,
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-[#faf6f6] py-14 px-4 md:px-8" id="faq-section">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="font-display text-3xl font-semibold text-brand-charcoal">Frequently Asked Questions</h2>
          <p className="text-xs sm:text-sm text-brand-charcoal/60 font-semibold max-w-md mx-auto">
            Everything you need to know before you order.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.question}
                className="bg-white rounded-2xl border border-brand-pink-soft overflow-hidden shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer"
                >
                  <span className="font-display font-semibold text-sm text-brand-charcoal">{item.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-brand-pink-text shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <p className="px-5 pb-4 text-xs sm:text-sm text-brand-charcoal/75 leading-relaxed font-semibold">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
