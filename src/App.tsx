import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Heart, MapPin, Camera, Layers } from 'lucide-react';
import { MagnetDesign } from './types';

// Importing CustomVibe sub-components
import Header from './components/Header';
import Hero from './components/Hero';
import PricingCalculator from './components/PricingCalculator';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import WhatsAppButton from './components/WhatsAppButton';
import { usePageMeta } from './hooks/usePageMeta';

// Route-level code splitting: these are only needed once a user navigates
// to that specific route (or opens the modal), so keep them out of the
// initial bundle that loads on first paint.
const MagnetDesigner = lazy(() => import('./components/MagnetDesigner'));
const QuoteForm = lazy(() => import('./components/QuoteForm'));
const QuoteSummaryModal = lazy(() => import('./components/QuoteSummaryModal'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PrivacyPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.TermsPage })));
const ContactPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.ContactPage })));

function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 border-brand-pink/40 border-t-brand-pink-text animate-spin" />
    </div>
  );
}

const PAGE_META: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'CustomVibe | Custom Photo Fridge Magnets in Durban, South Africa',
    description: 'Design your own photo fridge magnets with CustomVibe. Upload photos, build a custom grid, and get a quote for premium 7.5cm gloss-finish magnets, handmade and delivered across South Africa.',
  },
  '/design': {
    title: 'Design Studio | CustomVibe Custom Photo Magnets',
    description: 'Upload your photos and design custom 7.5cm gloss-finish fridge magnets in our interactive Design Studio. Crop, position, and bundle your magnets, then request a quote.',
  },
  '/quote': {
    title: 'Get a Quote | CustomVibe Custom Photo Magnets',
    description: 'Review your custom magnet order, enter your delivery details, and submit a quote request to CustomVibe.',
  },
  '/privacy': {
    title: 'Privacy Policy | CustomVibe',
    description: 'How CustomVibe collects, uses, and protects your personal information and uploaded photos.',
  },
  '/terms': {
    title: 'Terms of Craft | CustomVibe',
    description: 'The terms that apply when you order custom photo fridge magnets from CustomVibe.',
  },
  '/contact': {
    title: 'Contact Us | CustomVibe',
    description: 'Get in touch with CustomVibe for questions about your custom photo fridge magnet order.',
  },
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const meta = PAGE_META[location.pathname] ?? PAGE_META['/'];
  usePageMeta(meta.title, meta.description, location.pathname);

  const [designs, setDesigns] = useState<MagnetDesign[]>([]);
  const [activeDesignId, setActiveDesignId] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

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

  // Scroll to an in-page anchor (e.g. /#pricing-section) once the target route has rendered
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const timeout = setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [location.pathname, location.hash]);

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
    navigate('/design');
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
        designs={designs}
        onRequestQuote={() => setShowSummaryModal(true)}
      />

      {/* Main routed page stage */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <div key={location.pathname}>
            <Suspense fallback={<RouteLoadingFallback />}>
            <Routes location={location}>
              <Route
                path="/"
                element={
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="space-y-4"
                  >
                    <Hero
                      onStartDesigning={() => navigate('/design')}
                      onLoadPreset={handleLoadPreset}
                    />
                    <hr className="border-brand-pink-soft max-w-7xl mx-auto opacity-40" />
                    <PricingCalculator
                      onStartDesigning={() => navigate('/design')}
                    />
                    <Testimonials />
                    <FAQ />
                  </motion.div>
                }
              />

              <Route
                path="/design"
                element={
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                  >
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
                  </motion.div>
                }
              />

              <Route
                path="/quote"
                element={
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                  >
                    <QuoteForm
                      designs={designs}
                      onUpdateDesign={handleUpdateDesign}
                      onDeleteDesign={handleDeleteDesign}
                      onClearAllDesigns={handleClearAllDesigns}
                      onNavigateToDesigner={() => navigate('/design')}
                    />
                  </motion.div>
                }
              />

              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            </Suspense>
          </div>
        </AnimatePresence>
      </main>

      {/* Quote Summary Modal Overlay */}
      <AnimatePresence>
        {showSummaryModal && (
          <Suspense fallback={null}>
            <QuoteSummaryModal
              isOpen={showSummaryModal}
              onClose={() => setShowSummaryModal(false)}
              designs={designs}
              onProceed={() => {
                setShowSummaryModal(false);
                navigate('/quote');
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Floating WhatsApp click-to-chat button */}
      <WhatsAppButton />

      {/* Brand Value Proposition footer cards */}
      <section className="bg-white border-t border-brand-pink-soft py-10 px-4 md:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 text-center md:text-left">

          <div className="space-y-2 p-4 rounded-2xl hover:bg-[#fff0f3]/45 transition-colors">
            <Camera className="w-6 h-6 text-brand-pink-text mx-auto md:mx-0" />
            <h4 className="font-display font-bold text-sm text-brand-charcoal">High-Definition Print Gloss</h4>
            <p className="text-[11.5px] text-brand-charcoal/70 leading-relaxed font-semibold">
              Waterproof protection coating layer safeguards details against greasy hands, humidity, or sunlight bleach.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl hover:bg-[#fff0f3]/45 transition-colors">
            <Layers className="w-6 h-6 text-brand-pink-text mx-auto md:mx-0" />
            <h4 className="font-display font-bold text-sm text-brand-charcoal">Strong Flexible Rubber Grip</h4>
            <p className="text-[11.5px] text-brand-charcoal/70 leading-relaxed font-semibold">
              Sturdy 3mm backing won&apos;t slip or slide when slamming refrigerator doors. Clings beautifully.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl hover:bg-[#fff0f3]/45 transition-colors">
            <Heart className="w-6 h-6 text-brand-pink-text mx-auto md:mx-0" />
            <h4 className="font-display font-bold text-sm text-brand-charcoal">Local Craftsmanship</h4>
            <p className="text-[11.5px] text-brand-charcoal/70 leading-relaxed font-semibold">
              Made with pride by custom design lovers. Hand-inspected and carefully trimmed square templates.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl hover:bg-[#fff0f3]/45 transition-colors">
            <MapPin className="w-6 h-6 text-brand-pink-text mx-auto md:mx-0" />
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
                <li><Link to="/design" className="hover:text-brand-pink transition-colors">Designer Studio</Link></li>
                <li><Link to="/#pricing-section" className="hover:text-brand-pink transition-colors">Pricing &amp; Bundles</Link></li>
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
            <Link to="/privacy" className="hover:text-brand-pink transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-brand-pink transition-colors">Terms of Craft</Link>
            <span>•</span>
            <Link to="/contact" className="hover:text-brand-pink transition-colors">Local Tribe Coordinates</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
