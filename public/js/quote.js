import { iconSvg } from './icons.js';
import { getDesigns, updateDesign, deleteDesign, clearAllDesigns, getTotalQuantity } from './state.js';
import { calculateBundlePrice } from './pricing.js';
import { refreshBasketBadge } from './partials.js';
import { FALLBACK_IMAGE } from './image.js';

// Where new orders are delivered (email notification). Deliberate placeholder —
// swap YOUR_FORM_ID for a real Formspree (or other) form id to receive orders.
const ORDER_FORM_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID';

// EFT / business details. PLACEHOLDERS — replace before going live. Bracketed
// values render with a "sample" highlight on the confirmation page so they're
// impossible to miss. See BUSINESS-DETAILS.md for the fill-in list.
const BUSINESS = {
  bankAccountName: '[ADD ACCOUNT NAME]',
  bankName: '[ADD BANK NAME]',
  accountNumber: '[ADD ACCOUNT NUMBER]',
  accountType: '[ADD ACCOUNT TYPE]',
  branchCode: '[ADD BRANCH CODE]',
  proofEmail: 'hello@customvibe.co.za',
};

let designs = getDesigns() || [];
let step = 'review';
let submittedOrder = null;
let copyLabelTimeout = null;

const byId = (id) => document.getElementById(id);
function setIcon(id, name, opts) { const el = byId(id); if (el) el.innerHTML = iconSvg(name, opts); }
function orderReference() { return `CV-${Math.floor(Math.random() * 89999 + 10000)}`; }

async function submitOrder(order) {
  try {
    await fetch(ORDER_FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(order),
    });
  } catch (error) {
    console.error('Order notification failed — check ORDER_FORM_ENDPOINT setup', error);
  }
}

function renderStaticIcons() {
  setIcon('quote-empty-icon', 'ShoppingBag', { size: 48 });
  setIcon('quote-compass-icon', 'Compass', { size: 16 });
  setIcon('quote-proceed-icon', 'ArrowRight', { size: 16 });
  setIcon('quote-back-icon', 'ArrowLeft', { size: 16 });
  setIcon('quote-user-icon', 'User', { size: 15 });
  setIcon('quote-mail-icon', 'Mail', { size: 15 });
  setIcon('quote-phone-icon', 'Phone', { size: 15 });
  setIcon('quote-mappin-icon', 'MapPin', { size: 15 });
  setIcon('quote-success-check-icon', 'CheckCircle2', { size: 34 });
  setIcon('quote-bank-icon', 'Banknote', { size: 16 });
  setIcon('quote-clipboard-icon', 'Clipboard', { size: 15 });
  setIcon('quote-printer-icon', 'Printer', { size: 15 });
  setIcon('quote-payfast-icon', 'CreditCard', { size: 15 });
  setIcon('quote-yoco-icon', 'CreditCard', { size: 15 });
}

function renderStepper() {
  const review = byId('quote-step-chip-review');
  const details = byId('quote-step-chip-details');
  const success = byId('quote-step-chip-success');
  const detailsDone = step === 'details' || step === 'success';
  const successDone = step === 'success';

  review.className = `quote-step-chip${step === 'review' ? ' active' : ''}${detailsDone ? ' complete' : ''}`;
  review.textContent = detailsDone ? '✓ Review' : '1. Review';
  details.className = `quote-step-chip${step === 'details' ? ' active' : ''}${successDone ? ' complete' : ''}`;
  details.textContent = successDone ? '✓ Delivery' : '2. Delivery';
  success.className = `quote-step-chip${step === 'success' ? ' active' : ''}`;
  success.textContent = '3. Pay by EFT';

  byId('quote-connector-1').classList.toggle('complete', detailsDone);
  byId('quote-connector-2').classList.toggle('complete', successDone);
}

function showStep() {
  byId('quote-step-review').hidden = step !== 'review';
  byId('quote-step-details').hidden = step !== 'details';
  byId('quote-step-success').hidden = step !== 'success';
  renderStepper();
}

function renderReview() {
  const totalQty = getTotalQuantity(designs);
  const { cost: totalPrice, savings } = calculateBundlePrice(totalQty);

  const emptyState = byId('quote-empty-state');
  const itemsSection = byId('quote-items-section');
  if (designs.length === 0) {
    emptyState.hidden = false;
    itemsSection.hidden = true;
    return;
  }
  emptyState.hidden = true;
  itemsSection.hidden = false;

  const list = byId('quote-items-list');
  list.innerHTML = designs.map((design) => `
    <div class="quote-item-row" data-design-id="${design.id}">
      <div class="quote-item-main">
        <div class="quote-item-thumb">
          <img src="${design.imageUrl}" alt="${design.name}" referrerpolicy="no-referrer" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'" />
        </div>
        <div>
          <h3 class="quote-item-name">${design.name}</h3>
          <div class="quote-item-tags"><span>7.5 cm square</span><span>Gloss finish</span></div>
        </div>
      </div>
      <div class="quote-item-actions">
        <div class="quote-item-qty-stepper">
          <button type="button" data-action="dec" data-design-id="${design.id}" aria-label="Decrease quantity for ${design.name}">-</button>
          <span>${design.quantity}</span>
          <button type="button" data-action="inc" data-design-id="${design.id}" aria-label="Increase quantity for ${design.name}">+</button>
        </div>
        <div class="quote-item-price-row">
          <span class="quote-item-price">R${design.quantity * 50}</span>
          <button type="button" class="quote-item-delete" data-action="delete" data-design-id="${design.id}" aria-label="Remove ${design.name}">${iconSvg('Trash2', { size: 16 })}</button>
        </div>
      </div>
    </div>`).join('');

  list.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.designId;
      const action = btn.dataset.action;
      const target = designs.find((d) => d.id === id);
      if (!target) return;
      if (action === 'inc') designs = updateDesign({ ...target, quantity: target.quantity + 1 });
      else if (action === 'dec') designs = updateDesign({ ...target, quantity: Math.max(1, target.quantity - 1) });
      else if (action === 'delete') designs = deleteDesign(id);
      renderReview();
      refreshBasketBadge();
    });
  });

  byId('quote-total-cost').textContent = `R${Math.round(totalPrice)}`;
  byId('quote-total-qty-text').textContent = `${totalQty} magnet${totalQty !== 1 ? 's' : ''}`;
  byId('quote-savings-block').innerHTML = savings > 0
    ? `<span class="quote-savings-pill">Bundle saves you R${Math.round(savings)}</span>` : '';
}

function wireReviewActions() {
  byId('quote-empty-back-btn').addEventListener('click', () => { location.href = 'design.html'; });
  byId('quote-keep-designing-btn').addEventListener('click', () => { location.href = 'design.html'; });
  byId('quote-clear-basket-btn').addEventListener('click', () => {
    if (confirm('Clear all magnets from your basket?')) {
      clearAllDesigns();
      designs = [];
      renderReview();
      refreshBasketBadge();
    }
  });
  byId('quote-proceed-to-shipping-btn').addEventListener('click', () => { step = 'details'; showStep(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  byId('quote-back-to-review-btn').addEventListener('click', () => { step = 'review'; showStep(); });
}

function wireDetailsForm() {
  const form = byId('quote-details-form');
  const errorBox = byId('quote-validation-error');
  const submitBtn = byId('quote-final-submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = byId('quote-client-name').value.trim();
    const email = byId('quote-client-email').value.trim();
    const phone = byId('quote-client-phone').value.trim();
    const address = byId('quote-address').value.trim();
    const notes = byId('quote-remarks').value.trim();

    if (!name || !email || !phone || !address) {
      errorBox.textContent = 'Please fill in your name, email, phone and delivery address.';
      errorBox.hidden = false;
      return;
    }
    errorBox.hidden = true;

    const totalQty = getTotalQuantity(designs);
    const { cost } = calculateBundlePrice(totalQty);
    const order = {
      orderRef: orderReference(),
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      deliveryAddress: address,
      notes,
      designs: [...designs],
      totalQty,
      total: Math.round(cost),
      paymentMethod: 'EFT',
      status: 'awaiting_payment',
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Placing order…';
    await submitOrder(order);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Place order';

    submittedOrder = order;
    step = 'success';
    renderConfirmation();
    showStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function renderConfirmation() {
  if (!submittedOrder) return;
  const o = submittedOrder;

  byId('quote-success-name').textContent = o.customerName;
  byId('quote-success-cost').textContent = `R${o.total}`;
  byId('quote-success-qty').textContent = `${o.totalQty} magnet${o.totalQty !== 1 ? 's' : ''}`;
  byId('quote-order-ref').textContent = o.orderRef;

  const rows = [
    ['Account name', BUSINESS.bankAccountName],
    ['Bank', BUSINESS.bankName],
    ['Account number', BUSINESS.accountNumber],
    ['Account type', BUSINESS.accountType],
    ['Branch code', BUSINESS.branchCode],
    ['Reference', o.orderRef],
    ['Amount', `R${o.total}`],
  ];
  byId('quote-bank-list').innerHTML = rows.map(([k, v]) => {
    const isPlaceholder = /\[.*\]/.test(String(v));
    return `<div class="quote-bank-row"><dt>${k}</dt><dd${isPlaceholder ? ' class="quote-bank-ph"' : ''}>${v}</dd></div>`;
  }).join('');

  byId('quote-eft-instructions').innerHTML =
    `Use <strong>${o.orderRef}</strong> as your payment reference, then send proof of payment to ` +
    `<a href="mailto:${BUSINESS.proofEmail}">${BUSINESS.proofEmail}</a> or WhatsApp us. ` +
    `We'll confirm and start printing once it reflects.`;

  let html = `<p class="receipt-order-id">Order ${o.orderRef}</p>`;
  html += `<p>Name: ${o.customerName}</p>`;
  html += `<p>Email: ${o.customerEmail}</p>`;
  html += `<p>Phone: ${o.customerPhone}</p>`;
  html += `<p>Deliver to: ${o.deliveryAddress}</p>`;
  if (o.notes) html += `<p>Notes: ${o.notes}</p>`;
  html += `<p class="receipt-items-label">Magnets (${o.totalQty})</p>`;
  o.designs.forEach((d, i) => { html += `<p>#${i + 1} ${d.name} — ${d.quantity} × 7.5 cm</p>`; });
  html += `<p class="receipt-items-label">Total: R${o.total} (pay by EFT)</p>`;
  byId('quote-receipt-body').innerHTML = html;
}

function buildReceiptText(o) {
  let t = '====================================\n';
  t += 'CUSTOMVIBE — ORDER\n';
  t += '====================================\n';
  t += `Order reference: ${o.orderRef}\n`;
  t += `Amount due (EFT): R${o.total}\n`;
  t += `Name: ${o.customerName}\nEmail: ${o.customerEmail}\nPhone: ${o.customerPhone}\n`;
  t += `Deliver to: ${o.deliveryAddress}\n`;
  if (o.notes) t += `Notes: ${o.notes}\n`;
  t += '\n----- MAGNETS -----\n';
  o.designs.forEach((d, i) => { t += `#${i + 1}: ${d.name} — qty ${d.quantity} — 7.5x7.5 cm gloss\n`; });
  t += '\n----- PAY BY EFT -----\n';
  t += `Account name: ${BUSINESS.bankAccountName}\n`;
  t += `Bank: ${BUSINESS.bankName}\n`;
  t += `Account number: ${BUSINESS.accountNumber}\n`;
  t += `Branch code: ${BUSINESS.branchCode}\n`;
  t += `Reference: ${o.orderRef}\n`;
  t += `Send proof to: ${BUSINESS.proofEmail}\n`;
  t += '====================================\n';
  return t;
}

function wireSuccessActions() {
  byId('quote-copy-receipt-btn').addEventListener('click', () => {
    if (!submittedOrder) return;
    navigator.clipboard.writeText(buildReceiptText(submittedOrder)).then(() => {
      const label = byId('quote-copy-label');
      label.textContent = 'Copied!';
      clearTimeout(copyLabelTimeout);
      copyLabelTimeout = setTimeout(() => { label.textContent = 'Copy order details'; }, 2500);
    });
  });
  byId('quote-print-receipt-btn').addEventListener('click', () => window.print());
  byId('quote-start-new-btn').addEventListener('click', () => { clearAllDesigns(); location.href = 'design.html'; });
}

renderStaticIcons();
renderReview();
wireReviewActions();
wireDetailsForm();
wireSuccessActions();
showStep();
