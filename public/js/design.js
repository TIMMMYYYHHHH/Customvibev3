import { iconSvg } from './icons.js';
import { getDesigns, addDesign, updateDesign, deleteDesign, cloneDesign, getTotalQuantity } from './state.js';
import { calculateBundlePrice } from './pricing.js';
import { fileToCompressedDataUrl, FALLBACK_IMAGE } from './image.js';
import { refreshBasketBadge } from './partials.js';

let designs = getDesigns() || [];
let activeDesignId = designs[0]?.id ?? null;

let imgZoom = 100;
let posX = 50;
let posY = 50;
let isDragging = false;
let isHovered = false;
const dragStart = { x: 0, y: 0 };
const startPos = { x: 50, y: 50 };

function getActiveDesign() {
  return designs.find((d) => d.id === activeDesignId) || designs[0];
}

function renderStaticIcons() {
  document.getElementById('studio-move-icon').innerHTML = iconSvg('Move', { size: 14 });
  document.getElementById('studio-mockup-move-icon').innerHTML = iconSvg('Move', { size: 14 });
  document.getElementById('studio-mockup-refresh-icon').innerHTML = iconSvg('RefreshCw', { size: 14 });
  document.getElementById('studio-zoom-out-icon').innerHTML = iconSvg('ZoomOut', { size: 18 });
  document.getElementById('studio-zoom-in-icon').innerHTML = iconSvg('ZoomIn', { size: 18 });
  document.getElementById('studio-craft-sparkle-icon').innerHTML = iconSvg('Sparkles', { size: 16 });
  document.getElementById('studio-craft-check-icon').innerHTML = iconSvg('CheckCircle2', { size: 16 });
  document.getElementById('studio-upload-icon').innerHTML = iconSvg('Upload', { size: 32 });
  document.getElementById('studio-plus-icon').innerHTML = iconSvg('Plus', { size: 16 });
  document.getElementById('studio-help-icon').innerHTML = iconSvg('HelpCircle', { size: 16 });
  document.getElementById('studio-checkout-arrow-icon').innerHTML = iconSvg('ChevronRight', { size: 18 });
}

function renderBasketBadge() {
  const totalQty = getTotalQuantity(designs);
  const { cost } = calculateBundlePrice(totalQty);

  document.getElementById('studio-basket-qty').textContent = `${totalQty} Magnet${totalQty !== 1 ? 's' : ''}`;
  document.getElementById('studio-basket-cost').textContent = `R${Math.round(cost)}`;

  const note = document.getElementById('studio-basket-tier-note');
  if (totalQty === 0) {
    note.className = 'studio-basket-tier-note tier-low';
    note.innerHTML = 'Add magnets to see your bundle price.';
  } else if (totalQty < 6) {
    note.className = 'studio-basket-tier-note tier-low';
    note.innerHTML = `Add <strong>${6 - totalQty} more</strong> to reach the 6-pack price (R250).`;
  } else if (totalQty < 10) {
    note.className = 'studio-basket-tier-note tier-mid';
    note.innerHTML = `Add <strong>${10 - totalQty} more</strong> to reach R40 each.`;
  } else {
    note.className = 'studio-basket-tier-note tier-max';
    note.innerHTML = `${iconSvg('CheckCircle2', { size: 14 })} Best price unlocked: R40 each.`;
  }

  document.getElementById('studio-checkout-cost').textContent = `R${Math.round(cost)}`;
  document.getElementById('studio-checkout-qty').textContent = `${totalQty} Magnet${totalQty !== 1 ? 's' : ''} total`;
  document.getElementById('magnet-designer-checkout-btn').disabled = totalQty === 0;

  refreshBasketBadge();
}

function renderDesignList() {
  document.getElementById('studio-list-title').textContent = `Your magnets (${designs.length})`;

  const list = document.getElementById('studio-design-list');
  list.innerHTML = designs.map((design) => `
    <div class="studio-design-item${design.id === activeDesignId ? ' active' : ''}" data-design-id="${design.id}">
      <div class="studio-design-item-main">
        <div class="studio-design-item-thumb">
          <img src="${design.imageUrl}" alt="${design.name}" referrerpolicy="no-referrer" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'" />
        </div>
        <div style="min-width:0;">
          <p class="studio-design-item-name">${design.name}</p>
          <p class="studio-design-item-meta">Size: 7.5 cm square</p>
        </div>
      </div>
      <div class="studio-design-item-controls">
        <div class="studio-qty-stepper">
          <button type="button" data-action="dec" data-design-id="${design.id}" aria-label="Decrease quantity for ${design.name}">-</button>
          <span>${design.quantity}</span>
          <button type="button" data-action="inc" data-design-id="${design.id}" aria-label="Increase quantity for ${design.name}">+</button>
        </div>
        <div class="studio-item-actions">
          <button type="button" data-action="clone" data-design-id="${design.id}" title="Duplicate" aria-label="Duplicate ${design.name}">${iconSvg('Copy', { size: 16 })}</button>
          ${designs.length > 1 ? `<button type="button" class="danger" data-action="delete" data-design-id="${design.id}" title="Remove" aria-label="Remove ${design.name}">${iconSvg('Trash2', { size: 16 })}</button>` : ''}
        </div>
      </div>
    </div>`).join('');

  list.querySelectorAll('.studio-design-item').forEach((item) => {
    item.addEventListener('click', () => {
      activeDesignId = item.dataset.designId;
      const active = getActiveDesign();
      imgZoom = active?.cropZoom ?? 100;
      posX = active?.cropX ?? 50;
      posY = active?.cropY ?? 50;
      renderDesignList();
      renderMockup();
    });
  });

  list.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.designId;
      const action = btn.dataset.action;
      const target = designs.find((d) => d.id === id);
      if (!target) return;

      if (action === 'inc') {
        designs = updateDesign({ ...target, quantity: target.quantity + 1 });
      } else if (action === 'dec') {
        designs = updateDesign({ ...target, quantity: Math.max(1, target.quantity - 1) });
      } else if (action === 'clone') {
        designs = cloneDesign(id);
        activeDesignId = designs[designs.length - 1].id;
      } else if (action === 'delete') {
        designs = deleteDesign(id);
        if (activeDesignId === id && designs.length > 0) {
          activeDesignId = designs[0].id;
        }
      }

      const active = getActiveDesign();
      imgZoom = active?.cropZoom ?? 100;
      posX = active?.cropX ?? 50;
      posY = active?.cropY ?? 50;

      renderDesignList();
      renderMockup();
      renderBasketBadge();
    });
  });
}

function updateZoomLabel() {
  document.getElementById('studio-zoom-label').textContent = `Zoom: ${imgZoom}%`;
  document.getElementById('studio-zoom-out-btn').disabled = imgZoom <= 50;
  document.getElementById('studio-zoom-in-btn').disabled = imgZoom >= 300;
}

function applyImageTransform() {
  const img = document.getElementById('studio-mockup-img');
  const transX = (posX - 50) * 2;
  const transY = (posY - 50) * 2;
  img.style.transform = `scale(${imgZoom / 100}) translate(${transX}px, ${transY}px)`;
}

function persistActiveCrop() {
  const active = getActiveDesign();
  if (!active) return;
  designs = updateDesign({ ...active, cropZoom: imgZoom, cropX: posX, cropY: posY });
  renderBasketBadge();
}

function renderMockup() {
  const active = getActiveDesign();
  const mockup = document.getElementById('studio-3d-mockup');
  const emptyCanvas = document.getElementById('studio-empty-canvas');

  if (!active) {
    mockup.hidden = true;
    emptyCanvas.hidden = false;
    return;
  }

  mockup.hidden = false;
  emptyCanvas.hidden = true;

  const mockupImg = document.getElementById('studio-mockup-img');
  mockupImg.onerror = () => { mockupImg.onerror = null; mockupImg.src = FALLBACK_IMAGE; };
  mockupImg.src = active.imageUrl;
  updateZoomLabel();
  applyImageTransform();
}

function wireMockupInteractions() {
  const mockup = document.getElementById('studio-3d-mockup');
  const face = document.getElementById('studio-mockup-face');
  const draggingIndicator = document.getElementById('studio-mockup-dragging-indicator');

  mockup.addEventListener('mouseenter', () => {
    isHovered = true;
  });

  mockup.addEventListener('mouseleave', () => {
    if (isDragging) return;
    isHovered = false;
  });

  face.addEventListener('pointerdown', (e) => {
    if (!getActiveDesign()) return;
    face.setPointerCapture(e.pointerId);
    isDragging = true;
    mockup.classList.add('is-dragging');
    mockup.style.transform = '';
    draggingIndicator.hidden = false;
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    startPos.x = posX;
    startPos.y = posY;
  });

  face.addEventListener('pointermove', (e) => {
    if (!isDragging || !getActiveDesign()) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const sensitivity = 0.45;
    const deltaX = (dx / 2.8) * sensitivity;
    const deltaY = (dy / 2.8) * sensitivity;

    posX = Math.max(0, Math.min(100, startPos.x + deltaX));
    posY = Math.max(0, Math.min(100, startPos.y + deltaY));
    applyImageTransform();
    persistActiveCrop();
  });

  face.addEventListener('pointerup', (e) => {
    face.releasePointerCapture(e.pointerId);
    isDragging = false;
    mockup.classList.remove('is-dragging');
    draggingIndicator.hidden = true;
  });

  // Keyboard reposition: arrow keys nudge the crop (Shift = larger step).
  face.addEventListener('keydown', (e) => {
    if (!getActiveDesign()) return;
    const step = e.shiftKey ? 8 : 3;
    let handled = true;
    if (e.key === 'ArrowLeft') posX = Math.max(0, posX - step);
    else if (e.key === 'ArrowRight') posX = Math.min(100, posX + step);
    else if (e.key === 'ArrowUp') posY = Math.max(0, posY - step);
    else if (e.key === 'ArrowDown') posY = Math.min(100, posY + step);
    else handled = false;
    if (handled) {
      e.preventDefault();
      applyImageTransform();
      persistActiveCrop();
    }
  });

  document.getElementById('studio-zoom-in-btn').addEventListener('click', () => {
    imgZoom = Math.min(300, imgZoom + 15);
    updateZoomLabel();
    applyImageTransform();
    persistActiveCrop();
  });

  document.getElementById('studio-zoom-out-btn').addEventListener('click', () => {
    imgZoom = Math.max(50, imgZoom - 15);
    updateZoomLabel();
    applyImageTransform();
    persistActiveCrop();
  });

  document.getElementById('studio-zoom-reset-btn').addEventListener('click', () => {
    imgZoom = 100;
    posX = 50;
    posY = 50;
    updateZoomLabel();
    applyImageTransform();
    persistActiveCrop();
  });
}

function wireUpload() {
  const fileInput = document.getElementById('studio-file-input');
  const uploadZone = document.getElementById('studio-upload-zone');

  uploadZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      fileToCompressedDataUrl(file).then((compressedUrl) => {
        const newDesign = {
          id: `design-${Date.now()}-${index}`,
          name: file.name.substring(0, file.name.lastIndexOf('.')) || 'Photo Magnet',
          imageUrl: compressedUrl,
          quantity: 1,
          sizeCm: 7.5,
          cropZoom: 100,
          cropX: 50,
          cropY: 50,
        };
        designs = addDesign(newDesign);
        if (index === 0) {
          activeDesignId = newDesign.id;
          imgZoom = 100;
          posX = 50;
          posY = 50;
        }
        renderDesignList();
        renderMockup();
        renderBasketBadge();
      }).catch((err) => {
        console.error('Failed to process uploaded image', err);
      });
    });

    fileInput.value = '';
  });
}

function wireAddDraft() {
  document.getElementById('btn-add-new-design').addEventListener('click', () => {
    const newDesign = {
      id: `design-${Date.now()}`,
      name: `Sample magnet #${designs.length + 1}`,
      imageUrl: '/images/placeholder-magnet-2.svg',
      quantity: 1,
      sizeCm: 7.5,
      cropZoom: 100,
      cropX: 50,
      cropY: 50,
    };
    designs = addDesign(newDesign);
    activeDesignId = newDesign.id;
    imgZoom = 100;
    posX = 50;
    posY = 50;

    renderDesignList();
    renderMockup();
    renderBasketBadge();
  });
}

function wireCheckout() {
  document.getElementById('magnet-designer-checkout-btn').addEventListener('click', () => {
    location.href = 'quote.html';
  });
}

renderStaticIcons();
renderDesignList();
renderMockup();
renderBasketBadge();
wireMockupInteractions();
wireUpload();
wireAddDraft();
wireCheckout();
