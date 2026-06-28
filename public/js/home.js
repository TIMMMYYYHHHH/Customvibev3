import { iconSvg } from './icons.js';
import { addDesign } from './state.js';
import { calculateBundlePrice } from './pricing.js';
import { refreshBasketBadge } from './partials.js';

const SAMPLE_DESIGN = {
  name: 'Sample magnet',
  imageUrl: '/images/placeholder-magnet-2.svg',
  quantity: 1,
  sizeCm: 7.5,
};

const PRICING_PACKS = [
  {
    qty: '1 magnet',
    title: 'Try one',
    price: 'R50',
    unit: 'total',
    desc: 'Perfect for testing the quality before you commit to a bundle.',
    features: ['7.5 cm gloss square', '3 mm rubber backing', 'Hand-finished & inspected'],
    popular: false,
    cta: 'Design one',
  },
  {
    qty: '6 magnets',
    title: 'Family six-pack',
    price: 'R250',
    unit: 'total',
    desc: 'Our most-loved bundle. Mix up to six different photos.',
    features: ['Six unique photos', 'Saves R50 vs singles', 'Gift-ready packaging'],
    popular: true,
    cta: 'Design six',
  },
  {
    qty: '10+ magnets',
    title: 'Bulk pack',
    price: 'R40',
    unit: 'each',
    desc: 'Best value. Turn a whole gallery (or an event) into magnets.',
    features: ['Lowest price per magnet', 'Great for events & business', 'Priority studio time'],
    popular: false,
    cta: 'Design a bulk pack',
  },
];

const FAQ_ITEMS = [
  {
    q: 'What size are the magnets?',
    a: 'Each magnet is a 7.5 cm square with a high-gloss, waterproof finish and a 3 mm rubber backing that grips firmly to any fridge.',
  },
  {
    q: 'What photos can I use?',
    a: 'Any photo from your phone or camera (JPG, PNG or HEIC). Upload it in the studio and crop, zoom and position it before you order.',
  },
  {
    q: 'How does pricing work?',
    a: "It's bundled: the more magnets in one order, the less each one costs, from R50 for one down to R40 each for ten or more. The calculator above shows your exact total.",
  },
  {
    q: 'How do I pay?',
    a: 'For now, payment is by EFT (bank transfer). You\'ll get our banking details and an order reference when you place your order. Card and online payments are coming soon.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Typical turnaround is <span class="faq-placeholder">add real production + delivery time</span> from when your order is confirmed.',
  },
  {
    q: 'Do you deliver across South Africa?',
    a: 'Yes, we\'re based in Durban and ship nationwide. Delivery is <span class="faq-placeholder">add real shipping cost</span>, confirmed before you pay.',
  },
];

function setIcon(id, name, opts) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = iconSvg(name, opts);
}

function renderStaticIcons() {
  setIcon('hero-eyebrow-icon',     'Sparkles',     { size: 13 });
  setIcon('hero-cta-arrow',        'ArrowRight',   { size: 16 });
  setIcon('how-icon-1',            'Upload',       { size: 22 });
  setIcon('how-icon-2',            'PenTool',      { size: 22 });
  setIcon('how-icon-3',            'PackageCheck', { size: 22 });
  setIcon('how-arrow-1',           'ArrowRight',   { size: 18 });
  setIcon('how-arrow-2',           'ArrowRight',   { size: 18 });
  setIcon('pricing-eyebrow-icon',  'Tag',          { size: 13 });
  setIcon('pricing-percent-icon',  'Percent',      { size: 13 });
  setIcon('pricing-helping-icon',  'HelpingHand',  { size: 16 });
  setIcon('reviews-eyebrow-icon',  'Quote',        { size: 13 });
  setIcon('faq-eyebrow-icon',      'HelpCircle',   { size: 13 });
  setIcon('cta-band-arrow',        'ArrowRight',   { size: 18 });
}

function triggerMagnetLanding() {
  const fridge = document.querySelector('.hero-fridge');
  if (!fridge) return;
  requestAnimationFrame(() => fridge.classList.add('animate'));
}

function renderPricingCards() {
  const grid = document.getElementById('packages-cards-grid');
  if (!grid) return;

  grid.innerHTML = PRICING_PACKS.map((pack) => `
    <div class="pricing-card${pack.popular ? ' popular' : ''}">
      ${pack.popular ? `<span class="pricing-card-badge">${iconSvg('Sparkles', { size: 12 })} Most loved</span>` : ''}
      <span class="pricing-card-qty">${pack.qty}</span>
      <h3 class="pricing-card-title">${pack.title}</h3>
      <p class="pricing-card-price"><strong>${pack.price}</strong> <span>${pack.unit}</span></p>
      <p class="pricing-card-desc">${pack.desc}</p>
      <ul class="pricing-card-features">
        ${pack.features.map((f) => `<li>${iconSvg('Check', { size: 16 })}<span>${f}</span></li>`).join('')}
      </ul>
      <a href="design.html" class="btn ${pack.popular ? 'btn-primary' : 'btn-secondary'} btn-block">${pack.cta} &rarr;</a>
    </div>`).join('');
}

function shortTier(qty) {
  if (qty <= 1) return 'Single';
  if (qty < 6) return 'Standard';
  if (qty < 10) return 'Six-pack';
  return 'Bulk';
}

function renderPricingSimulator() {
  const slider = document.getElementById('pricing-qty-slider');
  if (!slider) return;
  const qtyDisplay = document.getElementById('pricing-qty-display');
  const costEl = document.getElementById('pricing-output-cost');
  const avgEl = document.getElementById('pricing-output-avg');
  const tierEl = document.getElementById('pricing-output-tier');
  const savingsEl = document.getElementById('pricing-savings-block');
  const bulkNote = document.getElementById('pricing-bulk-note');
  const designBtn = document.getElementById('pricing-design-now-btn');

  function update() {
    const qty = Number(slider.value);
    const { cost, savings, avgPerUnit } = calculateBundlePrice(qty);
    const plural = qty !== 1 ? 's' : '';

    qtyDisplay.textContent = `${qty} magnet${plural}`;
    costEl.textContent = `R${cost}`;
    avgEl.textContent = `R${avgPerUnit.toFixed(2)}`;
    tierEl.textContent = shortTier(qty);

    savingsEl.innerHTML = savings > 0
      ? `<span class="pricing-savings-pill">${iconSvg('Tag', { size: 14 })} You save R${savings}</span>`
      : `<p class="pricing-savings-empty">Order 10+ to unlock R40 each.</p>`;

    if (bulkNote) bulkNote.hidden = qty <= 15;
    if (designBtn) designBtn.textContent = `Design ${qty} magnet${plural} →`;
  }

  slider.addEventListener('input', update);
  update();
}

function renderTestimonials() {
  const grid = document.getElementById('testimonial-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="reviews-invite">
      <span class="reviews-invite-icon">${iconSvg('Sparkles', { size: 26 })}</span>
      <p class="reviews-invite-text">We're a young Durban studio, so we won't fake it. Real customer reviews will appear right here as our first orders land on fridges around South Africa.</p>
      <a href="design.html" class="btn btn-primary">Be our first review</a>
    </div>`;
}

function renderFaq() {
  const list = document.getElementById('faq-list');
  if (!list) return;

  list.innerHTML = FAQ_ITEMS.map((item, i) => `
    <details class="faq-item"${i === 0 ? ' open' : ''}>
      <summary><span>${item.q}</span>${iconSvg('ChevronDown', { size: 18 })}</summary>
      <p>${item.a}</p>
    </details>`).join('');
}

function wireSampleEntry() {
  const btn = document.getElementById('try-sample-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    addDesign({ id: `sample-${Date.now()}`, ...SAMPLE_DESIGN });
    refreshBasketBadge();
    location.href = 'design.html';
  });
}

renderStaticIcons();
triggerMagnetLanding();
renderPricingCards();
renderPricingSimulator();
renderTestimonials();
renderFaq();
wireSampleEntry();
