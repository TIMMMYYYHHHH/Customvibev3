import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag, Mail, User, Phone, MapPin, Sparkles, CheckCircle2,
  ChevronRight, Clipboard, Trash2, Printer, Compass, ArrowLeft, CreditCard
} from 'lucide-react';
import { MagnetDesign, QuoteRequest } from '../types';
import { calculateBundlePrice } from '../utils/pricing';

// TODO: create a free Formspree (or EmailJS) account and replace this with
// your real form endpoint so quote submissions are actually delivered to you.
const QUOTE_FORM_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID';

async function deliverQuoteRequest(quote: QuoteRequest): Promise<void> {
  try {
    await fetch(QUOTE_FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(quote),
    });
  } catch (error) {
    console.error('Quote submission delivery failed, check QUOTE_FORM_ENDPOINT setup', error);
  }
}

interface QuoteFormProps {
  designs: MagnetDesign[];
  onUpdateDesign: (design: MagnetDesign) => void;
  onDeleteDesign: (id: string) => void;
  onClearAllDesigns: () => void;
  onNavigateToDesigner: () => void;
}

export default function QuoteForm({
  designs,
  onUpdateDesign,
  onDeleteDesign,
  onClearAllDesigns,
  onNavigateToDesigner
}: QuoteFormProps) {
  // Multi-step quote process: 'review' | 'details' | 'success'
  const [step, setStep] = useState<'review' | 'details' | 'success'>('review');
  const [submitCopied, setSubmitCopied] = useState(false);

  // Form parameters
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [remarks, setRemarks] = useState('');

  // Submit Quote results tracker
  const [submittedQuote, setSubmittedQuote] = useState<QuoteRequest | null>(null);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateTotalQty = () => {
    return designs.reduce((sum, d) => sum + d.quantity, 0);
  };

  const totalQty = calculateTotalQty();
  const { cost: totalPrice, savings: potentialSavings } = calculateBundlePrice(totalQty);

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientEmail || !clientPhone || !address) {
      setValidationError("Please fill in all standard contact and delivery details.");
      return;
    }
    setValidationError('');

    const compiledQuote: QuoteRequest = {
      customerName: clientName,
      customerEmail: clientEmail,
      customerPhone: clientPhone,
      deliveryAddress: address,
      additionalNotes: remarks,
      designs: [...designs],
      totalPriceEstimate: Math.round(totalPrice),
      status: 'submitted'
    };

    setIsSubmitting(true);
    await deliverQuoteRequest(compiledQuote);
    setIsSubmitting(false);

    setSubmittedQuote(compiledQuote);
    setStep('success');
  };

  const copyReceiptToClipboard = () => {
    if (!submittedQuote) return;

    let textReceipt = `====================================\n`;
    textReceipt += `CUSTOMVIBE MAGNETS - QUOTE REQUEST\n`;
    textReceipt += `====================================\n`;
    textReceipt += `Order Estimated Cost: R${submittedQuote.totalPriceEstimate}\n`;
    textReceipt += `Contact Name: ${submittedQuote.customerName}\n`;
    textReceipt += `Email Address: ${submittedQuote.customerEmail}\n`;
    textReceipt += `Phone Number: ${submittedQuote.customerPhone}\n`;
    textReceipt += `Delivery Address: ${submittedQuote.deliveryAddress}\n`;
    if (submittedQuote.additionalNotes) {
      textReceipt += `Comments: ${submittedQuote.additionalNotes}\n`;
    }
    textReceipt += `\n----- DESIGNED MAGNET ITEMS -----\n`;
    submittedQuote.designs.forEach((d, idx) => {
      textReceipt += `#${idx + 1}: [${d.name}] - Qty: ${d.quantity} pcs - Size: 7.5x7.5cm (Full Bleed Glossy)\n`;
    });
    textReceipt += `\n====================================\n`;
    textReceipt += `Find your tribe at Custom Vibe!\n`;

    navigator.clipboard.writeText(textReceipt).then(() => {
      setSubmitCopied(true);
      setTimeout(() => setSubmitCopied(false), 2500);
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-12 py-section-md" id="quote-basket-component">
      
      {/* Visual Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-12 w-full select-none" id="quote-steps-stepper">
        {[
          { id: 'review', label: '1. Verify Order' },
          { id: 'details', label: '2. Delivery Space' },
          { id: 'success', label: '3. Complete Request' },
        ].map((s, index) => {
          const isComplete = (step === 'details' && s.id === 'review') || step === 'success';
          const isActive = step === s.id;
          return (
            <React.Fragment key={s.id}>
              <div className={`text-xs md:text-sm font-semibold rounded-control px-5 py-2.5 flex items-center gap-2 transition-all duration-300 ${
                isActive
                  ? 'bg-brand-charcoal text-white shadow-raised'
                  : isComplete
                    ? 'bg-brand-pastel-mint text-brand-charcoal font-bold'
                    : 'bg-brand-pink-soft text-zinc-500'
              }`}>
                {isComplete ? '✓' : index + 1 + '.'} {s.label}
              </div>
              {index < 2 && (
                <div className={`h-0.5 w-10 md:w-16 ${isComplete ? 'bg-brand-pastel-mint' : 'bg-brand-pink/35'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        
        {/* ================= STEP 1: REVIEW CURRENT DESIGNS IN ORDER ================= */}
        {step === 'review' && (
          <motion.div
            key="step-review"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            className="space-y-8"
          >
            <div className="text-center md:text-left space-y-1">
              <h2 className="font-display font-bold text-3xl md:text-4xl text-brand-charcoal">Verify your custom magnets order</h2>
              <p className="text-xs text-zinc-500 font-semibold">
                Review and update individual counts before submitting your official quote bundle.
              </p>
            </div>

            {designs.length === 0 ? (
              <div className="bg-white rounded-panel p-12 border border-brand-pink-soft text-center space-y-5 shadow-soft">
                <ShoppingBag className="w-14 h-14 text-brand-pink-text mx-auto animate-pulse" />
                <p className="font-display font-bold text-xl text-brand-charcoal">No designed magnets in your basket yet</p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto font-semibold leading-relaxed">
                  Head over to the Design Studio, upload your custom layouts, and position them nicely to watch your pricing adjust.
                </p>
                <button
                  onClick={onNavigateToDesigner}
                  className="px-6 py-3 rounded-control bg-brand-pink hover:bg-brand-pink-dark text-brand-charcoal font-display font-bold text-xs shadow-soft cursor-pointer inline-flex items-center gap-2"
                >
                  <Compass className="w-4.5 h-4.5" /> Back to Design Studio
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Visual items card lists */}
                <div className="bg-white rounded-panel p-8 border border-brand-pink-soft shadow-soft space-y-6">

                  <div className="flex justify-between items-center pb-4 border-b border-brand-pink-soft/60">
                    <span className="text-label-xs font-mono font-bold uppercase tracking-widest text-zinc-400">Current Design Stack</span>
                    <button 
                      onClick={() => {
                        if(confirm("Are you sure you want to completely clear your draft design list?")) {
                          onClearAllDesigns();
                        }
                      }}
                      className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Clear basket
                    </button>
                  </div>

                  <div className="divide-y divide-brand-pink-soft/50 max-h-[420px] overflow-y-auto pr-2">
                    {designs.map((design) => (
                      <div key={design.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                        {/* Summary details */}
                        <div className="flex items-center gap-4 text-left">
                          {/* rounded-none is intentional — sharp "photo print" thumbnail edge */}
                          <div className="relative w-16 h-16 rounded-none border border-brand-pink-soft overflow-hidden shrink-0">
                            <img
                              src={design.imageUrl}
                              alt={design.name}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/10" />
                          </div>

                          <div>
                            <h4 className="font-sans font-bold text-xs text-brand-charcoal truncate max-w-[170px] sm:max-w-xs">{design.name}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-label-xs text-zinc-400 font-mono font-bold">
                              <span className="bg-brand-pink-soft text-brand-pink-text px-2 py-0.5 rounded-control">7.5 cm Perfect Square</span>
                              <span>Full Bleed Gloss</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive adjustments */}
                        <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-0 pt-3 sm:pt-0 border-brand-pink-soft/40">
                          <div className="flex items-center bg-zinc-50 border border-brand-pink-soft rounded-control p-0.5 shadow-soft">
                            <button
                              onClick={() => onUpdateDesign({ ...design, quantity: Math.max(1, design.quantity - 1) })}
                              className="w-9 h-9 hover:bg-white text-brand-charcoal rounded-control font-bold text-xs flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-mono text-xs font-bold text-brand-charcoal w-6 text-center">{design.quantity}</span>
                            <button
                              onClick={() => onUpdateDesign({ ...design, quantity: design.quantity + 1 })}
                              className="w-9 h-9 hover:bg-white text-brand-charcoal rounded-control font-bold text-xs flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold text-brand-charcoal/80 shrink-0">
                              R{design.quantity * 50}
                            </span>
                            <button
                              onClick={() => onDeleteDesign(design.id)}
                              className="p-2 rounded-control text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                              title="Discard design"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>

                </div>

                {/* Estimate total overview */}
                <div className="bg-brand-pink-soft/60 rounded-panel p-8 border border-brand-pink/30 flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                  <div className="space-y-1 text-left">
                    <p className="text-label-xs font-mono font-bold text-brand-pink-text uppercase tracking-widest">Calculated Price Estimate</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-mono font-bold text-brand-charcoal">R{Math.round(totalPrice)}</span>
                      <span className="text-xs text-[#2c181b]/50 font-bold">•</span>
                      <span className="text-xs font-sans font-semibold text-brand-charcoal">
                        {totalQty} standard magnets ordered
                      </span>
                    </div>
                    {potentialSavings > 0 && (
                      <span className="text-xs text-emerald-700 font-semibold block pt-1 bg-emerald-50 px-3.5 py-1 rounded-control w-max border border-emerald-100">
                        Volume discount saves you R{Math.round(potentialSavings)}!
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={onNavigateToDesigner}
                      className="px-6 py-3.5 rounded-control bg-white hover:bg-neutral-50 border border-brand-pink-soft text-brand-charcoal font-display font-medium text-xs shadow-soft cursor-pointer"
                    >
                      Keep Designing
                    </button>
                    <button
                      id="quote-proceed-to-shipping-btn"
                      onClick={() => setStep('details')}
                      className="px-7 py-3.5 rounded-control bg-brand-charcoal text-white hover:bg-brand-pink hover:text-brand-charcoal font-display font-semibold text-xs shadow-floating flex items-center gap-1.5 cursor-pointer"
                    >
                      Enter Shipping Info <ChevronRight className="w-4 h-4 text-brand-pink" />
                    </button>
                  </div>

                </div>

              </div>
            )}

          </motion.div>
        )}

        {/* ================= STEP 2: FILL IN SHIPPING & NAME CONTACT DETAILS ================= */}
        {step === 'details' && (
          <motion.div
            key="step-details"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4 text-left">
              <button
                onClick={() => setStep('review')}
                className="p-1 px-3.5 py-2 rounded-control bg-white border border-brand-pink-soft text-xs text-brand-charcoal font-bold cursor-pointer hover:bg-neutral-50 flex items-center gap-1 shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-brand-pink-text" /> Back
              </button>
              <div>
                <h2 className="font-display font-bold text-3xl md:text-4xl text-brand-charcoal">Delivery Coordinates</h2>
                <p className="text-xs text-zinc-500 font-semibold mt-0.5">Please specify correct destination details so we can quote couriers properly.</p>
              </div>
            </div>

            <form onSubmit={handleSubmitQuote} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white rounded-panel p-8 border border-brand-pink-soft shadow-soft">

              {/* Contact Full Name */}
              <div className="space-y-1.5 md:col-span-2 text-left">
                <label htmlFor="quote-client-name" className="block text-xs font-bold text-brand-charcoal flex items-center gap-1.5 font-sans">
                  <User className="w-4 h-4 text-brand-pink-text" /> Full Name
                </label>
                <input
                  id="quote-client-name"
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full p-3.5 rounded-control border border-brand-pink-soft text-xs text-brand-charcoal focus:outline bg-brand-cream/30 focus:bg-white font-semibold"
                  placeholder="e.g. Sipho Nkosi"
                />
              </div>

              {/* Email address */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="quote-client-email" className="block text-xs font-bold text-brand-charcoal flex items-center gap-1.5 font-sans">
                  <Mail className="w-4 h-4 text-brand-pink-text" /> Email Address
                </label>
                <input
                  id="quote-client-email"
                  type="email"
                  required
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full p-3.5 rounded-control border border-brand-pink-soft text-xs text-brand-charcoal focus:outline bg-brand-cream/30 focus:bg-white font-semibold"
                  placeholder="e.g. sipho@gmail.com"
                />
              </div>

              {/* Phone number */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="quote-client-phone" className="block text-xs font-bold text-brand-charcoal flex items-center gap-1.5 font-sans">
                  <Phone className="w-4 h-4 text-brand-pink-text" /> Phone Number
                </label>
                <input
                  id="quote-client-phone"
                  type="tel"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full p-3.5 rounded-control border border-brand-pink-soft text-xs text-brand-charcoal focus:outline bg-brand-cream/30 focus:bg-white font-semibold"
                  placeholder="e.g. +27 82 123 4567"
                />
              </div>

              {/* Delivery Address */}
              <div className="space-y-1.5 md:col-span-2 text-left">
                <label htmlFor="quote-address" className="block text-xs font-bold text-brand-charcoal flex items-center gap-1.5 font-sans">
                  <MapPin className="w-4 h-4 text-brand-pink-text" /> Delivery Address
                </label>
                <textarea
                  id="quote-address"
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-3.5 rounded-control border border-brand-pink-soft text-xs text-brand-charcoal focus:outline bg-brand-cream/30 focus:bg-white resize-none font-semibold"
                  placeholder="e.g. 102 Florida Road, Morningside, Durban, 4001"
                />
              </div>

              {/* Additional Comments */}
              <div className="space-y-1.5 md:col-span-2 text-left">
                <label htmlFor="quote-remarks" className="block text-xs font-bold text-brand-charcoal font-sans">
                  Special Assembly Instructions (Optional)
                </label>
                <textarea
                  id="quote-remarks"
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full p-3.5 rounded-control border border-brand-pink-soft text-xs text-brand-charcoal focus:outline bg-brand-cream/30 focus:bg-white resize-none font-semibold"
                  placeholder="e.g. Giftwrapping details, border spacing comments..."
                />
              </div>

              {validationError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  className="md:col-span-2 p-3 bg-red-50 text-red-700 rounded-control border border-red-100 text-xs font-semibold text-center text-balance"
                >
                  {validationError}
                </motion.div>
              )}

              <div className="md:col-span-2 border-t border-brand-pink-soft pt-6 mt-2 flex flex-col md:flex-row items-center justify-between gap-4 text-left">
                <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
                  By clicking submit, our design specialists review image proportions to guarantee standard beautiful physical output profiles.
                </p>
                <button
                  id="quote-final-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-8 py-3.5 rounded-control bg-brand-charcoal hover:bg-brand-pink hover:text-brand-charcoal text-white font-display font-semibold transition-colors text-xs shadow-floating cursor-pointer text-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Submit Quote Request'}
                </button>
              </div>

            </form>
          </motion.div>
        )}

        {/* ================= STEP 3: SUCCESS BLOCK ================= */}
        {step === 'success' && submittedQuote && (
          <motion.div
            key="step-success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6 text-center"
          >
            
            <div className="bg-white rounded-panel p-8 md:p-12 border border-brand-pink-soft shadow-floating space-y-6 relative overflow-hidden">
              {/* Colored circle reserved for this one purpose — a positive/success status indicator */}
              <div className="w-16 h-16 rounded-full bg-brand-pastel-mint text-emerald-800 flex items-center justify-center mx-auto shadow-soft">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>

              <div className="space-y-2">
                <h3 className="font-display font-bold text-xl md:text-2xl text-brand-charcoal">
                  Quote Request Dispatched!
                </h3>
                <p className="text-sm text-zinc-500 max-w-md mx-auto font-semibold leading-relaxed">
                  Excellent work, <strong className="text-brand-pink-text font-bold">{submittedQuote.customerName}</strong>! Our design squad has received the high resolution vector templates.
                </p>
              </div>

              {/* Estimate summary box */}
              <div className="bg-brand-pink-soft/60 p-5 rounded-card max-w-md mx-auto border border-brand-pink/30 text-center">
                <p className="text-label-xs font-mono font-bold text-brand-pink-text uppercase tracking-widest">Estimated Value Summary</p>
                <p className="text-3xl font-mono font-bold text-brand-charcoal mt-1">R{submittedQuote.totalPriceEstimate}</p>
                <p className="text-label-xs text-zinc-500 mt-1 font-bold uppercase tracking-wider">{submittedQuote.designs.reduce((sum, d) => sum + d.quantity, 0)} Hand-finished Magnets</p>
              </div>

              <div className="border-t border-brand-pink-soft/80 pt-6 space-y-4">
                <p className="text-xs font-bold text-brand-charcoal text-center font-sans uppercase tracking-wider">
                  Personal Receipt Ledger
                </p>

                {/* Print receipt ledger */}
                <div className="bg-zinc-50 p-5 rounded-card text-left border border-zinc-200 font-mono text-label-xs text-brand-charcoal/85 space-y-2 max-h-[160px] overflow-y-auto pr-2">
                  <p className="font-bold text-brand-charcoal uppercase text-xs">Order ID: CV-{Math.floor(Math.random() * 89999 + 10000)}</p>
                  <p>Customer: {submittedQuote.customerName}</p>
                  <p>Email: {submittedQuote.customerEmail}</p>
                  <p>Phone: {submittedQuote.customerPhone}</p>
                  <p>Destination: {submittedQuote.deliveryAddress}</p>
                  <p className="font-bold border-t border-dashed border-zinc-200 pt-2 mt-2 uppercase text-label-xs">Included Magnet items:</p>
                  {submittedQuote.designs.map((d, index) => (
                    <p key={d.id}>- Item #{index+1} (&quot;{d.name}&quot;): {d.quantity} units (7.5x7.5 cm size)</p>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={copyReceiptToClipboard}
                    className="p-3.5 py-2 px-5 rounded-control bg-brand-pink-soft hover:bg-brand-pink-light text-brand-charcoal font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-soft"
                  >
                    <Clipboard className="w-4 h-4 text-brand-pink-text" />
                    <span>{submitCopied ? "Copied!" : "Copy Order Summary"}</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="p-3.5 py-2 px-5 rounded-control bg-brand-pink-soft hover:bg-brand-pink-light text-brand-charcoal font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-soft"
                  >
                    <Printer className="w-4 h-4 text-brand-pink-text" />
                    <span>Print Receipt</span>
                  </button>
                </div>
              </div>

              {/* Checkout / payment scaffold. Wire up a real payment provider (e.g. PayFast or Yoco) before launch. */}
              <div className="border-t border-brand-pink-soft/80 pt-6 space-y-3">
                <p className="text-xs font-bold text-brand-charcoal text-center font-sans uppercase tracking-wider">
                  Pay Now (Coming Soon)
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button
                    disabled
                    title="Connect a payment provider to enable this"
                    className="p-3.5 py-2 px-5 rounded-control bg-zinc-100 text-zinc-400 font-bold text-xs flex items-center gap-2 cursor-not-allowed shadow-soft"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay with PayFast</span>
                  </button>
                  <button
                    disabled
                    title="Connect a payment provider to enable this"
                    className="p-3.5 py-2 px-5 rounded-control bg-zinc-100 text-zinc-400 font-bold text-xs flex items-center gap-2 cursor-not-allowed shadow-soft"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay with Yoco</span>
                  </button>
                </div>
                <p className="text-label-xs text-zinc-400 text-center font-semibold">
                  For now we will follow up by email or WhatsApp to arrange payment.
                </p>
              </div>

              {/* Start new project button */}
              <div className="pt-4">
                <button
                  onClick={() => {
                    onClearAllDesigns();
                    setStep('review');
                    onNavigateToDesigner();
                  }}
                  className="px-7 py-3 rounded-control bg-brand-charcoal hover:bg-brand-pink text-white hover:text-brand-charcoal font-display font-medium text-xs shadow-floating transition-all"
                >
                  Start a New Studio Project
                </button>
              </div>

            </div>

          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
