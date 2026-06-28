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
        <p>Your design studio list is currently empty.</p>
        <button type="button" class="btn btn-pink" id="summary-modal-add-designs-btn">Go add magnet cards</button>
      </div>`;
  }

  const items = designs.map((design) => `
    <div class="quote-modal-item">
      <div class="quote-modal-item-left">
        <div class="quote-modal-item-thumb">
          <img src="${design.imageUrl}" alt="${design.name}" referrerpolicy="no-referrer" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'" />
        </div>
        <div class="quote-modal-item-info">
          <h4 class="quote-modal-item-name">${design.name || 'Photo Magnet'}</h4>
          <p class="quote-modal-item-meta">7.5 x 7.5 cm size • Zoom: ${design.cropZoom ?? 100}%</p>
        </div>
      </div>
      <div class="quote-modal-item-right">
        <span class="quote-modal-item-qty">${design.quantity} unit${design.quantity !== 1 ? 's' : ''}</span>
        <span class="quote-modal-item-base">R${design.quantity * 50} base</span>
      </div>
    </div>`).join('');

  return `
    <span class="label-xs quote-modal-basket-label">Basket items list (${designs.length})</span>
    ${items}
    <div class="quote-modal-breakdown">
      <div class="quote-modal-breakdown-header">
        <span class="label-xs quote-modal-breakdown-label">Production estimate breakdown</span>
        <span class="quote-modal-breakdown-badge">7.5 cm square</span>
      </div>
      <div class="quote-modal-breakdown-rows">
        <div class="quote-modal-breakdown-row"><span>Base material rate:</span><span class="mono">R50.00 / item</span></div>
        <div class="quote-modal-breakdown-row"><span>Total magnets count:</span><span class="mono bold">${totalQty} Magnet${totalQty !== 1 ? 's' : ''}</span></div>
        ${totalQty >= 6 ? `<div class="quote-modal-bundle-note">${iconSvg('Tag', { size: 14 })}<span>Bundle rates applied</span></div>` : ''}
      </div>
      <div class="quote-modal-total">
        <div>
          <span class="label-xs quote-modal-total-label">Estimated production cost</span>
          <div class="quote-modal-total-row">
            <span class="quote-modal-total-cost">R${Math.round(totalPriceEst)}</span>
            ${savings > 0 ? `<span class="quote-modal-savings">Saved R${Math.round(savings)}</span>` : ''}
          </div>
        </div>
        <p class="label-xs quote-modal-courier-note">Courier fees are computed during shipping verification.</p>
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
