# CustomVibe — details to go live

Fill in everything between the `« »` marks and send this back. Each item lists
exactly where it slots into the code, so nothing gets missed. Leave a line as
`« »` if you don't have it yet — it'll stay a clearly-marked placeholder.

---

## 1. EFT banking details  → shown on the checkout "Pay by EFT" screen
*(`js/quote.js` → `BUSINESS`)*

- Account name:   « CustomVibe Magnets … »
- Bank:           « e.g. FNB / Capitec / Nedbank … »
- Account number: « … »
- Account type:   « e.g. Cheque / Savings / Business »
- Branch code:    « … »
- Proof-of-payment email: « hello@customvibe.co.za »  ← change if different
- Order reference format: leave blank to keep the auto code (e.g. `CV-10472`),
  or specify your own: « »

## 2. Delivery & turnaround  → FAQ on the home page + checkout copy
*(`js/home.js` → `FAQ_ITEMS`)*

- Production + delivery turnaround (e.g. "3–5 working days"): « … »
- Shipping cost — pick one and fill in:
  - Flat rate nationwide: R« … »
  - Free over a certain spend: free over R« … », otherwise R« … »
  - Per-region / courier-quoted: « describe … »

## 3. Returns / remake policy  → trust copy + FAQ
*(one or two plain sentences)*

« e.g. "If a magnet arrives damaged or misprinted, send us a photo within 7
days and we'll remake it free." »

## 4. Contact  → footer, WhatsApp button, contact page
*(`27000000000` placeholder lives in `partials/footer.html`)*

- WhatsApp number (with country code, e.g. 2782…): « … »
- Public email:   « hello@customvibe.co.za »
- Phone (optional): « … »
- Town / area shown publicly: « Durban, KwaZulu-Natal »

## 5. Receiving orders  → so checkout actually emails you
*(`js/quote.js` → `ORDER_FORM_ENDPOINT`)*

- Create a free form at https://formspree.io (or similar) and paste the form ID
  or full endpoint here: « https://formspree.io/f/XXXXXXXX »
  *(Until this is set, the EFT screen still works for the customer; you just
  won't get the email notification.)*

## 6. Brand & imagery  *(optional, improves trust)*

- Logo: « I have one (attach) / please design a simple wordmark »
- Photos of real finished magnets (even phone snaps) — these replace the
  "Your photo here" placeholders in the hero, studio sample, and gallery
  *(`public/images/`)*. Attach any you have: « … »
- Real customer reviews (name + town + quote), once you have them, to replace
  the "Real reviews, on the way" card: « … »

---

*Nothing here is required to keep the site running — every blank is a labelled
placeholder today. Filling them in is what flips it from "demo" to "live".*
