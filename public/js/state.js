// localStorage-backed basket state, shared by every page. Ported from the
// design state management that used to live in src/App.tsx.
//
// MagnetDesign shape (textOverlay/effect/borderStyle from the old TS type
// were never read anywhere and have been dropped):
//   { id, name, imageUrl, quantity, sizeCm, cropZoom, cropX, cropY }

const STORAGE_KEY = 'customvibe_designs';

const DEFAULT_DESIGN = {
  id: 'welcome-draft-1',
  name: 'Squad Vibe 2026',
  imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&auto=format&fit=crop&q=80',
  quantity: 1,
  sizeCm: 7.5,
};

export function getDesigns() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Storage parse error', e);
  }
  return null;
}

// Returns the current basket, seeding it with the default welcome design on
// a visitor's very first visit (mirrors the old App.tsx useEffect).
export function ensureSeeded() {
  const existing = getDesigns();
  if (existing) return existing;
  const seeded = [{ ...DEFAULT_DESIGN }];
  saveDesigns(seeded);
  return seeded;
}

export function saveDesigns(designs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
}

export function addDesign(design) {
  const designs = getDesigns() || [];
  const updated = [...designs, design];
  saveDesigns(updated);
  return updated;
}

export function updateDesign(updatedDesign) {
  const designs = getDesigns() || [];
  const updated = designs.map((d) => (d.id === updatedDesign.id ? updatedDesign : d));
  saveDesigns(updated);
  return updated;
}

export function deleteDesign(id) {
  const designs = getDesigns() || [];
  const updated = designs.filter((d) => d.id !== id);
  saveDesigns(updated);
  return updated;
}

export function cloneDesign(id) {
  const designs = getDesigns() || [];
  const target = designs.find((d) => d.id === id);
  if (!target) return designs;
  const cloned = {
    ...target,
    id: `design-clone-${Date.now()}`,
    name: `${target.name} (Copy)`,
    quantity: 1,
  };
  const updated = [...designs, cloned];
  saveDesigns(updated);
  return updated;
}

export function clearAllDesigns() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getTotalQuantity(designs) {
  return designs.reduce((sum, d) => sum + d.quantity, 0);
}
