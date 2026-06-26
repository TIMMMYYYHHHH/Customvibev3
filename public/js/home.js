import { iconSvg } from './icons.js';
import { addDesign } from './state.js';
import { calculateBundlePrice } from './pricing.js';
import { refreshBasketBadge } from './partials.js';
import { FALLBACK_IMAGE } from './image.js';

// Sample tiles shown on the fridge in the hero. The imageUrls point at local,
// self-hosted branded placeholders — swap these for real finished-magnet photos
// (drop files in /public/images and update the paths). See FALLBACK_IMAGE below.
const PREMIUM_PRESETS = [
  {
    name: 'Sample family magnet',
    imageUrl: '/images/placeholder-magnet-1.svg',
    quantity: 1,
    sizeCm: 7.5,
  },
  {
    name: 'Sample portrait magnet',
    imageUrl: '/images/placeholder-magnet-2.svg',
    quantity: 1,
    sizeCm: 7.5,
  },
  {
    name: 'Sample holiday magnet',
    imageUrl: '/images/placeholder-magnet-3.svg',
    quantity: 1,
    sizeCm: 7.5,
  },
];

const MAGNET_POSITIONS = [
  { top: '10%', left: '10%', rotate: '-6deg', hoverRotate: '-2deg', floatDur: '7s', floatDelay: '0s' },
  { top: '12%', left: '58%', rotate: '5deg', hoverRotate: '1deg', floatDur: '5.5s', floatDelay: '-2s' },
  { top: '54%', left: '34%', rotate: '-3deg', hoverRotate: '2deg', floatDur: '6.5s', floatDelay: '-1s' },
];

const PRICING_PACKS = [
  {
    title: 'Single Shot',
    qty: '1 Magnet',
    price: 'R50',
    description: 'Perfect for testing the quality before committing to a bundle.',
    features: [
      '7.5 x 7.5 cm perfect square',
      'Fine-art gloss protective film',
      '3 mm heavy rubber backing',
      'Hand-finished with care',
    ],
    popular: false,
    cta: 'Create Solo Draft',
  },
  {
    title: 'Tribe Half-Dozen',
    qty: '6 Magnets',
    price: 'R250',
    description: 'Our most popular bundle. Made for sharing across the family.',
    features: [
      'Up to 6 unique photos',
      'Instant R50 bundle discount',
      'Waterproof gloss finish',
      'Free gift-ready packaging',
    ],
    popular: true,
    cta: 'Create Tribe Pack',
  },
  {
    title: 'Ultimate Family Pack',
    qty: '10 Magnets',
    price: 'R400',
    description: 'Turn your entire phone gallery into a full fridge door.',
    features: [
      'Up to 10 unique photo uploads',
      'Best value at R40 per magnet',
      'Priority studio processing',
      'Custom border options included',
    ],
    popular: false,
    cta: 'Create Ultimate Pack',
  },
];

const FAQ_ITEMS = [
  {
    question: 'What size are CustomVibe magnets?',
    answer: 'Every magnet is a 7.5 cm square, finished with a high-gloss protective coating and a heavy-duty 3 mm rubber backing so it grips firmly to your fridge.',
  },
  {
    question: 'What photos can I upload?',
    answer: 'Any standard photo file (JPG, PNG, HEIC, etc.) works. Upload it in the Design Studio and you can crop, zoom, and reposition it before ordering.',
  },
  {
    question: 'How does pricing work?',
    answer: 'Pricing is bundled: the more magnets you order in one go, the cheaper each one gets — down to R40 per magnet for orders of 10 or more. Use the pricing calculator on this page to see your exact total.',
  },
  {
    question: 'How do I place an order?',
    answer: 'Design your magnets in the Design Studio, then submit a quote request with your delivery details. We confirm final pricing and courier cost with you before production starts.',
  },
  {
    question: 'How long does delivery take?',
    answer: 'Typical turnaround is <span class="faq-placeholder">add real production + delivery time</span> from order confirmation.',
  },
  {
    question: 'Do you deliver across South Africa?',
    answer: "Yes — we're based in Durban and ship nationwide. Delivery cost is <span class=\"faq-placeholder\">add real shipping cost</span> and is confirmed with your quote.",
  },
];

function setIcon(id, name, opts) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = iconSvg(name, opts);
}

function renderStaticIcons() {
  setIcon('hero-badge-icon',       'Sparkles',    { size: 12 });
  setIcon('hero-cta-arrow',        'ArrowRight',  { size: 16 });
  setIcon('hero-scroll-icon',      'ChevronDown', { size: 20 });
  setIcon('stat-shield-icon',      'ShieldCheck', { size: 12 });
  setIcon('how-eyebrow-icon',      'Sparkles',    { size: 12 });
  setIcon('how-upload-icon',       'Upload',      { size: 22 });
  setIcon('how-design-icon',       'Layers',      { size: 22 });
  setIcon('how-step-arrow-1',      'ArrowRight',  { size: 14 });
  setIcon('how-deliver-icon',      'Heart',       { size: 22 });
  setIcon('testimonial-quote-icon','Quote',       { size: 32 });
  setIcon('cta-band-arrow',        'ArrowRight',  { size: 18 });
  setIcon('pricing-percent-icon',  'Percent',     { size: 13 });
  setIcon('pricing-helping-icon',  'HelpingHand', { size: 16 });
}

function renderFridgeMagnets() {
  const stage = document.getElementById('simulated-fridge-magnet-stage');
  if (!stage) return;

  stage.innerHTML = PREMIUM_PRESETS.map((preset, index) => {
    const pos = MAGNET_POSITIONS[index];
    return `
      <div
        class="fridge-magnet"
        id="fridge-magnet-node-${index}"
        data-preset-index="${index}"
        style="top:${pos.top}; left:${pos.left}; --rot:${pos.rotate}; --fridge-magnet-hover-rotate:${pos.hoverRotate}; --float-dur:${pos.floatDur}; --float-delay:${pos.floatDelay};"
      >
        <div class="fridge-magnet-img-wrap">
          <img src="${preset.imageUrl}" alt="${preset.name}" referrerpolicy="no-referrer" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'" />
          <button type="button" class="fridge-magnet-customise" data-preset-index="${index}" title="Use this sample in the Design Studio">
            ${iconSvg('ImageIcon', { size: 11 })} Try sample
          </button>
        </div>
      </div>`;
  }).join('');

  stage.querySelectorAll('.fridge-magnet-customise').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const preset = PREMIUM_PRESETS[Number(btn.dataset.presetIndex)];
      addDesign({ id: `preset-${Date.now()}`, ...preset });
      refreshBasketBadge();
      location.href = 'design.html';
    });
  });
}

function renderPricingCards() {
  const grid = document.getElementById('packages-cards-grid');
  if (!grid) return;

  grid.innerHTML = PRICING_PACKS.map((pack, idx) => `
    <div class="pricing-card${pack.popular ? ' popular' : ''}" id="pricing-package-${idx}">
      ${pack.popular ? `<span class="pricing-card-badge">${iconSvg('Sparkles', { size: 13 })} Most Popular</span>` : ''}
      <div>
        <span class="pricing-card-qty">${pack.qty}</span>
        <h3 class="pricing-card-title">${pack.title}</h3>
        <div class="pricing-card-price-row">
          <span class="pricing-card-price">${pack.price}</span>
          <span class="pricing-card-price-label">total</span>
        </div>
        <p class="pricing-card-desc">${pack.description}</p>
        <hr class="divider" />
        <ul class="pricing-card-features">
          ${pack.features.map((feat) => `<li>${iconSvg('Check', { size: 15 })}<span>${feat}</span></li>`).join('')}
        </ul>
      </div>
      <a href="design.html" class="btn ${pack.popular ? 'btn-primary' : 'btn-secondary'}">${pack.cta} &rarr;</a>
    </div>`).join('');
}

function renderPricingSimulator() {
  const slider = document.getElementById('pricing-qty-slider');
  const qtyDisplay = document.getElementById('pricing-qty-display');
  const costEl = document.getElementById('pricing-output-cost');
  const avgEl = document.getElementById('pricing-output-avg');
  const tierEl = document.getElementById('pricing-output-tier');
  const savingsEl = document.getElementById('pricing-savings-block');
  const bulkNote = document.getElementById('pricing-bulk-note');
  const designBtn = document.getElementById('pricing-design-now-btn');
  if (!slider) return;

  function update() {
    const qty = Number(slider.value);
    const result = calculateBundlePrice(qty);

    qtyDisplay.textContent = `${qty} Magnet${qty !== 1 ? 's' : ''}`;
    costEl.textContent = `R${result.cost}`;
    avgEl.textContent = `R${result.avgPerUnit.toFixed(2)}`;
    tierEl.textContent = result.tier;

    savingsEl.innerHTML = result.savings > 0
      ? `<div class="pricing-savings-pill">${iconSvg('Tag', { size: 14 })}<span>Saves you R${result.savings}!</span></div>`
      : `<p class="pricing-savings-empty">Order 10+ magnets to unlock the R40/each bulk rate.</p>`;

    if (bulkNote) bulkNote.hidden = qty <= 15;
    if (designBtn) designBtn.textContent = `Design ${qty} Magnets Now →`;
  }

  slider.addEventListener('input', update);
  update();
}

function renderTestimonials() {
  const grid = document.getElementById('testimonial-grid');
  if (!grid) return;

  // Honest placeholder: we never fabricate reviews (see CLAUDE.md hard
  // constraint #1). Until real customer quotes exist, invite the first one
  // instead of showing fake cards. Swap this for a real-testimonials grid
  // once genuine quotes are available.
  grid.classList.add('testimonial-grid--invite');
  grid.innerHTML = `
    <div class="testimonial-card testimonial-invite">
      <span class="testimonial-invite-icon">${iconSvg('Sparkles', { size: 26 })}</span>
      <p class="testimonial-quote">We're a young Durban studio, so we won't fake it: real customer reviews will appear right here as our first orders land on fridges around South Africa.</p>
      <a href="design.html" class="btn btn-pink">Be our first review</a>
    </div>`;
}

function renderFaq() {
  const list = document.getElementById('faq-list');
  if (!list) return;

  list.innerHTML = FAQ_ITEMS.map((item, index) => `
    <details class="faq-item" ${index === 0 ? 'open' : ''}>
      <summary>
        <span>${item.question}</span>
        ${iconSvg('ChevronDown', { size: 18 })}
      </summary>
      <p>${item.answer}</p>
    </details>`).join('');
}

renderStaticIcons();
renderFridgeMagnets();
renderPricingCards();
renderPricingSimulator();
renderTestimonials();
renderFaq();
