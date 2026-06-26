# CustomVibe Website Redesign — AI Prompt

You are redesigning the marketing website for **CustomVibe**, a custom photo fridge magnet business based in Durban, South Africa. The site lets customers upload photos, design magnets in a browser-based studio, and submit a quote request. Orders are hand-printed, quality-inspected, and shipped nationwide.

---

## What I want

A **complete visual and structural redesign** of the homepage (and ideally the whole site). Not a colour swap. Not a font change. Not tweaking spacing or shadows on the same layout. I mean a fundamentally different page structure, different section ordering, different component shapes, different visual rhythm, different copy voice — the kind of change where someone looking at the before and after would never guess it was the same site.

**Soft pink is the brand colour and the only thing that stays.** Everything else is fair game: layout, structure, hierarchy, section types, wording, imagery approach, animation style — change it all.

---

## What's been tried and rejected

These approaches have already been done and I wasn't satisfied. Don't repeat them:

1. **Conservative polish pass** — Same layout with tightened spacing/radius/shadow. Looked identical. Rejected.
2. **"Warm & Cosy" terracotta redesign** — Changed the colour palette to terracotta/brown/cream but kept essentially the same layout structure. Rejected because it still looked similar — the layout didn't actually change, just the skin.
3. **Centered-hero + zigzag "How It Works" + pricing cards + CTA band + FAQ accordion** — This is the current version. Full-screen hero with centered text, floating polaroid magnets at the corners, dark charcoal stats ticker strip, alternating zigzag how-it-works steps, pricing cards with a live slider calculator, editorial testimonial cards, full-width pink gradient CTA band, accordion FAQ. It's fine but I'm still not a fan.

**The pattern to break:** every attempt so far follows the same SaaS landing page template — hero → features → pricing → testimonials → CTA → FAQ. Try something structurally different. Some ideas (use these or don't, surprise me):
- Magazine/editorial layout with large typography and full-bleed imagery
- Asymmetric grid with overlapping sections
- Horizontal scroll storytelling
- Split-screen layouts (e.g. half the viewport is a sticky visual, other half scrolls)
- Large product showcase as the centrepiece instead of text-heavy hero
- Interactive/playful elements that feel like the product (magnets, fridge door metaphor)
- Minimal/whitespace-heavy luxury positioning
- Bold typographic hero with no imagery at all — let the words sell

---

## The product

- **What:** Custom photo fridge magnets
- **Size:** 7.5 cm perfect square
- **Finish:** High-definition gloss print, waterproof coating
- **Backing:** 3 mm heavy flexible rubber (strong fridge grip)
- **Made:** Hand-printed, hand-inspected, hand-trimmed in Durban
- **Delivery:** Nationwide across South Africa
- **Price:** R50 for 1, drops to R40/magnet at 10+ (bundle pricing — see tiers below)

### Pricing tiers (do not change the numbers)

| Qty | Total Price | Per Magnet | Tier Name |
|-----|------------|------------|-----------|
| 1 | R50 | R50 | Single Shot Trial |
| 2–5 | qty × R50 | R50 | Standard Tier |
| 6–9 | R250 + (qty−6) × R41.67 | ~R41.67 | Tribe Half-Dozen Discount |
| 10+ | qty × R40 | R40 | Ultimate Pack Bulk Rate |

### Customer journey
1. Upload photos on the Design Studio page
2. Crop, zoom, position each photo inside a magnet frame
3. Add multiple photos to a bundle (each can be different)
4. Submit a quote request with delivery details
5. We confirm pricing + shipping, then print and ship

---

## Tech constraints

**Plain HTML + CSS + vanilla JS (ES modules). No React, no Tailwind, no bundler, no build step.** Every file in `public/` is served as-is by Cloudflare Workers Assets.

### File structure (must be preserved)
```
public/
  index.html              ← Homepage (this is the main redesign target)
  design.html             ← Design Studio
  quote.html              ← Quote wizard
  privacy.html / terms.html / contact.html  ← Legal (placeholder)
  404.html

  partials/
    header.html            ← Nav fragment injected by JS
    footer.html            ← Footer + WhatsApp FAB injected by JS
    quote-modal.html       ← Basket summary modal injected by JS

  css/
    tokens.css             ← CSS custom properties (the pink palette — see below)
    base.css               ← Resets, header, footer, buttons, modal, shared
    pages/home.css         ← Homepage-specific layout
    pages/design.css       ← Design Studio layout
    pages/quote.css        ← Quote wizard layout
    pages/legal.css        ← Legal + 404

  js/
    icons.js               ← Inline SVG icon library (lucide-style)
    pricing.js             ← calculateBundlePrice() pure function
    image.js               ← Canvas image compression
    state.js               ← localStorage basket management
    partials.js            ← Fetch + inject header/footer/modal partials
    quote-modal.js         ← Basket summary modal logic
    home.js                ← Homepage interactivity
    design.js              ← Design Studio interactivity
    quote.js               ← Quote wizard logic
```

### CSS palette (use these variables, don't invent new colour tokens)
```css
--color-pink-bg:      #FFF5F8;   /* page background */
--color-pink-soft:    #FFEEF1;   /* section backgrounds, card hover */
--color-pink-light:   #FFD3DB;   /* borders, decorative elements */
--color-pink:         #FFB3C1;   /* accent, basket button */
--color-pink-mid:     #FF9EB5;   /* stat values, mid-accent */
--color-pink-dark:    #FF758F;   /* hover states, gradients */
--color-pink-deep:    #E8547A;   /* strong CTA, gradient end */
--color-pink-text:    #C2486B;   /* labels, links, active nav */
--color-charcoal:     #2D3142;   /* primary text, dark backgrounds */
--color-charcoal-mid: #4A4E6A;   /* secondary text */
--color-muted:        #71717A;   /* meta text, placeholders */
--color-border:       rgba(255, 179, 193, 0.35);
--color-border-mid:   rgba(255, 179, 193, 0.55);
```

### Fonts
- **Headings:** `DM Serif Display` (serif, italic for accent words)
- **Body/UI:** `Plus Jakarta Sans` (sans-serif, weights 400–700)
- **Prices/mono:** `JetBrains Mono`

### DOM IDs that must exist in index.html (home.js writes to these)

If these IDs are missing, the page silently breaks. You can move them, restyle them, put them in completely different sections — but they must exist somewhere in `index.html`:

**Hero/general:** `simulated-fridge-magnet-stage`, `hero-badge-icon`, `hero-cta-arrow`, `hero-scroll-icon`

**Stats:** `stat-shield-icon`

**How it works:** `how-eyebrow-icon`, `how-upload-icon`, `how-step-arrow-1`, `how-deliver-icon`

**Pricing:** `packages-cards-grid`, `pricing-interactive-simulator`, `pricing-qty-slider`, `pricing-qty-display`, `pricing-output-cost`, `pricing-output-avg`, `pricing-output-tier`, `pricing-savings-block`, `pricing-bulk-note`, `pricing-design-now-btn`, `pricing-percent-icon`, `pricing-helping-icon`

**Testimonials:** `testimonial-quote-icon`, `testimonial-grid`

**FAQ:** `faq-list`

**CTA band:** `cta-band-arrow`

### Partial injection

Every page has three placeholder divs that get filled by `partials.js`:
```html
<div data-partial="header" id="partial-header"></div>
<!-- ... page content ... -->
<div data-partial="footer"></div>
<div data-partial="quote-modal"></div>
```

The header and footer are shared fragments, not full HTML documents.

---

## Hard constraints — never violate

1. **No fabricated reviews.** Testimonial cards must say "Add a real customer quote here" with a dashed border or other clear placeholder styling. Never invent customer names, cities, or quotes.
2. **No real phone number.** WhatsApp button uses `27000000000` as placeholder. Never substitute a real number.
3. **No working payment.** Any PayFast/Yoco buttons must be disabled with a "Coming Soon" label. No real payment integration.
4. **Formspree placeholder.** `QUOTE_FORM_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID'` in `quote.js` is a deliberate placeholder. Don't change it.
5. **Legal copy is placeholder.** Privacy/terms/contact pages have disclaimer labels. Don't remove them.
6. **Pricing numbers are sacred.** Don't change the tier thresholds or per-unit prices.

---

## What to deliver

1. **`index.html`** — Completely new page structure. Every section can be different from what exists now. New section types, new ordering, new visual treatment. All required DOM IDs must be present.
2. **`css/pages/home.css`** — New layout CSS to match. Use only the variables from `tokens.css`. No old/made-up colour variables.
3. **`js/home.js`** — Update if the HTML structure changed (e.g. new class names, reorganised sections). Keep the same data arrays (PREMIUM_PRESETS, PRICING_PACKS, FAQ_ITEMS) and the same render functions, just update them to match the new markup. All `setIcon()` calls must target IDs that exist in the HTML.
4. **`partials/header.html`** — Can be restyled/restructured. Must keep the nav tab IDs (`nav-tab-hero`, `nav-tab-designer`, `nav-tab-pricing`) and basket IDs (`nav-quote-basket`, `nav-quote-basket-icon`, `nav-quote-basket-badge`).
5. **`partials/footer.html`** — Can be restyled. Must keep IDs: `value-strip-inner`, `footer-secure-icon`, `footer-copyright`, `whatsapp-floating-button`.
6. **`css/base.css`** — Update header/footer styles if you changed the partial markup. Keep the shared component styles (buttons, cards, modal, etc.) unless you're improving them.
7. **`css/tokens.css`** — Should stay as-is (the palette is fixed). Only change if adding new spacing/radius tokens, never remove or rename existing ones.

### After writing all files:
- Run `node --check public/js/home.js` to verify syntax
- Grep all CSS files for any variables not defined in `tokens.css` (no `--color-terracotta`, `--color-brown-*`, `--color-cream`, etc.)
- Verify every required DOM ID appears exactly once in `index.html`

---

## Tone and copy direction

The current copy is fine but generic. The brand voice should feel:
- **Warm and personal** — small local business, not a corporation
- **Confident but not pushy** — the product speaks for itself
- **South African** — Durban-based, nationwide delivery, Rand pricing
- **Playful** — these are fridge magnets, not enterprise software

Don't over-explain. Don't use marketing jargon. Write like you're texting a friend about something you're genuinely excited about.
