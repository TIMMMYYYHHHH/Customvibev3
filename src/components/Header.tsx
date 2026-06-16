import React from 'react';
import { motion } from 'motion/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, ShoppingBag, Layers, Percent } from 'lucide-react';
import { MagnetDesign } from '../types';
import { calculateBundlePrice } from '../utils/pricing';

interface HeaderProps {
  designs: MagnetDesign[];
  onRequestQuote?: () => void;
}

export default function Header({ designs, onRequestQuote }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const totalMagnets = designs.reduce((sum, item) => sum + item.quantity, 0);
  const { cost: totalCost } = calculateBundlePrice(totalMagnets);

  const tabs = [
    { id: 'hero', label: 'Explore Custom Vibe', icon: Sparkles, path: '/' },
    { id: 'designer', label: 'Design Studio', icon: Layers, path: '/design' },
    { id: 'pricing', label: 'Bundles & Pricing', icon: Percent, path: '/#pricing-section' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-brand-cream/92 backdrop-blur-md border-b border-brand-pink/30 px-6 md:px-12 py-4 shadow-raised">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        {/* Soft-Pink Brand Logo & Moto */}
        <Link
          to="/"
          className="flex items-center gap-3.5 cursor-pointer group self-center md:self-auto"
          id="brand-logo-container"
        >
          <div className="w-11 h-11 rounded-control bg-brand-charcoal text-brand-pink-soft font-display font-bold text-xl flex items-center justify-center shadow-soft rotate-[-5deg] group-hover:rotate-[5deg] group-hover:bg-brand-pink group-hover:text-brand-charcoal transition-all duration-300">
            CV
          </div>
          <div className="text-left select-none">
            <span className="font-display text-2xl font-bold tracking-tight text-brand-charcoal">
              Custom<span className="text-brand-pink-text">Vibe</span>
            </span>
            <p className="text-label-xs font-mono text-zinc-400 uppercase tracking-widest leading-none mt-0.5">
              Premium Fridge Prints
            </p>
          </div>
        </Link>

        {/* Studio Navigation pillbox with smooth slide indicators */}
        <nav className="flex items-center justify-center gap-1 bg-brand-pink-soft p-1 rounded-card border border-brand-pink/30">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.path === '/'
              ? location.pathname === '/' && !location.hash
              : tab.path.startsWith('/#')
                ? location.pathname === '/' && location.hash === tab.path.slice(1)
                : location.pathname === tab.path;
            return (
              <Link
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                to={tab.path}
                className={`relative px-5 py-2.5 rounded-control text-xs md:text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'text-brand-charcoal z-10'
                    : 'text-zinc-500 hover:text-brand-charcoal'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute inset-0 bg-white shadow-raised rounded-control"
                    style={{ originY: '0px' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="w-4 h-4 text-brand-pink-text" />
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Custom Quote Request Basket Button */}
        <button
          id="nav-quote-basket"
          onClick={() => (onRequestQuote ? onRequestQuote() : navigate('/quote'))}
          className={`relative px-5 py-2.5 rounded-control text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer self-center md:self-auto ${
            location.pathname === '/quote'
              ? 'bg-brand-charcoal text-white shadow-floating'
              : 'bg-brand-pink hover:bg-brand-pink-dark text-[#2c181b] shadow-soft hover:shadow-raised'
          }`}
        >
          <ShoppingBag className="w-4.5 h-4.5 text-brand-charcoal" />
          <span>Request Quote</span>
          {totalMagnets > 0 && (
            <motion.span
              key={totalMagnets}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className="absolute -top-1.5 -right-1.5 bg-brand-charcoal text-brand-pink-soft font-mono font-bold text-label-xs h-5 px-1.5 rounded-full flex items-center justify-center gap-0.5 shadow-soft border border-brand-pink/40 whitespace-nowrap"
            >
              {totalMagnets} &bull; R{totalCost}
            </motion.span>
          )}
        </button>

      </div>
    </header>
  );
}
