# AiSensy WhatsApp Integration Guide

OmniCRM talks to WhatsApp through an **adapter** (`src/lib/aisensy.ts`) so you can go live with AiSensy without rewriting the inbox.

## Architecture

```
WhatsApp user
    → AiSensy BSP
    → POST /api/webhooks/aisensy   (inbound)
    → OmniCRM inbox + AI + CRM

Agent / AI reply
    → sendAisensyText()
    → AiSensy send API
    → WhatsApp user
```

## Demo mode (no keys)

If `AISENSY_API_KEY` / `AISENSY_API_URL` are empty:

- Inbound webhook still works (use curl below)
- Outbound “send” is logged and stored with a fake `externalMessageId`
- Usage events are still recorded for cost demos

## Go-live checklist (client + eng)

1. Client creates **AiSensy** company account  
2. WhatsApp Business number connected / verified  
3. Copy API key + webhook secret into vault  
4. Set Render/env:
   - `AISENSY_API_KEY`
   - `AISENSY_API_URL` (from AiSensy docs for your plan)
   - `AISENSY_TEMPLATE_API_URL` (the approved-template send endpoint for the
     client plan; this may differ from the free-form endpoint)
   - `AISENSY_WEBHOOK_SECRET`
   - `DEFAULT_TENANT_SLUG=demo-sirket` (or client slug)
5. In AiSensy dashboard, set webhook URL:
   ```
   https://<your-app>.onrender.com/api/webhooks/aisensy
   ```
6. Send a test WhatsApp message → appears in **Inbox** (channel `whatsapp`)
7. Reply from Inbox → outbound via AiSensy. For a conversation older than 24
   hours, select an approved template in Inbox and verify it uses the template
   endpoint rather than the free-form text endpoint.
8. Confirm `/api/health` shows `"aisensyConfigured": true`

## Local webhook test

```bash
curl -X POST http://localhost:3000/api/webhooks/aisensy \
  -H "Content-Type: application/json" \
  -H "x-aisensy-signature: $AISENSY_WEBHOOK_SECRET" \
  -d '{
    "tenantSlug": "demo-sirket",
    "from": "+905559999999",
    "name": "Test WA User",
    "text": "Merhaba, demo istiyorum",
    "id": "test-msg-001"
  }'
```

Then open **Inbox** — a WhatsApp conversation should appear; AI may auto-reply.

## Payload shapes supported

The parser accepts:

1. Simple demo shape: `{ from, text, name?, id? }`  
2. Array shape: `{ messages: [{ id, from, text: { body }, profileName }] }`  

Adjust `parseAisensyWebhook` if AiSensy’s live payload differs (keep normalization in one place).

## Security

- Verify signature via `AISENSY_WEBHOOK_SECRET`  
- Dedupe on `externalMessageId` (unique per tenant)  
- Never commit API keys  
- Marketing templates need `consentWhatsappMarketing` on contact  

## Production notes

- The Inbox enforces templates outside the 24h session window. Configure
  `AISENSY_TEMPLATE_API_URL` and verify the provider's exact payload with the
  client account before production; the adapter sends `type: "template"` with
  the provider template ID/name and language.
- Log Meta/AiSensy message costs into `usage_events` (already hooked for outbound)  
- Keep provider behind `WhatsAppProvider`-style functions for future Wati/360dialog swap  

Related: [DEVELOPER_SYSTEM_DESIGN.md](./DEVELOPER_SYSTEM_DESIGN.md) § WhatsApp adapter.
