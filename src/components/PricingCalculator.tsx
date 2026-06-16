import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Sparkles, Percent, HelpingHand, Tag } from 'lucide-react';
import { calculateBundlePrice } from '../utils/pricing';

interface PricingCalculatorProps {
  onStartDesigning: () => void;
}

export default function PricingCalculator({ onStartDesigning }: PricingCalculatorProps) {
  const [estimateQty, setEstimateQty] = useState(6);

  const calcResult = calculateBundlePrice(estimateQty);

  const packs = [
    {
      title: "Single Shot",
      qty: "1 Magnet",
      price: "R50",
      description: "Ideal to test-drive our pristine gloss and structural fidelity.",
      features: [
        "7.5 x 7.5 cm perfect square",
        "Fine-Art protective gloss film",
        "3mm Heavy flexible backing pad",
        "Hand-painted white wrap seal",
      ],
      popular: false,
      cta: "Create Solo Draft"
    },
    {
      title: "Tribe Half-Dozen",
      qty: "6 Magnets",
      price: "R250",
      description: "Our customer favorite bundle. Made for sharing with family and friends.",
      features: [
        "Up to 6 uniquely personal photos",
        "Instant R50 applied discount",
        "Triple-layer gloss water protection",
        "Free decorative gift layout box",
      ],
      popular: true,
      cta: "Create Tribe Pack"
    },
    {
      title: "Ultimate Family Pack",
      qty: "10 Magnets",
      price: "R400",
      description: "Turn your entire telephone roll or Pinterest catalog into physical art.",
      features: [
        "Up to 10 unique picture uploads",
        "Absolute lowest cost (R40/magnet)",
        "Priority studio design processing",
        "Custom border options included",
      ],
      popular: false,
      cta: "Create Ultimate Pack"
    }
  ];

  return (
    <div id="pricing-section" className="max-w-7xl mx-auto px-4 md:px-12 py-20 bg-[#faf5f5]">
      
      {/* Redesigned Pricing Intro */}
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand-pink-text bg-brand-pink/20 px-3 py-1 rounded-full">
          Simplicity first
        </span>
        <h2 className="font-display text-4xl md:text-5xl font-semibold text-brand-charcoal">
          Completely Honest, Low-stress Pricing
        </h2>
        <p className="text-brand-charcoal/70 text-xs sm:text-sm md:text-base leading-relaxed font-semibold">
          Design distinct layouts for every single magnet in your bundle. There are zero hidden fees, extra plate costs, or sneaky fine print. Bundling brings greater savings.
        </p>
      </div>

      {/* Modern Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20" id="packages-cards-grid">
        {packs.map((pack, idx) => {
          return (
            <div
              key={pack.title}
              id={`pricing-package-${idx}`}
              className={`rounded-[36px] p-8 border relative flex flex-col justify-between transition-all duration-300 ${
                pack.popular 
                  ? 'bg-white border-brand-pink shadow-[0_12px_40px_rgba(255,182,193,0.25)] scale-[1.03]' 
                  : 'bg-white/70 border-brand-pink-soft hover:bg-white shadow-[0_4px_25px_rgba(0,0,0,0.02)] hover:shadow-md'
              }`}
            >
              {pack.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-charcoal text-white font-display font-bold text-[10px] uppercase tracking-wider py-1.5 px-4 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-brand-pink" /> Customer Darling
                </span>
              )}

              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-brand-pink-text">
                  {pack.qty}
                </span>
                <h3 className="font-display font-semibold text-2xl text-brand-charcoal mt-1">
                  {pack.title}
                </h3>
                
                <div className="flex items-baseline gap-1 my-5 text-left">
                  <span className="text-5xl font-mono font-bold text-brand-charcoal">{pack.price}</span>
                  <span className="text-xs text-brand-charcoal/50 font-bold ml-1">total value</span>
                </div>
                
                <p className="text-xs text-brand-charcoal/70 leading-relaxed mb-6 font-semibold">
                  {pack.description}
                </p>

                <hr className="border-brand-pink-soft/75 my-6" />

                <ul className="space-y-4">
                  {pack.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3 text-xs text-brand-charcoal/80 font-semibold text-left">
                      <Check className="w-4 h-4 text-brand-pink-text flex-none mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={onStartDesigning}
                className={`w-full mt-10 py-3.5 rounded-2xl font-display font-medium text-xs text-center transition-all cursor-pointer ${
                  pack.popular
                    ? 'bg-brand-charcoal text-white hover:bg-brand-pink hover:text-brand-charcoal shadow-sm'
                    : 'bg-brand-pink-soft hover:bg-brand-pink-light text-brand-charcoal border border-brand-pink/30'
                }`}
              >
                {pack.cta} &rarr;
              </button>
            </div>
          );
        })}
      </div>

      {/* ================= RE-DESIGNED SIMULATOR BENTO BLOCK ================= */}
      <div className="bg-white rounded-[40px] p-8 md:p-12 border border-brand-pink-soft shadow-[0_8px_35px_rgba(255,182,193,0.1)] grid grid-cols-1 lg:grid-cols-12 gap-12 items-center" id="pricing-interactive-simulator">
        
        {/* Left Control Panel */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-3 text-left">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand-pink-text flex items-center gap-2">
              <Percent className="w-4 h-4" /> Live Budget Calculator
            </span>
            <h3 className="font-display font-bold text-3xl text-brand-charcoal">
              Simulate Larger Order Discounts
            </h3>
            <p className="text-brand-charcoal/75 text-xs sm:text-sm leading-relaxed font-semibold">
              Slide the controller below to select exactly how many magnets you want to print. Watch applied rates adjust in real-time as your tribe grows!
            </p>
          </div>

          <div className="space-y-5 pt-2">
            <div className="flex justify-between items-center bg-[#faf5f5] p-3.5 rounded-2xl border border-brand-pink-soft">
              <span className="text-xs font-bold text-brand-charcoal uppercase tracking-wider font-display">Simulated Bundle Size:</span>
              <span className="bg-brand-charcoal text-white font-mono font-bold text-sm px-4 py-1.5 rounded-xl">
                {estimateQty} Magnet{estimateQty !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="relative pt-2">
              <input 
                type="range"
                min="1"
                max="50"
                value={estimateQty}
                onChange={(e) => setEstimateQty(parseInt(e.target.value))}
                className="w-full h-3 bg-[#ffeef1] rounded-lg appearance-none cursor-pointer accent-brand-pink"
              />
              <div className="flex justify-between font-mono text-[9px] text-zinc-400 font-bold px-1 mt-2.5">
                <span>1 Unit</span>
                <span>10 pack (R40/u)</span>
                <span>20 pack</span>
                <span>30 pack</span>
                <span>40 pack</span>
                <span>50 max order</span>
              </div>
            </div>
          </div>

          {estimateQty > 15 && (
            <div className="p-4.5 bg-brand-pastel-mint/30 border border-brand-pink-soft/55 rounded-2xl flex items-start gap-3 text-xs text-[#2c4e30] text-left animate-fadeIn">
              <HelpingHand className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="font-semibold leading-relaxed">
                <strong>Large Dispatch Protocol Enabled:</strong> Orders above 15 units undergo priority studio assembly. Simply checkout on your custom designs, and our couriers will handle secure door-to-door transit coordinates.
              </p>
            </div>
          )}
        </div>

        {/* Right Output Panel */}
        <div className="lg:col-span-5 bg-[#ffeef1]/60 p-8 rounded-[32px] border border-brand-pink/30 space-y-6 text-center lg:text-left">
          
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-brand-pink-text uppercase tracking-widest block">
              Estimated Total Cost
            </span>
            <span className="text-5xl font-mono font-bold text-brand-charcoal block">
              R{calcResult.cost}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4.5 border-y border-brand-pink/20 text-left">
            <div>
              <span className="text-[10px] text-zinc-500 block font-bold uppercase tracking-wider">Unit Average</span>
              <span className="text-base font-mono font-bold text-brand-charcoal">
                R{calcResult.avgPerUnit.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block font-bold uppercase tracking-wider">Assigned Tier</span>
              <span className="text-xs font-display font-semibold text-brand-pink-text truncate block mt-0.5">
                {calcResult.tier}
              </span>
            </div>
          </div>

          {calcResult.savings > 0 ? (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center flex items-center justify-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700 leading-none">
                Volume bundle saved you R{calcResult.savings}!
              </span>
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500 leading-normal bg-white/70 p-3 rounded-2xl text-center font-semibold">
              Bundle 10 units or more to reduce each magnet by up to R10!
            </p>
          )}

          <button
            onClick={onStartDesigning}
            className="w-full py-4 rounded-2xl bg-brand-charcoal hover:bg-brand-pink text-white hover:text-brand-charcoal font-display font-medium text-xs shadow-md transition-all cursor-pointer text-center block"
          >
            Design {estimateQty} Magnets Now &rarr;
          </button>
        </div>

      </div>

    </div>
  );
}
