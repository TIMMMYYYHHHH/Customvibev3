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
    <header className="sticky top-0 z-50 bg-[#faf5f5]/92 backdrop-blur-md border-b border-brand-pink/30 px-6 md:px-12 py-4 shadow-[0_2px_20px_rgba(255,182,193,0.08)]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        {/* Soft-Pink Brand Logo & Moto */}
        <Link
          to="/"
          className="flex items-center gap-3.5 cursor-pointer group self-center md:self-auto"
          id="brand-logo-container"
        >
          <div className="w-11 h-11 rounded-2xl bg-brand-charcoal text-[#ffeef1] font-display font-bold text-xl flex items-center justify-center shadow-md rotate-[-5deg] group-hover:rotate-[5deg] group-hover:bg-brand-pink group-hover:text-brand-charcoal transition-all duration-300">
            CV
          </div>
          <div className="text-left select-none">
            <span className="font-display text-2xl font-bold tracking-tight text-brand-charcoal">
              Custom<span className="text-brand-pink-text">Vibe</span>
            </span>
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest leading-none mt-0.5">
              Premium Fridge Prints
            </p>
          </div>
        </Link>

        {/* Studio Navigation pillbox with smooth slide indicators */}
        <nav className="flex items-center justify-center gap-1 bg-[#ffeef1] p-1 rounded-2xl border border-brand-pink/30">
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
                className={`relative px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'text-brand-charcoal z-10'
                    : 'text-zinc-500 hover:text-brand-charcoal'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute inset-0 bg-white shadow-3xs rounded-xl"
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
          className={`relative px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer self-center md:self-auto ${
            location.pathname === '/quote'
              ? 'bg-brand-charcoal text-white shadow-md'
              : 'bg-brand-pink hover:bg-brand-pink-dark text-[#2c181b] shadow-3xs hover:shadow-xs'
          }`}
        >
          <ShoppingBag className="w-4.5 h-4.5 text-brand-charcoal" />
          <span>Request Quote</span>
          {totalMagnets > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-brand-charcoal text-[#ffeef1] font-mono font-bold text-[10px] h-5 px-1.5 rounded-full flex items-center justify-center gap-0.5 animate-bounce shadow-sm border border-brand-pink/40 whitespace-nowrap">
              {totalMagnets} &bull; R{totalCost}
            </span>
          )}
        </button>

      </div>
    </header>
  );
}
