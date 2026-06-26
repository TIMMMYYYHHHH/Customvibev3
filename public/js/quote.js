import { iconSvg } from './icons.js';
import { getDesigns, updateDesign, deleteDesign, clearAllDesigns, getTotalQuantity } from './state.js';
import { calculateBundlePrice } from './pricing.js';
import { refreshBasketBadge } from './partials.js';
import { FALLBACK_IMAGE } from './image.js';

const QUOTE_FORM_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID';

let designs = getDesigns() || [];
let step = 'review';
let submittedQuote = null;
let copyLabelTimeout = null;

async function deliverQuoteRequest(quote) {
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

function renderStaticIcons() {
  document.getElementById('quote-empty-icon').innerHTML = iconSvg('ShoppingBag', { size: 56 });
  document.getElementById('quote-compass-icon').innerHTML = iconSvg('Compass', { size: 18 });
  document.getElementById('quote-proceed-icon').innerHTML = iconSvg('ChevronRight', { size: 16 });
  document.getElementById('quote-back-icon').innerHTML = iconSvg('ArrowLeft', { size: 16 });
  document.getElementById('quote-user-icon').innerHTML = iconSvg('User', { size: 16 });
  document.getElementById('quote-mail-icon').innerHTML = iconSvg('Mail', { size: 16 });
  document.getElementById('quote-phone-icon').innerHTML = iconSvg('Phone', { size: 16 });
  document.getElementById('quote-mappin-icon').innerHTML = iconSvg('MapPin', { size: 16 });
  document.getElementById('quote-success-check-icon').innerHTML = iconSvg('CheckCircle2', { size: 36 });
  document.getElementById('quote-clipboard-icon').innerHTML = iconSvg('Clipboard', { size: 16 });
  document.getElementById('quote-printer-icon').innerHTML = iconSvg('Printer', { size: 16 });
  document.getElementById('quote-payfast-icon').innerHTML = iconSvg('CreditCard', { size: 16 });
  document.getElementById('quote-yoco-icon').innerHTML = iconSvg('CreditCard', { size: 16 });
}

function renderStepper() {
  const chips = {
    review: document.getElementById('quote-step-chip-review'),
    details: document.getElementById('quote-step-chip-details'),
    success: document.getElementById('quote-step-chip-success'),
  };
  const connector1 = document.getElementById('quote-connector-1');
  const connector2 = document.getElementById('quote-connector-2');

  const isDetailsComplete = step === 'details' || step === 'success';
  const isSuccessComplete = step === 'success';

  chips.review.className = `quote-step-chip${step === 'review' ? ' active' : ''}${isDetailsComplete ? ' complete' : ''}`;
  chips.review.textContent = isDetailsComplete ? '✓ 1. Verify Order' : '1. Verify Order';

  chips.details.className = `quote-step-chip${step === 'details' ? ' active' : ''}${isSuccessComplete ? ' complete' : ''}`;
  chips.details.textContent = isSuccessComplete ? '✓ 2. Delivery Space' : '2. Delivery Space';

  chips.success.className = `quote-step-chip${step === 'success' ? ' active' : ''}`;
  chips.success.textContent = '3. Complete Request';

  connector1.classList.toggle('complete', isDetailsComplete);
  connector2.classList.toggle('complete', isSuccessComplete);
}

function showStep() {
  document.getElementById('quote-step-review').hidden = step !== 'review';
  document.getElementById('quote-step-details').hidden = step !== 'details';
  document.getElementById('quote-step-success').hidden = step !== 'success';
  renderStepper();
}

function renderReview() {
  const totalQty = getTotalQuantity(designs);
  const { cost: totalPrice, savings } = calculateBundlePrice(totalQty);

  const emptyState = document.getElementById('quote-empty-state');
  const itemsSection = document.getElementById('quote-items-section');

  if (designs.length === 0) {
    emptyState.hidden = false;
    itemsSection.hidden = true;
    return;
  }

  emptyState.hidden = true;
  itemsSection.hidden = false;

  const list = document.getElementById('quote-items-list');
  list.innerHTML = designs.map((design) => `
    <div class="quote-item-row" data-design-id="${design.id}">
      <div class="quote-item-main">
        <div class="quote-item-thumb">
          <img src="${design.imageUrl}" alt="${design.name}" referrerpolicy="no-referrer" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'" />
        </div>
        <div>
          <h4 class="quote-item-name">${design.name}</h4>
          <div class="quote-item-tags">
            <span>7.5 cm Perfect Square</span>
            <span>Full Bleed Gloss</span>
          </div>
        </div>
      </div>
      <div class="quote-item-actions">
        <div class="quote-item-qty-stepper">
          <button type="button" data-action="dec" data-design-id="${design.id}">-</button>
          <span>${design.quantity}</span>
          <button type="button" data-action="inc" data-design-id="${design.id}">+</button>
        </div>
        <div class="quote-item-price-row">
          <span class="quote-item-price">R${design.quantity * 50}</span>
          <button type="button" class="quote-item-delete" data-action="delete" data-design-id="${design.id}" title="Discard design">${iconSvg('Trash2', { size: 16 })}</button>
        </div>
      </div>
    </div>`).join('');

  list.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.designId;
      const action = btn.dataset.action;
      const target = designs.find((d) => d.id === id);
      if (!target) return;

      if (action === 'inc') {
        designs = updateDesign({ ...target, quantity: target.quantity + 1 });
      } else if (action === 'dec') {
        designs = updateDesign({ ...target, quantity: Math.max(1, target.quantity - 1) });
      } else if (action === 'delete') {
        designs = deleteDesign(id);
      }

      renderReview();
      refreshBasketBadge();
    });
  });

  document.getElementById('quote-total-cost').textContent = `R${Math.round(totalPrice)}`;
  document.getElementById('quote-total-qty-text').textContent = `${totalQty} standard magnets ordered`;

  const savingsBlock = document.getElementById('quote-savings-block');
  savingsBlock.innerHTML = savings > 0
    ? `<span class="quote-savings-pill">Volume discount saves you R${Math.round(savings)}!</span>`
    : '';
}

function wireReviewActions() {
  document.getElementById('quote-empty-back-btn').addEventListener('click', () => {
    location.href = 'design.html';
  });
  document.getElementById('quote-keep-designing-btn').addEventListener('click', () => {
    location.href = 'design.html';
  });
  document.getElementById('quote-clear-basket-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to completely clear your draft design list?')) {
      clearAllDesigns();
      designs = [];
      renderReview();
      refreshBasketBadge();
    }
  });
  document.getElementById('quote-proceed-to-shipping-btn').addEventListener('click', () => {
    step = 'details';
    showStep();
  });
  document.getElementById('quote-back-to-review-btn').addEventListener('click', () => {
    step = 'review';
    showStep();
  });
}

function wireDetailsForm() {
  const form = document.getElementById('quote-details-form');
  const errorBox = document.getElementById('quote-validation-error');
  const submitBtn = document.getElementById('quote-final-submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const clientName = document.getElementById('quote-client-name').value.trim();
    const clientEmail = document.getElementById('quote-client-email').value.trim();
    const clientPhone = document.getElementById('quote-client-phone').value.trim();
    const address = document.getElementById('quote-address').value.trim();
    const remarks = document.getElementById('quote-remarks').value.trim();

    if (!clientName || !clientEmail || !clientPhone || !address) {
      errorBox.textContent = 'Please fill in all standard contact and delivery details.';
      errorBox.hidden = false;
      return;
    }
    errorBox.hidden = true;

    const totalQty = getTotalQuantity(designs);
    const { cost: totalPrice } = calculateBundlePrice(totalQty);

    const compiledQuote = {
      customerName: clientName,
      customerEmail: clientEmail,
      customerPhone: clientPhone,
      deliveryAddress: address,
      additionalNotes: remarks,
      designs: [...designs],
      totalPriceEstimate: Math.round(totalPrice),
      status: 'submitted',
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    await deliverQuoteRequest(compiledQuote);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Quote Request';

    submittedQuote = compiledQuote;
    step = 'success';
    renderSuccess();
    showStep();
  });
}

function buildReceiptText(quote) {
  let text = `====================================\n`;
  text += `CUSTOMVIBE MAGNETS - QUOTE REQUEST\n`;
  text += `====================================\n`;
  text += `Order Estimated Cost: R${quote.totalPriceEstimate}\n`;
  text += `Contact Name: ${quote.customerName}\n`;
  text += `Email Address: ${quote.customerEmail}\n`;
  text += `Phone Number: ${quote.customerPhone}\n`;
  text += `Delivery Address: ${quote.deliveryAddress}\n`;
  if (quote.additionalNotes) {
    text += `Comments: ${quote.additionalNotes}\n`;
  }
  text += `\n----- DESIGNED MAGNET ITEMS -----\n`;
  quote.designs.forEach((d, idx) => {
    text += `#${idx + 1}: [${d.name}] - Qty: ${d.quantity} pcs - Size: 7.5x7.5cm (Full Bleed Glossy)\n`;
  });
  text += `\n====================================\n`;
  text += `Find your tribe at Custom Vibe!\n`;
  return text;
}

function renderSuccess() {
  if (!submittedQuote) return;
  const orderId = `CV-${Math.floor(Math.random() * 89999 + 10000)}`;
  const totalQty = submittedQuote.designs.reduce((sum, d) => sum + d.quantity, 0);

  document.getElementById('quote-success-name').textContent = submittedQuote.customerName;
  document.getElementById('quote-success-cost').textContent = `R${submittedQuote.totalPriceEstimate}`;
  document.getElementById('quote-success-qty').textContent = `${totalQty} Hand-finished Magnets`;

  const receiptBody = document.getElementById('quote-receipt-body');
  let html = `<p class="receipt-order-id">Order ID: ${orderId}</p>`;
  html += `<p>Customer: ${submittedQuote.customerName}</p>`;
  html += `<p>Email: ${submittedQuote.customerEmail}</p>`;
  html += `<p>Phone: ${submittedQuote.customerPhone}</p>`;
  html += `<p>Destination: ${submittedQuote.deliveryAddress}</p>`;
  html += `<p class="receipt-items-label">Included Magnet items:</p>`;
  submittedQuote.designs.forEach((d, index) => {
    html += `<p>- Item #${index + 1} ("${d.name}"): ${d.quantity} units (7.5x7.5 cm size)</p>`;
  });
  receiptBody.innerHTML = html;
}

function wireSuccessActions() {
  document.getElementById('quote-copy-receipt-btn').addEventListener('click', () => {
    if (!submittedQuote) return;
    const text = buildReceiptText(submittedQuote);
    navigator.clipboard.writeText(text).then(() => {
      const label = document.getElementById('quote-copy-label');
      label.textContent = 'Copied!';
      clearTimeout(copyLabelTimeout);
      copyLabelTimeout = setTimeout(() => { label.textContent = 'Copy Order Summary'; }, 2500);
    });
  });

  document.getElementById('quote-print-receipt-btn').addEventListener('click', () => {
    window.print();
  });

  document.getElementById('quote-start-new-btn').addEventListener('click', () => {
    clearAllDesigns();
    step = 'review';
    location.href = 'design.html';
  });
}

renderStaticIcons();
renderReview();
wireReviewActions();
wireDetailsForm();
wireSuccessActions();
showStep();
