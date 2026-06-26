# CustomVibe

CustomVibe is a custom photo fridge magnet designer and quoting app for a Durban, South Africa based magnet business. Customers upload photos, design 7.5cm square magnets in an interactive studio, and submit a quote request for production.

## Tech Stack

Plain HTML, CSS, and vanilla JavaScript (ES modules) — no build step, no framework.

## Run Locally

```
npm install
npm run dev
```

This serves the `public/` folder directly (e.g. via `npx serve public`).

## Deploy

The site deploys to Cloudflare Workers as static assets (see `wrangler.jsonc` and `worker/index.js`).

```
npm run deploy
```
