# Order → WhatsApp Setup (n8n + WhatsApp Business Cloud API)

When a customer places an order, the site's Worker POSTs the order to your n8n
webhook. n8n then:

1. WhatsApps the **customer** a confirmation ("we'll follow up shortly")
2. WhatsApps **you** (067 406 7059) the full order details

Follow these four parts in order.

---

## Part 1 — Meta / WhatsApp Business Cloud API

1. Go to https://developers.facebook.com → **My Apps → Create App → Business**.
2. In the app dashboard, add the **WhatsApp** product.
3. Under **WhatsApp → API Setup**, note down:
   - **Phone Number ID** (not the phone number itself)
   - A **permanent access token**: create a System User in Meta Business
     Settings → generate a token with `whatsapp_business_messaging` +
     `whatsapp_business_management` permissions. (The default token on the API
     Setup page expires in 24h — fine for testing, not production.)
4. Meta gives you a free **test number** to start. To send from your own
   business number, add and verify it under **API Setup → From**.
5. Create the message template (required — businesses can't send free-form
   messages to people who haven't messaged them first):
   - Go to **WhatsApp Manager → Message templates → Create template**
   - Category: **Utility** · Name: `order_confirmation` · Language: **English**
   - Body:

     ```
     Hi {{1}}! 🧲 We've received your CustomVibe order {{2}} for {{3}} magnets (R{{4}}).
     We'll follow up shortly to confirm payment and delivery. Thank you!
     ```

   - Submit for review. Utility templates are usually approved within minutes
     to a few hours.

> Note: the message **to you** in the workflow is a plain text message. Send
> "hi" from your phone (067 406 7059) to your WhatsApp business number once —
> that opens a 24h session and also whitelists it while testing. If you prefer
> it to always work without sessions, duplicate the template approach for the
> owner message too.

## Part 2 — n8n

1. In n8n: **Workflows → Import from file** → `n8n-workflow/order-confirmation.json`.
2. Open each **WhatsApp** node → **Credential** → create a new *WhatsApp API*
   credential with the permanent access token from Part 1.
3. In both WhatsApp nodes, replace `REPLACE_WITH_PHONE_NUMBER_ID` with your
   Phone Number ID.
4. Open the **Valid Secret?** node and replace
   `REPLACE_WITH_YOUR_SHARED_SECRET` with a long random string. Generate one:

   ```bash
   openssl rand -hex 24
   ```

   Keep it — you'll give the same value to the Worker in Part 4.
5. **Activate** the workflow (toggle top-right). The production webhook URL is:

   ```
   http://localhost:5678/webhook/customvibe-order
   ```

## Part 3 — Expose n8n to the internet (Cloudflare Tunnel, free)

Your n8n is local; the live site can't reach `localhost`. A Cloudflare Tunnel
fixes that without opening ports.

Quick test (URL changes every run — fine for trying it out):

```bash
brew install cloudflared        # or: winget install Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:5678
```

Copy the printed `https://<random>.trycloudflare.com` URL.

Permanent (recommended — stable URL on your own domain):

```bash
cloudflared tunnel login
cloudflared tunnel create n8n
cloudflared tunnel route dns n8n n8n.customvibe.co.za
cloudflared tunnel run --url http://localhost:5678 n8n
```

Your webhook is then permanently at
`https://n8n.customvibe.co.za/webhook/customvibe-order`.
Run `cloudflared` as a service so it survives reboots:
`cloudflared service install`.

## Part 4 — Point the Worker at n8n

From the repo root:

```bash
npx wrangler secret put N8N_ORDER_WEBHOOK
# paste: https://n8n.customvibe.co.za/webhook/customvibe-order

npx wrangler secret put N8N_ORDER_SECRET
# paste: the same random string you put in the Valid Secret? node

npx wrangler deploy
```

For local development create `.dev.vars` (already gitignored) in the repo root:

```
N8N_ORDER_WEBHOOK=http://localhost:5678/webhook/customvibe-order
N8N_ORDER_SECRET=<your secret>
```

## Test it end-to-end

```bash
curl -X POST https://customvibe.co.za/api/order \
  -H 'Content-Type: application/json' \
  -d '{
    "orderRef": "CV-TEST1",
    "customerName": "Test Person",
    "customerEmail": "test@example.com",
    "customerPhone": "0821234567",
    "pudoLocation": "PUDO Test Point",
    "notes": "test order",
    "designs": [{ "name": "Beach photo", "quantity": 6 }],
    "totalQty": 6,
    "total": 250
  }'
```

Expected: `{"success":true}`, a WhatsApp on the test customer number, and the
order details on 067 406 7059. Check **n8n → Executions** if anything fails.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `{"success":false,"error":"Order notifications not configured"}` | `N8N_ORDER_WEBHOOK` secret not set on the Worker |
| `Notification service unreachable` | Tunnel down, n8n not running, or workflow not **activated** |
| n8n execution shows 401 branch | Secret mismatch between Worker and the Valid Secret? node |
| Customer message fails, owner message works | Template not approved yet, or template name/language doesn't match `order_confirmation` / `en` |
| Owner message fails | Send "hi" from your phone to the business number first (24h session), or convert it to a template |
