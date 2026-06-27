import { iconSvg } from './icons.js';
import { getDesigns, getTotalQuantity } from './state.js';
import { calculateBundlePrice } from './pricing.js';
import { openQuoteModal } from './quote-modal.js';

const VALUE_ITEMS = [
  { icon: 'Camera', title: 'High-Definition Print Gloss', desc: 'Waterproof protection coating layer safeguards details against greasy hands, humidity, or sunlight bleach.' },
  { icon: 'Layers', title: 'Strong Flexible Rubber Grip', desc: "Sturdy 3mm backing won't slip or slide when slamming refrigerator doors. Clings beautifully." },
  { icon: 'Heart', title: 'Local Craftsmanship', desc: 'Made with pride by custom design lovers. Hand-inspected and carefully trimmed square templates.' },
  { icon: 'MapPin', title: 'Nationwide Delivery', desc: 'Secure priority postage directly to your residential doorstep. Custom quotes dispatched instantly.' },
];

async function injectPartial(name, selector) {
  const target = document.querySelector(selector);
  if (!target) return;
  const res = await fetch(`partials/${name}.html`);
  target.innerHTML = await res.text();
}

function currentRoutePath() {
  const file = location.pathname.split('/').pop() || 'index.html';
  if (file === 'index.html' || file === '') return '/';
  return '/' + file.replace('.html', '');
}

function wireHeader() {
  const path = currentRoutePath();

  // Mark the active primary-nav link (links carry data-nav-path).
  document.querySelectorAll('.site-nav [data-nav-path]').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('data-nav-path') === path);
  });

  const quoteBtn = document.getElementById('nav-quote-basket');
  const quoteIcon = document.getElementById('nav-quote-basket-icon');
  if (quoteIcon) quoteIcon.innerHTML = iconSvg('ShoppingBag', { size: 18 });
  if (quoteBtn) {
    quoteBtn.classList.toggle('active', path === '/quote');
    quoteBtn.addEventListener('click', () => openQuoteModal());
  }

  wireMobileNav();
  refreshBasketBadge();
}

// Accessible mobile menu: hamburger toggles the dropdown, swaps its icon,
// closes on link click or Escape, and keeps aria-expanded in sync.
function wireMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('mobile-nav');
  const icon = document.getElementById('nav-toggle-icon');
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (icon) icon.innerHTML = iconSvg(open ? 'X' : 'Menu', { size: 22 });
  };
  setOpen(false);

  toggle.addEventListener('click', () => setOpen(menu.hidden));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setOpen(false); toggle.focus(); }
  });
}

export function refreshBasketBadge() {
  const designs = getDesigns() || [];
  const totalMagnets = getTotalQuantity(designs);
  const { cost: totalCost } = calculateBundlePrice(totalMagnets);

  const badge = document.getElementById('nav-quote-basket-badge');
  if (!badge) return;
  if (totalMagnets > 0) {
    badge.hidden = false;
    badge.textContent = `${totalMagnets} • R${totalCost}`;
  } else {
    badge.hidden = true;
  }
}

function wireFooter() {
  const valueStrip = document.getElementById('value-strip-inner');
  if (valueStrip) {
    valueStrip.innerHTML = VALUE_ITEMS.map(
      (item) => `
        <div class="value-item">
          ${iconSvg(item.icon, { size: 20 })}
          <h4>${item.title}</h4>
          <p>${item.desc}</p>
        </div>`
    ).join('');
  }

  const secureIcon = document.getElementById('footer-secure-icon');
  if (secureIcon) secureIcon.innerHTML = iconSvg('ShieldCheck', { size: 16 });

  const whatsapp = document.getElementById('whatsapp-floating-button');
  if (whatsapp) whatsapp.innerHTML = iconSvg('MessageCircle', { size: 26 });

  const copyright = document.getElementById('footer-copyright');
  if (copyright) copyright.textContent = `© ${new Date().getFullYear()} CustomVibe Magnets Ltd. All rights reserved.`;
}

function wireQuoteModalChrome() {
  const closeBtn = document.getElementById('summary-modal-close-btn');
  if (closeBtn) closeBtn.innerHTML = iconSvg('X', { size: 20 });

  const headerIcon = document.getElementById('summary-modal-header-icon');
  if (headerIcon) headerIcon.innerHTML = iconSvg('ShoppingBag', { size: 20 });

  const secureIcon = document.getElementById('summary-modal-secure-icon');
  if (secureIcon) secureIcon.innerHTML = iconSvg('ShieldCheck', { size: 16 });

  const proceedIcon = document.getElementById('summary-modal-proceed-icon');
  if (proceedIcon) proceedIcon.innerHTML = iconSvg('ArrowRight', { size: 16 });
}

export async function loadPartials() {
  await Promise.all([
    injectPartial('header', '[data-partial="header"]'),
    injectPartial('footer', '[data-partial="footer"]'),
    injectPartial('quote-modal', '[data-partial="quote-modal"]'),
  ]);

  wireHeader();
  wireFooter();
  wireQuoteModalChrome();

  document.dispatchEvent(new CustomEvent('partials:ready'));
}

document.addEventListener('DOMContentLoaded', loadPartials);
