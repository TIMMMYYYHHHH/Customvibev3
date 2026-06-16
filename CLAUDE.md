# CustomVibe — Project Prompt

CustomVibe is a custom photo fridge magnet business based in Durban, South Africa. Customers upload photos, design their magnets in a browser studio, and submit a quote request. Orders are hand-printed, inspected, and shipped nationwide. This file is the single source of truth for any AI working on this codebase.

---

## What the site does

1. **Homepage** (`/`) — Marketing: hero, how it works, pricing calculator, testimonials, FAQ.
2. **Design Studio** (`/design`) — Upload photos → crop/zoom/pan → build a basket of magnets.
3. **Quote** (`/quote`) — 3-step wizard: review basket → enter delivery details → success/receipt.
4. **Legal** (`/privacy`, `/terms`, `/contact`) — Placeholder-labeled copy, not legally reviewed.
5. **404** (`/404`) — Standard not-found page.

---

## Tech stack — no build step

**Plain HTML + CSS + vanilla JS (ES modules).** Zero React, zero Vite, zero Tailwind, zero bundler. Every file in `public/` is served as-is.

```
public/
  index.html          ← Homepage
  design.html         ← Design Studio
  quote.html          ← Quote wizard
  privacy.html        ← Privacy policy (placeholder)
  terms.html          ← Terms of service (placeholder)
  contact.html        ← Contact page (placeholder)
  404.html            ← Not found

  partials/
    header.html       ← Nav fragment (no <html>/<body>, just the <header>)
    footer.html       ← Value strip + footer + WhatsApp FAB
    quote-modal.html  ← Basket summary overlay

  css/
    tokens.css               ← All CSS custom properties (:root)
    base.css                 ← Resets, typography, buttons, cards, header, footer, modal
    pages/home.css           ← Homepage layout
    pages/design.css         ← Design Studio layout
    pages/quote.css          ← Quote wizard layout
    pages/legal.css          ← Legal pages + 404

  js/
    icons.js         ← Inline SVG icon set (replaces lucide-react)
    pricing.js       ← calculateBundlePrice() — pure function, no DOM
    image.js         ← fileToCompressedDataUrl() — canvas compress, no DOM
    state.js         ← localStorage read/write for customvibe_designs array
    partials.js      ← Fetch+inject header/footer/modal; active nav; basket badge
    quote-modal.js   ← Open/close basket summary modal, all pages
    home.js          ← Homepage interactivity (magnets, pricing, FAQ, testimonials)
    design.js        ← Design Studio interactivity (upload, crop, basket)
    quote.js         ← Quote wizard (3 steps, form submit, receipt)

worker/
  index.js    ← Thin Cloudflare Worker: adds security headers, passes everything to ASSETS

wrangler.jsonc   ← Cloudflare deployment config
```

---

## Deployment

**Cloudflare Workers Assets** — no build step whatsoever.

`wrangler.jsonc`:
```json
{
  "name": "customvibe",
  "compatibility_date": "2026-06-16",
  "main": "worker/index.js",
  "assets": {
    "directory": "./public",
    "binding": "ASSETS",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page"
  }
}
```

`worker/index.js` does one thing: adds security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `HSTS`) to every response from `env.ASSETS.fetch(request)`. No routing logic — Workers Assets handles everything.

Clean URLs (`/design`, `/quote`) work because `html_handling: auto-trailing-slash` maps them to their `.html` files. The sitemap commits to extension-less URLs — never introduce `.html`-suffixed public URLs.

**Pushing to `claude/magnet-website-audit-m6k42l` triggers the Cloudflare auto-deploy** (once the user reconnects GitHub in Cloudflare Dashboard → Settings → Builds & Deployments — they had an OAuth disconnection). Never push to `main` without explicit permission.

---

## Design system

### Palette — soft pink ONLY

The entire site uses the soft pink palette. No terracotta, no browns, no warm creams. Soft pink is the brand identity — it must be consistently applied everywhere.

```css
/* tokens.css — do not remove or rename these */
:root {
  --color-pink-bg:      #FFF5F8;   /* page background */
  --color-pink-soft:    #FFEEF1;   /* section backgrounds, card hover */
  --color-pink-light:   #FFD3DB;   /* borders, decorative */
  --color-pink:         #FFB3C1;   /* basket button, accents */
  --color-pink-mid:     #FF9EB5;   /* stat values */
  --color-pink-dark:    #FF758F;   /* hover states, CTA band start */
  --color-pink-deep:    #E8547A;   /* CTA band end, strong accent */
  --color-pink-text:    #C2486B;   /* eyebrow labels, links, active nav */
  --color-charcoal:     #2D3142;   /* primary text, btn-primary bg, footer bg */
  --color-charcoal-mid: #4A4E6A;   /* secondary text */
  --color-muted:        #71717A;   /* meta text, placeholders */
  --color-border:       rgba(255, 179, 193, 0.35);
  --color-border-mid:   rgba(255, 179, 193, 0.55);
}
```

Brand aliases exist in tokens.css for `design.css`/`quote.css` backward-compat:
`--color-brand-pink`, `--color-brand-pink-dark`, `--color-brand-pink-text`, `--color-brand-charcoal`, etc.

### Typography

- **Headings** (`h1`, `h2`, `h3`): `DM Serif Display` (Google Fonts, `:ital@0;1`) — `font-weight: 400`, italic for accent words
- **Body/UI**: `Plus Jakarta Sans` (Google Fonts, `wght@400;500;600;700`)
- **Prices/code**: `JetBrains Mono` (Google Fonts, `wght@400;500`)

All three loaded in every page `<head>` via Google Fonts `<link>` (preconnect included).

### Radius / shadow / spacing

```css
--radius-control: 10px;   /* buttons, inputs */
--radius-card:    18px;   /* cards */
--radius-panel:   26px;   /* modals, large panels */

--shadow-soft:     0 2px 14px rgba(255, 117, 143, 0.10);
--shadow-raised:   0 8px 28px rgba(255, 117, 143, 0.16);
--shadow-floating: 0 20px 52px rgba(45, 49, 66, 0.16);

--spacing-section-sm: 4rem;
--spacing-section-md: 6rem;
--spacing-section-lg: 8rem;
--text-label-xs: 0.625rem;
```

---

## Shared patterns

### Partial injection

Every page has three placeholder divs:
```html
<div data-partial="header" id="partial-header"></div>
...
<div data-partial="footer"></div>
<div data-partial="quote-modal"></div>
```

`partials.js` fetches `partials/header.html`, `partials/footer.html`, `partials/quote-modal.html` and injects them. After injection it:
- Calls `wireHeader()` — sets `innerHTML` on nav link elements from `NAV_TABS`, marks the active link by comparing `location.pathname`
- Calls `wireFooter()` — renders value strip items and copyright year
- Calls `wireQuoteModalChrome()` — injects icons into modal header
- Fires `document.dispatchEvent(new CustomEvent('partials:ready'))`

**Nav tab IDs in `header.html` must remain**: `nav-tab-hero`, `nav-tab-designer`, `nav-tab-pricing`. Their `innerHTML` is overwritten by `partials.js` — what's in the HTML is irrelevant, it's just anchor + `href` + `data-nav-path`.

**Basket badge IDs that must remain**: `nav-quote-basket` (button), `nav-quote-basket-icon` (icon span), `nav-quote-basket-badge` (count chip).

Every page loads:
```html
<script type="module" src="/js/partials.js"></script>
<script type="module" src="/js/quote-modal.js"></script>
<script type="module" src="/js/[page].js"></script>
```

### Icons

`js/icons.js` exports `iconSvg(name, { size, className })` returning an inline `<svg>` string. Icons used: `ArrowLeft`, `ArrowRight`, `Sparkles`, `Layers`, `Percent`, `ShoppingBag`, `Heart`, `Star`, `Compass`, `ImageIcon`, `Check`, `Tag`, `HelpingHand`, `ChevronDown`, `ChevronRight`, `Upload`, `Trash2`, `Copy`, `Plus`, `ZoomIn`, `ZoomOut`, `CheckCircle2`, `Move`, `HelpCircle`, `RefreshCw`, `ShieldCheck`, `X`, `Quote`, `Printer`, `Clipboard`, `User`, `Mail`, `Phone`, `CreditCard`, `MapPin`, `Camera`.

To add new icons, add the Lucide SVG path string to the `PATHS` object in `icons.js`.

### State / localStorage

`js/state.js` manages the `customvibe_designs` array in `localStorage` under the key `"customvibe_designs"`.

Each design object:
```js
{
  id:        string,   // unique, e.g. Date.now().toString()
  name:      string,   // user label or preset name
  imageUrl:  string,   // data:image/jpeg;base64,... (compressed by image.js)
  quantity:  number,   // how many copies of this magnet
  sizeCm:    number,   // always 7.5
  cropZoom:  number,   // 1.0 = fit, >1 = zoomed in
  cropX:     number,   // horizontal pan offset (fraction of overflow)
  cropY:     number,   // vertical pan offset (fraction of overflow)
}
```

This key is preserved from the original React app — existing visitor baskets survive the rewrite.

### Pricing tiers

`js/pricing.js` exports `calculateBundlePrice(totalQty)`:

| Qty | Price | Tier |
|-----|-------|------|
| 0 | R0 | N/A |
| 1 | R50 | Single Shot Trial |
| 2–5 | qty × R50 | Standard Tier |
| 6–9 | R250 + (qty−6) × R41.67 | Tribe Half-Dozen Discount |
| 10+ | qty × R40 | Ultimate Pack Bulk Rate |

Returns `{ cost, savings, avgPerUnit, tier }` — all rounded. **Do not change these tiers without explicit instruction** — they match the live pricing shown to customers.

---

## Hard constraints — never violate

1. **No fabricated reviews.** Testimonial cards always say `"Add a real customer quote here"` — dashed border, clearly placeholder. Never invent names, cities, or quotes.
2. **No real phone number.** WhatsApp FAB always uses `27000000000` as placeholder. Never substitute a real number.
3. **No working payment.** PayFast/Yoco buttons are permanently disabled with "Coming Soon" label. No real payment integration exists.
4. **Formspree placeholder.** `QUOTE_FORM_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID'` in `quote.js` is a deliberate placeholder. Leave as-is until the owner provides a real form ID.
5. **No push to `main`.** All work goes to `claude/magnet-website-audit-m6k42l`. Never push to main without explicit user permission.
6. **Legal copy is placeholder.** `privacy.html`, `terms.html`, `contact.html` carry `<!-- PLACEHOLDER -->` disclaimer labels. Do not remove them or present the copy as legally reviewed.

---

## Design direction

The owner's explicit direction: **soft pink is the brand colour and must stay. Everything else — layout, structure, hierarchy, copy — can and should be changed boldly.** Conservative visual tweaks (same layout with different colours) are not acceptable. When redesigning, change the actual structure: section order, layout type (full-screen vs. split vs. zigzag), component shapes, copy voice.

**Current homepage structure** (as of last redesign):
- Full-screen hero, centered text, floating polaroid magnets at corners
- Dark charcoal stats ticker strip
- Alternating zigzag "How It Works" (3 steps with visual cards)
- Pricing cards + live slider calculator on pink-bg
- Editorial testimonials on pink-soft bg
- Full-width pink gradient CTA band (`#FF758F → #E8547A`)
- Accordion FAQ on pink-bg

The owner was not fully satisfied with this layout either. Future redesigns should try structurally different approaches — magazine-style editorial, full-bleed imagery sections, large typographic hero, asymmetric grid, etc. — while keeping soft pink as the dominant colour.

---

## Homepage JS-referenced IDs (must survive any HTML rewrite)

These IDs are written by `home.js` — they must exist in `index.html` or the page silently breaks:

| ID | Purpose |
|----|---------|
| `simulated-fridge-magnet-stage` | Container where floating magnets are rendered |
| `hero-badge-icon` | Sparkles icon in hero badge |
| `hero-cta-arrow` | ArrowRight in CTA button |
| `hero-scroll-icon` | ChevronDown scroll cue |
| `stat-shield-icon` | ShieldCheck icon in stats strip |
| `how-eyebrow-icon` | Sparkles in "How it works" eyebrow |
| `how-upload-icon` | Upload icon in step 1 visual |
| `how-step-arrow-1` | ArrowRight in step 1 link |
| `how-deliver-icon` | Heart icon in step 3 visual |
| `testimonial-quote-icon` | Quote icon above testimonials |
| `cta-band-arrow` | ArrowRight in CTA band button |
| `pricing-percent-icon` | Percent icon in simulator eyebrow |
| `pricing-helping-icon` | HelpingHand in bulk order note |
| `packages-cards-grid` | Pricing cards are rendered into this |
| `pricing-interactive-simulator` | Simulator panel |
| `pricing-qty-slider` | Range input |
| `pricing-qty-display` | Qty readout text |
| `pricing-output-cost` | Total cost display |
| `pricing-output-avg` | Per-unit cost display |
| `pricing-output-tier` | Tier chip |
| `pricing-savings-block` | Savings pill / empty message |
| `pricing-bulk-note` | Bulk order advisory (hidden by default) |
| `pricing-design-now-btn` | CTA button in simulator |
| `testimonial-grid` | Testimonial cards rendered into this |
| `faq-list` | FAQ `<details>` items rendered into this |

Footer IDs (must exist in `footer.html`):
`value-strip-inner`, `footer-secure-icon`, `footer-copyright`, `whatsapp-floating-button`

Quote modal IDs (must exist in `quote-modal.html`):
`summary-modal-close-btn`, `summary-modal-header-icon`, `summary-modal-secure-icon`, `summary-modal-proceed-icon`

---

## Known gaps / placeholders to hand off to the owner

- **Form endpoint**: Replace `YOUR_FORM_ID` in `quote.js` with a real Formspree (or other) form ID.
- **WhatsApp number**: Replace `27000000000` with the real business number.
- **Production turnaround time**: FAQ answer for "How long does an order take?" contains `<span class="faq-placeholder">add real production + delivery turnaround time</span>`.
- **Shipping cost**: FAQ answer for "Do you deliver nationwide?" contains a similar placeholder.
- **Legal copy**: `privacy.html` and `terms.html` need real legal review.
- **Real reviews**: Once the business has real customer quotes, replace the placeholder testimonial cards.
- **Cloudflare auto-deploy reconnection**: Owner needs to reconnect GitHub OAuth in Cloudflare Dashboard → Settings → Builds & Deployments (had a disconnection).
- **Payment**: PayFast/Yoco integration is permanently disabled — marked "Coming Soon". No timeline set.
- **Content-Security-Policy**: Deliberately omitted from `worker/index.js` until someone can test it in a real browser (Google Fonts + inline JSON-LD need specific allowlist entries that fail silently if wrong).
