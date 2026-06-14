import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, Heart, Star, Compass, ImageIcon } from 'lucide-react';
import { MagnetDesign } from '../types';

interface HeroProps {
  onStartDesigning: () => void;
  onLoadPreset: (preset: Omit<MagnetDesign, 'id'>) => void;
}

export default function Hero({ onStartDesigning, onLoadPreset }: HeroProps) {
  // Ultra-vibrant, handcrafted preset ideas that showcase premium potential
  const premiumPresets = [
    {
      name: "Durban Sunset Squad",
      imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=500&auto=format&fit=crop&q=80",
      quantity: 1,
      sizeCm: 7.5,
    },
    {
      name: "Golden Retriever Vibe",
      imageUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&auto=format&fit=crop&q=80",
      quantity: 1,
      sizeCm: 7.5,
    },
    {
      name: "Coastal Solitude",
      imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80",
      quantity: 1,
      sizeCm: 7.5,
    },
  ];

  return (
    <div className="relative overflow-hidden min-h-[92vh] flex flex-col justify-center py-20 px-4 md:px-12 bg-[#faf5f5] grid-bg">
      
      {/* Delicate floating pastel spheres for professional depth */}
      <div className="absolute top-12 left-10 w-72 h-72 rounded-full bg-brand-pink-light/45 filter blur-3xl -z-10 animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-24 right-12 w-96 h-96 rounded-full bg-[#ffeef1] filter blur-3xl -z-10 animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute top-1/3 right-1/4 w-52 h-52 rounded-full bg-brand-pastel-mint/25 filter blur-2xl -z-10" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center w-full relative z-10">
        
        {/* Left Side: Editorial Typography & Soft-Pink Centric Title */}
        <div className="col-span-1 lg:col-span-7 space-y-8 text-center lg:text-left">
          
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-pink/20 text-brand-charcoal text-xs font-bold border border-brand-pink/40 uppercase tracking-widest"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-pink-dark animate-spin" style={{ animationDuration: '5s' }} />
            Premium Soft-Pink Custom prints
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="space-y-6"
          >
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-semibold text-brand-charcoal leading-[1.08] tracking-tight">
              Aesthetic <br />
              <span className="relative inline-block text-brand-pink-dark">
                Fridge Art
                <span className="absolute bottom-2 left-0 w-full h-4 bg-brand-pink-light/60 -z-10 rounded-xs" />
              </span> <br className="hidden sm:inline" />
              For Your Tribe.
            </h1>
            <p className="text-brand-charcoal/80 max-w-lg mx-auto lg:mx-0 text-sm sm:text-base md:text-lg leading-relaxed font-semibold">
              Transform your digital photo grids, squad memories, and beloved pets into gorgeous high-gloss physical square magnets. Crafted by hand, finished in premium soft lamination, and delivered straight to you.
            </p>
          </motion.div>

          {/* Key Value Highlights */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto lg:mx-0"
          >
            <div className="bg-white/95 backdrop-blur-md p-4 rounded-[24px] border border-brand-pink-soft flex items-center gap-3 shadow-[0_4px_20px_rgba(255,182,193,0.12)]">
              <div className="w-9 h-9 rounded-xl bg-[#ffeef1] flex items-center justify-center shrink-0">
                <Heart className="w-4.5 h-4.5 text-brand-pink-dark" />
              </div>
              <div className="text-left">
                <p className="text-[11px] text-brand-pink-dark font-bold uppercase tracking-wider">Premium Soft Matte Wrap</p>
                <p className="text-xs font-mono font-bold text-brand-charcoal/70">Beautiful glossy protective layer</p>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-md p-4 rounded-[24px] border border-brand-pink-soft flex items-center gap-3 shadow-[0_4px_20px_rgba(255,182,193,0.12)]">
              <div className="w-9 h-9 rounded-xl bg-brand-pastel-mint/60 flex items-center justify-center shrink-0">
                <Star className="w-4.5 h-4.5 text-brand-charcoal" />
              </div>
              <div className="text-left">
                <p className="text-[11px] text-brand-charcoal font-bold uppercase tracking-wider">Bundle & Save Rates</p>
                <p className="text-xs font-mono font-bold text-brand-charcoal/70">Starting at just R40/magnet</p>
              </div>
            </div>
          </motion.div>

          {/* Upgraded CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4"
          >
            <button
              id="hero-start-designing-btn"
              onClick={onStartDesigning}
              className="w-full sm:w-auto px-10 py-4.5 rounded-[22px] bg-brand-charcoal text-white hover:bg-brand-pink hover:text-brand-charcoal font-display font-medium text-base shadow-[0_6px_25px_rgba(45,49,66,0.15)] hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer"
            >
              Enter Design Studio
              <ArrowRight className="w-5 h-5 text-brand-pink-dark" />
            </button>
            <button
              id="hero-explore-presets-btn"
              onClick={() => {
                document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-10 py-4.5 rounded-[22px] bg-white text-brand-charcoal hover:bg-[#ffeef1]/50 font-display font-medium text-base border border-brand-pink/40 shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              View Bulk Tiers
            </button>
          </motion.div>

          {/* Aesthetic Specifications Block */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center justify-center lg:justify-start gap-10 pt-8 border-t border-brand-pink-soft text-left max-w-md mx-auto lg:mx-0"
          >
            <div>
              <p className="text-2xl font-mono font-bold text-brand-charcoal">7.5 cm</p>
              <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mt-0.5">Perfect Square size</p>
            </div>
            <div className="w-px h-8 bg-brand-pink-soft" />
            <div>
              <p className="text-2xl font-mono font-bold text-brand-charcoal">3 mm</p>
              <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mt-0.5">Heavy rubber backing</p>
            </div>
            <div className="w-px h-8 bg-brand-pink-soft" />
            <div>
              <p className="text-2xl font-mono font-bold text-brand-charcoal">R40</p>
              <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mt-0.5">Discount bulk price</p>
            </div>
          </motion.div>

        </div>

        {/* Right Side: Re-created Ultra Tactical Fridge Door Interactive Exhibit */}
        <div className="col-span-1 lg:col-span-5 flex flex-col items-center justify-center relative" id="hero-interactive-showcase-column">
          
          <p className="text-xs text-brand-pink-dark font-display font-semibold uppercase tracking-widest mb-4 bg-[#ffeef1] px-4 py-1.5 rounded-full shadow-3xs">
            Interactive Fridge Door Mockup
          </p>

          <div className="relative w-full max-w-[390px] aspect-[4/5] bg-[#ece4db] rounded-[40px] p-6 shadow-[0_20px_50px_rgba(45,49,66,0.12)] border border-brand-pink-soft flex flex-col justify-between overflow-hidden">
            
            {/* Gloss reflection line across the fridge door */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
            
            {/* Magnetic grid wireframe for background aesthetics */}
            <div className="absolute inset-0 fridge-grid opacity-25 pointer-events-none" />

            {/* Simulated Refrigerator Metallic Handle on Right Edge */}
            <div className="absolute top-1/4 right-0 w-3.5 h-1/2 bg-gradient-to-l from-[#ffffff] via-[#dcd8d0] to-[#bfb9ae] rounded-l-md border-y border-l border-brand-pink-soft/40 shadow-xs" />

            {/* Custom Vibe Logo engraved silently onto the fridge door top center */}
            <div className="text-center w-full z-10 pt-2 selection:bg-transparent">
              <span className="font-display text-[10px] text-brand-charcoal/30 tracking-widest uppercase font-bold border-b border-brand-charcoal/10 pb-1 inline-block">
                CustomVibe Solid Magnet Board
              </span>
            </div>

            {/* Middle Workspace: Scattered floating premium magnets */}
            <div className="relative w-full flex-grow my-4" id="simulated-fridge-magnet-stage">
              {premiumPresets.map((preset, index) => {
                const positions = [
                  { top: '10%', left: '8%', rotate: '-8deg', hoverRotate: '-1deg' },
                  { top: '44%', left: '46%', rotate: '7deg', hoverRotate: '2deg' },
                  { top: '56%', left: '4%', rotate: '-5deg', hoverRotate: '0deg' },
                ];
                const pos = positions[index];

                return (
                  <motion.div
                    key={preset.name}
                    id={`fridge-magnet-node-${index}`}
                    initial={{ opacity: 0, scale: 0.75, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 110, 
                      damping: 18, 
                      delay: 0.2 + (index * 0.1) 
                    }}
                    whileHover={{ 
                      scale: 1.07, 
                      rotate: pos.hoverRotate,
                      zIndex: 30,
                      boxShadow: "0 18px 35px rgba(0,0,0,0.18)"
                    }}
                    style={{
                      position: 'absolute',
                      top: pos.top,
                      left: pos.left,
                      transform: `rotate(${pos.rotate})`,
                    }}
                    className="w-34 aspect-square bg-white rounded-none shadow-md border border-brand-pink-soft/30 cursor-pointer overflow-hidden p-0 group/magnet pointer-events-auto select-none"
                  >
                    <div className="h-full w-full relative overflow-hidden rounded-none bg-zinc-50">
                      <img 
                        src={preset.imageUrl} 
                        alt={preset.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-300 animate-fadeIn"
                      />
                      
                      {/* Ambient gloss reflections */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/15 mix-blend-overlay pointer-events-none" />
                      <div className="absolute inset-0 fridge-reflection pointer-events-none" />

                      {/* Interactive Customize Action pop */}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadPreset(preset);
                        }}
                        className="absolute inset-x-2 bottom-2 py-2 bg-brand-charcoal text-white rounded-none opacity-0 group-hover/magnet:opacity-100 transition-opacity duration-200 hover:bg-brand-pink hover:text-brand-charcoal text-[9px] font-bold text-center shadow-xs flex items-center justify-center gap-1"
                        title="Customize inside the Design Studio"
                      >
                        <ImageIcon className="w-3 h-3 text-brand-pink-dark" /> Customise
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Bottom Panel message */}
            <div className="text-center pb-1 z-10 select-none">
              <span className="font-sans text-[10px] text-brand-charcoal/50 font-bold">
                Hover to tilt or tap <span className="text-brand-pink-dark">Customise</span> to personalize!
              </span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
