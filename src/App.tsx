import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Heart, Sparkles, MapPin, Smile, Camera, Layers, HelpCircle } from 'lucide-react';
import { MagnetDesign } from './types';

// Importing CustomVibe sub-components
import Header from './components/Header';
import Hero from './components/Hero';
import MagnetDesigner from './components/MagnetDesigner';
import PricingCalculator from './components/PricingCalculator';
import QuoteForm from './components/QuoteForm';
import QuoteSummaryModal from './components/QuoteSummaryModal';
import Testimonials from './components/Testimonials';
import WhatsAppButton from './components/WhatsAppButton';
import InfoModal, { InfoModalType } from './components/InfoModal';

export default function App() {
  const [activeTab, setActiveTab ] = useState<string>('hero');
  const [designs, setDesigns] = useState<MagnetDesign[]>([]);
  const [activeDesignId, setActiveDesignId] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [activeInfoModal, setActiveInfoModal] = useState<InfoModalType | null>(null);

  // Initialize with a default lovely custom welcome design so the studio is alive instantly!
  useEffect(() => {
    const saved = localStorage.getItem('customvibe_designs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setDesigns(parsed);
          setActiveDesignId(parsed[0].id);
          return;
        }
      } catch (e) {
        console.error("Storage parse error", e);
      }
    }

    // Default Starting welcome design
    const defaultDesign: MagnetDesign = {
      id: 'welcome-draft-1',
      name: 'Squad Vibe 2026',
      imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&auto=format&fit=crop&q=80',
      quantity: 1,
      sizeCm: 7.5
    };
    setDesigns([defaultDesign]);
    setActiveDesignId(defaultDesign.id);
  }, []);

  // Sync state to standard client-side LocalStorage
  const saveToLocalStorage = (allDesigns: MagnetDesign[]) => {
    localStorage.setItem('customvibe_designs', JSON.stringify(allDesigns));
  };

  const handleAddDesign = (newDesign: MagnetDesign) => {
    const updated = [...designs, newDesign];
    setDesigns(updated);
    setActiveDesignId(newDesign.id);
    saveToLocalStorage(updated);
  };

  const handleUpdateDesign = (updatedDesign: MagnetDesign) => {
    const updated = designs.map((d) => (d.id === updatedDesign.id ? updatedDesign : d));
    setDesigns(updated);
    saveToLocalStorage(updated);
  };

  const handleDeleteDesign = (id: string) => {
    const updated = designs.filter((d) => d.id !== id);
    setDesigns(updated);
    saveToLocalStorage(updated);
    
    // Auto shift focused design
    if (activeDesignId === id && updated.length > 0) {
      setActiveDesignId(updated[0].id);
    } else if (updated.length === 0) {
      setActiveDesignId(null);
    }
  };

  const handleCloneDesign = (id: string) => {
    const target = designs.find((d) => d.id === id);
    if (!target) return;

    const cloned: MagnetDesign = {
      ...target,
      id: `design-clone-${Date.now()}`,
      name: `${target.name} (Copy)`,
      quantity: 1, // reset quantity of cloned item so they do not overbuy
    };

    const updated = [...designs, cloned];
    setDesigns(updated);
    setActiveDesignId(cloned.id);
    saveToLocalStorage(updated);
  };

  const handleLoadPreset = (preset: Omit<MagnetDesign, 'id'>) => {
    const newDesign: MagnetDesign = {
      ...preset,
      id: `design-preset-${Date.now()}`
    };
    const updated = [...designs, newDesign];
    setDesigns(updated);
    setActiveDesignId(newDesign.id);
    saveToLocalStorage(updated);
    
    // Smoothly route back to internal Design Studio
    setActiveTab('designer');
  };

  const handleClearAllDesigns = () => {
    setDesigns([]);
    setActiveDesignId(null);
    localStorage.removeItem('customvibe_designs');
  };

  return (
    <div className="min-h-screen bg-[#faf6f6] flex flex-col justify-between selection:bg-brand-pastel-peach text-brand-charcoal">
      
      {/* Sticky CustomVibe Nav Header */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        designs={designs} 
        onRequestQuote={() => setShowSummaryModal(true)}
      />

      {/* Main interactive Tab Content Stage */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            {activeTab === 'hero' && (
              <div className="space-y-4">
                <Hero 
                  onStartDesigning={() => setActiveTab('designer')}
                  onLoadPreset={handleLoadPreset}
                />
                <hr className="border-brand-pink-soft max-w-7xl mx-auto opacity-40" />
                <PricingCalculator
                  onStartDesigning={() => setActiveTab('designer')}
                />
                <Testimonials />
              </div>
            )}

            {activeTab === 'designer' && (
              <MagnetDesigner
                designs={designs}
                activeDesignId={activeDesignId}
                setActiveDesignId={setActiveDesignId}
                onUpdateDesign={handleUpdateDesign}
                onAddDesign={handleAddDesign}
                onDeleteDesign={handleDeleteDesign}
                onCloneDesign={handleCloneDesign}
                onRequestQuote={() => setShowSummaryModal(true)}
              />
            )}

            {activeTab === 'quote' && (
              <QuoteForm
                designs={designs}
                onUpdateDesign={handleUpdateDesign}
                onDeleteDesign={handleDeleteDesign}
                onClearAllDesigns={handleClearAllDesigns}
                onNavigateToDesigner={() => setActiveTab('designer')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Quote Summary Modal Overlay */}
      <AnimatePresence>
        {showSummaryModal && (
          <QuoteSummaryModal
            isOpen={showSummaryModal}
            onClose={() => setShowSummaryModal(false)}
            designs={designs}
            onProceed={() => {
              setShowSummaryModal(false);
              setActiveTab('quote');
            }}
          />
        )}
      </AnimatePresence>

      {/* Privacy / Terms / Contact Info Modal */}
      <AnimatePresence>
        {activeInfoModal && (
          <InfoModal type={activeInfoModal} onClose={() => setActiveInfoModal(null)} />
        )}
      </AnimatePresence>

      {/* Floating WhatsApp click-to-chat button */}
      <WhatsAppButton />

      {/* Brand Value Proposition footer cards */}
      <section className="bg-white border-t border-brand-pink-soft py-10 px-4 md:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 text-center md:text-left">
          
          <div className="space-y-2 p-4 rounded-2xl hover:bg-[#fff0f3]/45 transition-colors">
            <Camera className="w-6 h-6 text-brand-pink-dark mx-auto md:mx-0" />
            <h4 className="font-display font-bold text-sm text-brand-charcoal">High-Definition Print Gloss</h4>
            <p className="text-[11.5px] text-brand-charcoal/70 leading-relaxed font-semibold">
              Waterproof protection coating layer safeguards details against greasy hands, humidity, or sunlight bleach.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl hover:bg-[#fff0f3]/45 transition-colors">
            <Layers className="w-6 h-6 text-brand-pink-dark mx-auto md:mx-0" />
            <h4 className="font-display font-bold text-sm text-brand-charcoal">Strong Flexible Rubber Grip</h4>
            <p className="text-[11.5px] text-brand-charcoal/70 leading-relaxed font-semibold">
              Sturdy 3mm backing won&apos;t slip or slide when slamming refrigerator doors. Clings beautifully.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl hover:bg-[#fff0f3]/45 transition-colors">
            <Heart className="w-6 h-6 text-brand-pink-dark mx-auto md:mx-0" />
            <h4 className="font-display font-bold text-sm text-brand-charcoal">Local Craftsmanship</h4>
            <p className="text-[11.5px] text-brand-charcoal/70 leading-relaxed font-semibold">
              Made with pride by custom design lovers. Hand-inspected and carefully trimmed square templates.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl hover:bg-[#fff0f3]/45 transition-colors">
            <MapPin className="w-6 h-6 text-brand-pink-dark mx-auto md:mx-0" />
            <h4 className="font-display font-bold text-sm text-brand-charcoal">Nationwide Delivery</h4>
            <p className="text-[11.5px] text-brand-charcoal/70 leading-relaxed font-semibold">
              Secure priority postage directly to your residential doorstep. Custom quotes dispatched instantly.
            </p>
          </div>

        </div>
      </section>

      {/* Primary Brand Footer info */}
      <footer className="bg-brand-charcoal text-white pt-12 pb-6 px-4 md:px-8 font-sans">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/10 pb-8 gap-8">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-pink text-brand-charcoal font-display font-bold text-md flex items-center justify-center rotate-[-4deg]">
                CV
              </div>
              <span className="font-display text-xl font-bold">
                Custom<span className="text-brand-pink">Vibe</span>
              </span>
            </div>
            <p className="text-xs text-brand-pastel-peach font-display font-medium">
              &quot;Find your tribe at Custom Vibe&quot;
            </p>
            <p className="text-[11px] text-white/60 max-w-sm leading-relaxed">
              We specialize in turning your beautiful phone photos, squad voyages, kitten moments, and aesthetic boards into durable grid-aligned matching fridge magnets.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">Vibe navigation</span>
              <ul className="space-y-1.5 text-xs text-white/80">
                <li><button onClick={() => setActiveTab('designer')} className="hover:text-brand-pink transition-colors cursor-pointer text-left">Designer Studio</button></li>
                <li><button onClick={() => {
                  setActiveTab('hero');
                  setTimeout(() => {
                    document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }} className="hover:text-brand-pink transition-colors cursor-pointer text-left">Pricing & Bundles</button></li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">Contact Us</span>
              <p className="text-xs text-white/80">hello@customvibe.co.za</p>
              <p className="text-xs text-white/80">+27 (0) 31 555-VIBE</p>
              <p className="text-[10px] text-white/50 block">Durban, South Africa</p>
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">100% Secure Guarantee</span>
              <div className="flex items-center gap-1 text-[11px] text-brand-pastel-mint">
                <ShieldCheck className="w-4 h-4 text-brand-pastel-mint" /> Secure SSL Checked
              </div>
              <p className="text-[10px] text-white/55 leading-relaxed">
                Images of designed templates are handled in strict sandboxed compliance. Perfect privacy for personal memories.
              </p>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between text-[10px] text-white/40 gap-4">
          <p>&copy; {new Date().getFullYear()} CustomVibe Magnets Ltd. All rights reserved.</p>
          <div className="flex gap-4">
            <button onClick={() => setActiveInfoModal('privacy')} className="hover:text-brand-pink transition-colors cursor-pointer">Privacy Policy</button>
            <span>•</span>
            <button onClick={() => setActiveInfoModal('terms')} className="hover:text-brand-pink transition-colors cursor-pointer">Terms of Craft</button>
            <span>•</span>
            <button onClick={() => setActiveInfoModal('contact')} className="hover:text-brand-pink transition-colors cursor-pointer">Local Tribe Coordinates</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
