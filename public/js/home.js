import { iconSvg } from './icons.js';
import { addDesign } from './state.js';
import { calculateBundlePrice } from './pricing.js';
import { refreshBasketBadge } from './partials.js';

const PREMIUM_PRESETS = [
  {
    name: 'Durban Sunset Squad',
    imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=500&auto=format&fit=crop&q=80',
    quantity: 1,
    sizeCm: 7.5,
  },
  {
    name: 'Golden Retriever Vibe',
    imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&auto=format&fit=crop&q=80',
    quantity: 1,
    sizeCm: 7.5,
  },
  {
    name: 'Coastal Solitude',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80',
    quantity: 1,
    sizeCm: 7.5,
  },
];

const MAGNET_POSITIONS = [
  { top: '10%', left: '8%', rotate: '-8deg', hoverRotate: '-1deg' },
  { top: '44%', left: '46%', rotate: '7deg', hoverRotate: '2deg' },
  { top: '56%', left: '4%', rotate: '-5deg', hoverRotate: '0deg' },
];

const PRICING_PACKS = [
  {
    title: 'Single Shot',
    qty: '1 Magnet',
    price: 'R50',
    description: 'Ideal to test-drive our pristine gloss and structural fidelity.',
    features: [
      '7.5 x 7.5 cm perfect square',
      'Fine-Art protective gloss film',
      '3mm Heavy flexible backing pad',
      'Hand-painted white wrap seal',
    ],
    popular: false,
    cta: 'Create Solo Draft',
  },
  {
    title: 'Tribe Half-Dozen',
    qty: '6 Magnets',
    price: 'R250',
    description: 'Our customer favorite bundle. Made for sharing with family and friends.',
    features: [
      'Up to 6 uniquely personal photos',
      'Instant R50 applied discount',
      'Triple-layer gloss water protection',
      'Free decorative gift layout box',
    ],
    popular: true,
    cta: 'Create Tribe Pack',
  },
  {
    title: 'Ultimate Family Pack',
    qty: '10 Magnets',
    price: 'R400',
    description: 'Turn your entire telephone roll or Pinterest catalog into physical art.',
    features: [
      'Up to 10 unique picture uploads',
      'Absolute lowest cost (R40/magnet)',
      'Priority studio design processing',
      'Custom border options included',
    ],
    popular: false,
    cta: 'Create Ultimate Pack',
  },
];

const FAQ_ITEMS = [
  {
    question: 'What size are CustomVibe magnets?',
    answer: 'Every magnet is a 7.5cm square, finished with a high-gloss protective coating and a heavy-duty 3mm rubber backing so it grips firmly to your fridge.',
  },
  {
    question: 'What photos can I upload?',
    answer: 'Any standard photo file (JPG, PNG, HEIC, etc.) works. Upload it in the Design Studio and you can crop, zoom, and reposition it before ordering.',
  },
  {
    question: 'How does pricing work?',
    answer: 'Pricing is bundled: the more magnets you order in one go, the cheaper each one gets, down to R40 per magnet for orders of 10 or more. Use the pricing calculator on the homepage to see your exact total before requesting a quote.',
  },
  {
    question: 'How do I actually order?',
    answer: 'Design your magnets in the Design Studio, then submit a quote request with your delivery details. We confirm final pricing and delivery cost with you directly before production starts.',
  },
  {
    question: 'How long does an order take to arrive?',
    answer: 'Typical turnaround is <span class="faq-placeholder">add real production + delivery turnaround time</span> from order confirmation.',
  },
  {
    question: 'Do you deliver nationwide in South Africa?',
    answer: "Yes — we're based in Durban and ship across South Africa. Delivery cost is <span class=\"faq-placeholder\">add real shipping cost or how it's calculated</span> and is confirmed with your quote.",
  },
];

function setIcon(id, name, opts) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = iconSvg(name, opts);
}

function renderStaticIcons() {
  setIcon('hero-eyebrow-icon',  'Sparkles',     { size: 13 });
  setIcon('hero-cta-arrow',     'ArrowRight',   { size: 16 });
  setIcon('hero-trust-icon-1',  'Layers',       { size: 12 });
  setIcon('hero-trust-icon-2',  'Star',         { size: 12 });
  setIcon('pricing-percent-icon','Percent',     { size: 13 });
  setIcon('pricing-helping-icon','HelpingHand', { size: 16 });
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
        style="top:${pos.top}; left:${pos.left}; transform: rotate(${pos.rotate}); --fridge-magnet-hover-rotate: ${pos.hoverRotate};"
      >
        <div class="fridge-magnet-img-wrap">
          <img src="${preset.imageUrl}" alt="${preset.name}" referrerpolicy="no-referrer" loading="lazy" />
          <button type="button" class="fridge-magnet-customise" data-preset-index="${index}" title="Customize inside the Design Studio">
            ${iconSvg('ImageIcon', { size: 12 })} Customise
          </button>
        </div>
      </div>`;
  }).join('');

  stage.querySelectorAll('.fridge-magnet-customise').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const preset = PREMIUM_PRESETS[Number(btn.dataset.presetIndex)];
      addDesign({
        id: `preset-${Date.now()}`,
        ...preset,
      });
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
      ${pack.popular ? `<span class="pricing-card-badge">${iconSvg('Sparkles', { size: 14 })} Customer Darling</span>` : ''}
      <div>
        <span class="pricing-card-qty">${pack.qty}</span>
        <h3 class="pricing-card-title">${pack.title}</h3>
        <div class="pricing-card-price-row">
          <span class="pricing-card-price">${pack.price}</span>
          <span class="pricing-card-price-label">total value</span>
        </div>
        <p class="pricing-card-desc">${pack.description}</p>
        <hr class="divider" />
        <ul class="pricing-card-features">
          ${pack.features.map((feat) => `<li>${iconSvg('Check', { size: 16 })}<span>${feat}</span></li>`).join('')}
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
      ? `<div class="pricing-savings-pill">${iconSvg('Tag', { size: 16 })}<span>Volume bundle saved you R${result.savings}!</span></div>`
      : `<p class="pricing-savings-empty">Bundle 10 units or more to reduce each magnet by up to R10!</p>`;

    if (bulkNote) bulkNote.hidden = qty <= 15;
    if (designBtn) designBtn.textContent = `Design ${qty} Magnets Now →`;
  }

  slider.addEventListener('input', update);
  update();
}

function renderTestimonials() {
  const grid = document.getElementById('testimonial-grid');
  if (!grid) return;

  grid.innerHTML = [1, 2, 3].map(() => `
    <div class="testimonial-card">
      ${iconSvg('Quote', { size: 24 })}
      <div class="testimonial-stars">
        ${[1, 2, 3, 4, 5].map(() => iconSvg('Star', { size: 14 })).join('')}
      </div>
      <p class="testimonial-quote">Add a real customer quote here</p>
      <p class="testimonial-name">Customer name, City</p>
    </div>`).join('');
}

function renderFaq() {
  const list = document.getElementById('faq-list');
  if (!list) return;

  list.innerHTML = FAQ_ITEMS.map((item, index) => `
    <details class="faq-item" ${index === 0 ? 'open' : ''}>
      <summary>
        <span>${item.question}</span>
        ${iconSvg('ChevronDown', { size: 16 })}
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
