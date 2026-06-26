import { iconSvg } from './icons.js';
import { getDesigns } from './state.js';
import { calculateBundlePrice } from './pricing.js';
import { refreshBasketBadge } from './partials.js';
import { FALLBACK_IMAGE } from './image.js';

function renderBody(designs) {
  const totalQty = designs.reduce((sum, d) => sum + d.quantity, 0);
  const totalPriceEst = calculateBundlePrice(totalQty).cost;
  const normalPriceSum = totalQty * 50;
  const savings = Math.max(0, normalPriceSum - totalPriceEst);

  if (designs.length === 0) {
    return `
      <div class="empty-state">
        <p style="font-size:0.875rem; font-weight:600; color:#71717a;">Your design studio list is currently empty.</p>
        <button type="button" class="btn btn-pink" id="summary-modal-add-designs-btn">Go Add Magnet Cards</button>
      </div>`;
  }

  const items = designs.map((design) => `
    <div class="quote-modal-item">
      <div style="display:flex; align-items:center; gap:0.875rem; min-width:0;">
        <div class="quote-modal-item-thumb">
          <img src="${design.imageUrl}" alt="${design.name}" referrerpolicy="no-referrer" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'" />
        </div>
        <div style="min-width:0;">
          <h4 class="quote-modal-item-name">${design.name || 'Photo Magnet'}</h4>
          <p class="quote-modal-item-meta">7.5 x 7.5 cm size • Zoom: ${design.cropZoom ?? 100}%</p>
        </div>
      </div>
      <div style="text-align:right; flex-shrink:0;">
        <span style="display:block; font-size:0.75rem; font-family:var(--font-mono); font-weight:700; color:var(--color-brand-charcoal);">${design.quantity} unit${design.quantity !== 1 ? 's' : ''}</span>
        <span style="display:block; font-size:var(--text-label-xs); color:var(--color-brand-pink-text); font-weight:700; text-transform:uppercase; letter-spacing:0.06em;">R${design.quantity * 50} base</span>
      </div>
    </div>`).join('');

  return `
    <span class="label-xs" style="display:block; color:var(--color-brand-pink-text); font-family:var(--font-mono); margin-bottom:0.875rem;">Basket Items List (${designs.length})</span>
    ${items}
    <div class="quote-modal-breakdown">
      <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,179,193,0.2); padding-bottom:0.75rem; margin-bottom:0.75rem;">
        <span class="label-xs" style="color:var(--color-brand-pink-text); font-family:var(--font-mono);">Production Estimate Breakdown</span>
        <span style="background:white; padding:0.25rem 0.75rem; border-radius:999px; font-size:var(--text-label-xs); font-weight:700; border:1px solid rgba(255,179,193,0.2);">Gloss Finish Wrap</span>
      </div>
      <div style="font-size:0.75rem; font-weight:600; color:rgba(45,49,66,0.8); display:flex; flex-direction:column; gap:0.5rem;">
        <div style="display:flex; justify-content:space-between;"><span>Base material rate:</span><span style="font-family:var(--font-mono);">R50.00 / item</span></div>
        <div style="display:flex; justify-content:space-between;"><span>Total magnets count:</span><span style="font-weight:700; font-family:var(--font-mono);">${totalQty} Magnet${totalQty !== 1 ? 's' : ''}</span></div>
        ${totalQty >= 6 ? `<div style="display:flex; align-items:center; gap:0.375rem; color:#047857; font-weight:700; font-size:var(--text-label-xs); padding-top:0.375rem; border-top:1px solid rgba(255,179,193,0.2);">${iconSvg('Tag', { size: 14 })}<span>Applied bundle rates active!</span></div>` : ''}
      </div>
      <div style="border-top:1px solid rgba(255,179,193,0.2); padding-top:1rem; margin-top:0.5rem; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:1rem;">
        <div>
          <span class="label-xs" style="display:block; color:#71717a;">Estimated Production Cost</span>
          <div style="display:flex; align-items:baseline; gap:0.5rem; margin-top:0.125rem;">
            <span style="font-size:1.875rem; font-family:var(--font-mono); font-weight:700; color:var(--color-brand-charcoal);">R${Math.round(totalPriceEst)}</span>
            ${savings > 0 ? `<span style="font-size:0.75rem; color:#047857; font-weight:700; background:#ecfdf5; border:1px solid #d1fae5; padding:0.25rem 0.625rem; border-radius:var(--radius-control);">Saved R${Math.round(savings)}</span>` : ''}
          </div>
        </div>
        <p class="label-xs" style="max-width:15rem; color:#a1a1aa; font-weight:500;">Courier fees are computed during shipping verification.</p>
      </div>
    </div>`;
}

function render() {
  const designs = getDesigns() || [];
  const body = document.getElementById('summary-modal-body');
  if (body) body.innerHTML = renderBody(designs);

  const proceedBtn = document.getElementById('summary-modal-proceed-btn');
  if (proceedBtn) proceedBtn.disabled = designs.length === 0;

  const addBtn = document.getElementById('summary-modal-add-designs-btn');
  if (addBtn) addBtn.addEventListener('click', closeQuoteModal);
}

export function openQuoteModal() {
  render();
  const overlay = document.getElementById('summary-modal-overlay');
  if (overlay) overlay.classList.add('open');
}

export function closeQuoteModal() {
  const overlay = document.getElementById('summary-modal-overlay');
  if (overlay) overlay.classList.remove('open');
}

document.addEventListener('partials:ready', () => {
  const overlay = document.getElementById('summary-modal-overlay');
  const closeBtn = document.getElementById('summary-modal-close-btn');
  const cancelBtn = document.getElementById('summary-modal-cancel-btn');
  const proceedBtn = document.getElementById('summary-modal-proceed-btn');

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeQuoteModal();
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', closeQuoteModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeQuoteModal);
  if (proceedBtn) {
    proceedBtn.addEventListener('click', () => {
      const designs = getDesigns() || [];
      if (designs.length === 0) return;
      closeQuoteModal();
      location.href = 'quote.html';
    });
  }

  refreshBasketBadge();
});
