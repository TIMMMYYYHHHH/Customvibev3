import React from 'react';
import { motion } from 'motion/react';
import { X, ShoppingBag, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { MagnetDesign } from '../types';
import { calculateBundlePrice } from '../utils/pricing';

interface QuoteSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  designs: MagnetDesign[];
  onProceed: () => void;
}

export default function QuoteSummaryModal({
  isOpen,
  onClose,
  designs,
  onProceed
}: QuoteSummaryModalProps) {
  if (!isOpen) return null;

  const calculateTotalQuantity = () => {
    return designs.reduce((sum, d) => sum + d.quantity, 0);
  };

  const totalQty = calculateTotalQuantity();
  const totalPriceEst = calculateBundlePrice(totalQty).cost;
  
  const normalPriceSum = totalQty * 50;
  const savings = Math.max(0, normalPriceSum - totalPriceEst);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-charcoal/45 backdrop-blur-xs"
      id="summary-modal-overlay"
    >
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Dialog Content Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-white w-full max-w-2xl rounded-panel border border-brand-pink-soft shadow-floating p-6 sm:p-9 overflow-hidden z-10 text-left"
        id="summary-modal-content-card"
      >
        {/* Subtle depth wash, replacing the previous purposeless decorative blur circles */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-pink-soft/40 via-transparent to-transparent pointer-events-none" />

        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-neutral-100 text-zinc-400 hover:text-brand-charcoal transition-colors cursor-pointer"
          id="summary-modal-close-btn"
          aria-label="Close summary modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4 mb-6 text-left">
          <div className="w-12 h-12 rounded-control bg-brand-pink-soft text-brand-pink-text flex items-center justify-center shadow-soft">
            <ShoppingBag className="w-5 h-5 text-brand-pink-text" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl md:text-2xl text-brand-charcoal">
              Design Summary
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mt-0.5">
              Verify your custom selections before providing shipping instructions.
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-1">
          {designs.length === 0 ? (
            <div className="text-center py-10 space-y-4">
              <p className="text-sm font-semibold text-zinc-500">Your design studio list is currently empty.</p>
              <button
                onClick={onClose}
                className="py-2 px-5 rounded-control bg-brand-pink-soft text-brand-pink-text text-xs font-bold hover:bg-brand-pink/30 cursor-pointer"
                id="summary-modal-add-designs-btn"
              >
                Go Add Magnet Cards
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <span className="block text-label-xs font-mono font-bold text-brand-pink-text uppercase tracking-widest text-left">
                Basket Items List ({designs.length})
              </span>

              {/* Items List */}
              <div className="space-y-2.5">
                {designs.map((design, index) => {
                  return (
                    <div 
                      key={design.id}
                      className="p-3.5 bg-brand-cream/65 border border-brand-pink-soft/75 rounded-card flex items-center justify-between gap-4 text-left"
                      id={`summary-modal-item-${design.id}`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Thumbnail — rounded-none is intentional, a sharp "photo print" edge */}
                        <div className="relative w-12 h-12 rounded-none overflow-hidden border border-brand-pink-soft/80 shrink-0 bg-zinc-100">
                          <img
                            src={design.imageUrl}
                            alt={design.name}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Metadata */}
                        <div className="min-w-0">
                          <h4 className="font-sans font-semibold text-xs text-brand-charcoal truncate">
                            {design.name || `Photo Magnet #${index + 1}`}
                          </h4>
                          <p className="text-label-xs text-zinc-400 font-semibold mt-0.5 font-mono">
                            7.5 x 7.5 cm size • Zoom: {design.cropZoom ?? 100}%
                          </p>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="text-right shrink-0">
                        <span className="block text-xs font-mono font-bold text-brand-charcoal">
                          {design.quantity} unit{design.quantity !== 1 ? 's' : ''}
                        </span>
                        <span className="block text-label-xs text-brand-pink-text font-bold uppercase tracking-wider">
                          R{design.quantity * 50} base
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pricing Breakdown Card */}
              <div className="bg-brand-pink-soft/60 border border-brand-pink/30 p-5 rounded-card space-y-4">
                <div className="flex items-center justify-between border-b border-brand-pink/20 pb-3">
                  <span className="text-label-xs font-mono font-bold uppercase tracking-widest text-brand-pink-text">
                    Production Estimate Breakdown
                  </span>
                  <span className="bg-white p-1 px-3 rounded-full text-label-xs font-bold text-brand-charcoal border border-brand-pink/20">
                    Gloss Finish Wrap
                  </span>
                </div>

                <div className="space-y-2 text-xs text-brand-charcoal/80 font-semibold text-left">
                  <div className="flex justify-between">
                    <span>Base material rate:</span>
                    <span className="font-mono">R50.00 / item</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total magnets count:</span>
                    <span className="font-bold font-mono text-brand-charcoal">{totalQty} Magnet{totalQty !== 1 ? 's' : ''}</span>
                  </div>

                  {totalQty >= 6 && (
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-label-xs pt-1.5 border-t border-brand-pink/20 mt-1">
                      <Tag className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Applied bundle rates active!</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-brand-pink/20 pt-4 mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
                  <div>
                    <span className="block text-label-xs text-zinc-500 font-bold uppercase tracking-wider">
                      Estimated Production Cost
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-3xl font-mono font-bold text-brand-charcoal">
                        R{Math.round(totalPriceEst)}
                      </span>
                      {savings > 0 && (
                        <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 p-1 px-2.5 rounded-control">
                          Saved R{Math.round(savings)}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-label-xs text-zinc-400 max-w-[240px] text-left sm:text-right font-medium leading-relaxed">
                    Courier fees are computed during shipping verification.
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="mt-8 pt-5 border-t border-brand-pink-soft/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left hidden sm:block">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Free Image Proportions Quality Check</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial py-3 px-5 rounded-control border border-brand-pink-soft hover:bg-neutral-50 text-brand-charcoal text-xs font-bold transition-all cursor-pointer text-center"
              id="summary-modal-cancel-btn"
            >
              Keep Editing
            </button>
            <button
              onClick={() => {
                onProceed();
              }}
              disabled={designs.length === 0}
              className="flex-1 sm:flex-initial py-3 px-6 rounded-control bg-brand-charcoal text-white hover:bg-brand-pink hover:text-brand-charcoal text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-floating disabled:opacity-40 cursor-pointer"
              id="summary-modal-proceed-btn"
            >
              Confirm and Proceed
              <ArrowRight className="w-4 h-4 text-brand-pink-text" />
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
