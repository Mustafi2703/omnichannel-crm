# AiSensy WhatsApp Integration Guide

OmniCRM talks to WhatsApp through an **adapter** (`src/lib/aisensy.ts`) built on AiSensy's
[Project API](https://aisensy.stoplight.io/docs/project-api) and Project Webhooks.

## Architecture

```
WhatsApp user
    → AiSensy
    → POST /api/webhooks/aisensy   (topic message.sender.user, signed)
    → message stored, 200 returned at once
    → assistant reply runs after the response (next/server after())

Agent / AI reply
    → sendAisensyText() / sendAisensyTemplate()
    → POST https://apis.aisensy.com/project-apis/v1/project/{project_id}/messages
    → WhatsApp user
```

AiSensy marks a notification failed unless it gets a 2xx within 5 seconds and then delivers it
again, so the route stores the message first and replies afterwards. Redeliveries are dropped by
the WhatsApp message id (`wamid…`), which is unique per tenant.

## Demo mode (no keys)

If `AISENSY_PROJECT_ID` / `AISENSY_PROJECT_API_PWD` are empty:

- Inbound webhook still works (needs `AISENSY_WEBHOOK_SECRET` to sign test calls)
- Outbound "send" is logged and stored with a fake `externalMessageId`
- Campaign sends fail with "AiSensy template delivery is not configured"

## Go-live checklist

1. The AiSensy project must be on the **PRO plan**: Project API keys and Project Webhooks are
   locked on the free plan.
2. AiSensy → Developer Hub → **Project API Keys** → Generate Key. This creates a Custom App with a
   key, a **password** and a **shared secret**. Store them in the vault; they are not shown again.
   The project ID is the id in the dashboard URL (`app.aisensy.com/projects/<project_id>/…`).
3. AiSensy → Developer Hub → **Project Webhooks** → Add Webhook:
   - URL `https://eacrm.net/api/webhooks/aisensy`
   - topic `message.sender.user` (other topics are acknowledged and ignored)
4. Server `.env` (read by both app and worker), then `docker compose up -d app worker`:
   - `AISENSY_PROJECT_ID`
   - `AISENSY_PROJECT_API_PWD` (the Custom App password)
   - `AISENSY_WEBHOOK_SECRET` (the shared secret)
   - `DEFAULT_TENANT_SLUG` (the live tenant)
5. Turn off AiSensy's own chatbot flows, AI agent and auto-replies, or customers get two answers.
6. From a staff phone, message the business number → a WhatsApp conversation appears in
   **Inbox** and the assistant replies on WhatsApp.
7. Reply from Inbox → delivered on WhatsApp. After 24 hours without a customer message, Inbox
   requires an approved template; its name must match the Meta-approved template name in AiSensy.

## Local webhook test

```bash
BODY='{"id":"ntf-1","topic":"message.sender.user","data":{"message":{"id":"m1","messageId":"wamid.TEST1","phone_number":"905559999999","message_type":"TEXT","message_content":{"text":"Merhaba, demo istiyorum"},"user_name":"Test WA User"}}}'
SIG=$(node -e "console.log(require('crypto').createHmac('sha256', process.env.AISENSY_WEBHOOK_SECRET).update(process.argv[1]).digest('hex'))" "$BODY")
curl -X POST http://localhost:3000/api/webhooks/aisensy \
  -H "Content-Type: application/json" \
  -H "X-AiSensy-Signature: $SIG" \
  -d "$BODY"
```

Then open **Inbox**: a WhatsApp conversation appears and the assistant replies (demo send).

## Payload

Notifications look like `{ id, created_at, topic, delivery_attempt, project_id, data: { message } }`.
`parseAisensyNotification` reads `phone_number`, `user_name`, `messageId` and
`message_content` (`text`; `title` for button and list replies; `caption` or `[TYPE] url` for media).

## Security

- `X-AiSensy-Signature` = hex HMAC-SHA256 of the raw body with the shared secret; requests fail
  closed without `AISENSY_WEBHOOK_SECRET`
- Never commit the password or shared secret
- Marketing templates need `consentWhatsappMarketing` on the contact

## Not built yet

- Template variables (templates with `{{1}}` placeholders are refused by campaigns)
- Delivery and read receipts (topic `message.status.updated`)
- A lead for new WhatsApp contacts

Related: [DEVELOPER_SYSTEM_DESIGN.md](./DEVELOPER_SYSTEM_DESIGN.md) § WhatsApp adapter.
